/**
 * Undo/Redo Manager Service - Manages document history using DocumentDiffEmitter
 * Implements immutable snapshots with memory limits and keyboard shortcuts
 * Ensures exact content and formatting preservation across undo/redo operations
 */

import { DocumentModel } from '../models/document-model';
import { DocumentDiffEmitter, DocumentSnapshot, DiffOp, InsertTextOp, DeleteTextOp, ReplaceTextOp, RemoveFormattingOp } from './document-diff-emitter';
import { codeUnitLength } from '../utils/string-utils';

export interface UndoRedoConfig {
  maxActions: number;  // Maximum number of undo actions to keep
  maxMemoryMB: number; // Maximum memory usage in MB
  onChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export interface HistoryEntry {
  snapshot: DocumentSnapshot;
  operations: DiffOp[];  // Operations to apply to get to next state
  timestamp: number;
  sizeBytes: number;
}

export class UndoRedoManager {
  private document: DocumentModel;
  private diffEmitter: DocumentDiffEmitter;
  private config: UndoRedoConfig;
  
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private currentSnapshot: DocumentSnapshot | null = null;
  private totalMemoryBytes: number = 0;
  
  // Debounce timer for creating snapshots
  private snapshotTimer: NodeJS.Timeout | null = null;
  private pendingSnapshot: boolean = false;
  
  constructor(
    document: DocumentModel, 
    config: Partial<UndoRedoConfig> = {}
  ) {
    this.document = document;
    this.diffEmitter = new DocumentDiffEmitter();
    this.config = {
      maxActions: config.maxActions || 100,
      maxMemoryMB: config.maxMemoryMB || 10,
      onChange: config.onChange
    };
    
    // Create initial snapshot
    this.createSnapshot();
    
    // Notify initial state
    this.notifyStateChange();
  }
  
  /**
   * Record current state as an undoable action
   * Called after document mutations
   */
  recordAction(): void {
    // Debounce snapshot creation to batch rapid changes
    this.pendingSnapshot = true;
    
    if (this.snapshotTimer) {
      clearTimeout(this.snapshotTimer);
    }
    
    this.snapshotTimer = setTimeout(() => {
      if (this.pendingSnapshot) {
        this.createSnapshotForUndo();
        this.pendingSnapshot = false;
      }
    }, 100); // 100ms debounce
  }
  
  /**
   * Force immediate snapshot creation
   */
  recordActionImmediate(): void {
    if (this.snapshotTimer) {
      clearTimeout(this.snapshotTimer);
      this.snapshotTimer = null;
    }
    this.createSnapshotForUndo();
    this.pendingSnapshot = false;
  }
  
  /**
   * Create a snapshot and add to undo stack
   */
  private createSnapshotForUndo(): void {
    const newSnapshot = this.diffEmitter.createSnapshot(this.document);
    
    if (this.currentSnapshot) {
      // Compute diff from current to new state
      const diff = this.diffEmitter.diff(this.currentSnapshot, newSnapshot);
      
      // Skip if no changes
      if (diff.operations.length === 0) {
        return;
      }
      
      // Calculate entry size
      const entrySize = this.estimateSnapshotSize(this.currentSnapshot) + 
                       this.estimateDiffSize(diff.operations);
      
      // Add to undo stack
      this.undoStack.push({
        snapshot: this.currentSnapshot,
        operations: diff.operations,
        timestamp: Date.now(),
        sizeBytes: entrySize
      });
      
      this.totalMemoryBytes += entrySize;
      
      // Clear redo stack when new action is recorded
      this.clearRedoStack();
      
      // Enforce limits
      this.enforceHistoryLimits();
    }
    
    this.currentSnapshot = newSnapshot;
    this.notifyStateChange();
  }
  
  /**
   * Create initial snapshot without adding to undo stack
   */
  private createSnapshot(): void {
    this.currentSnapshot = this.diffEmitter.createSnapshot(this.document);
  }
  
  /**
   * Apply inverse operations for undo
   */
  private createInverseOperations(operations: DiffOp[]): DiffOp[] {
    const inverse: DiffOp[] = [];
    
    // Process in reverse order
    for (let i = operations.length - 1; i >= 0; i--) {
      const op = operations[i];
      
      switch (op.type) {
        case 'insert-text':
          // Inverse of insert is delete
          inverse.push({
            type: 'delete-text',
            offset: op.offset,
            length: codeUnitLength(op.text),
            deletedText: op.text,
            timestamp: Date.now()
          } as DeleteTextOp);
          break;
          
        case 'delete-text':
          // Inverse of delete is insert
          inverse.push({
            type: 'insert-text',
            offset: op.offset,
            text: op.deletedText,
            timestamp: Date.now()
          } as InsertTextOp);
          break;
          
        case 'replace-text':
          // Inverse of replace is replace with old text
          inverse.push({
            type: 'replace-text',
            offset: op.offset,
            length: codeUnitLength(op.newText),
            oldText: op.newText,
            newText: op.oldText,
            timestamp: Date.now()
          } as ReplaceTextOp);
          break;
          
        case 'add-formatting':
          // Inverse of add is remove
          inverse.push({
            type: 'remove-formatting',
            formattingId: op.formatting.id,
            offset: op.offset,
            timestamp: Date.now()
          } as RemoveFormattingOp);
          break;
          
        case 'remove-formatting':
          // Would need the formatting details to restore
          // For now, skip formatting removal inverse
          break;
      }
    }
    
    return inverse;
  }
  
  /**
   * Undo the last action
   */
  undo(): boolean {
    if (this.undoStack.length === 0) {
      return false;
    }
    
    // Get the last undo entry
    const entry = this.undoStack.pop()!;
    this.totalMemoryBytes -= entry.sizeBytes;
    
    // Save current state to redo stack
    if (this.currentSnapshot) {
      const redoSize = this.estimateSnapshotSize(this.currentSnapshot);
      this.redoStack.push({
        snapshot: this.currentSnapshot,
        operations: entry.operations, // Operations to redo
        timestamp: Date.now(),
        sizeBytes: redoSize
      });
    }
    
    // Restore document to previous state
    this.restoreSnapshot(entry.snapshot);
    this.currentSnapshot = entry.snapshot;
    
    this.notifyStateChange();
    return true;
  }
  
  /**
   * Redo the last undone action
   */
  redo(): boolean {
    if (this.redoStack.length === 0) {
      return false;
    }
    
    // Get the last redo entry
    const entry = this.redoStack.pop()!;
    
    // Save current state to undo stack before changing
    if (this.currentSnapshot) {
      // We need to compute the reverse operations
      const redoSnapshot = entry.snapshot;
      const reverseDiff = this.diffEmitter.diff(redoSnapshot, this.currentSnapshot);
      
      const undoSize = this.estimateSnapshotSize(this.currentSnapshot) +
                      this.estimateDiffSize(reverseDiff.operations);
      this.undoStack.push({
        snapshot: this.currentSnapshot,
        operations: reverseDiff.operations,
        timestamp: Date.now(),
        sizeBytes: undoSize
      });
      this.totalMemoryBytes += undoSize;
    }
    
    // Restore to the redo snapshot
    this.restoreSnapshot(entry.snapshot);
    this.currentSnapshot = entry.snapshot;
    
    this.notifyStateChange();
    return true;
  }
  
  /**
   * Restore document to a specific snapshot
   */
  private restoreSnapshot(snapshot: DocumentSnapshot): void {
    // Clear document completely by recreating it
    // This ensures we start from a clean state
    const blocks = this.document.getBlocks();
    
    // Delete all content
    const currentLength = this.document.getLength();
    if (currentLength > 0) {
      this.document.deleteText(0, currentLength);
    }
    
    // If snapshot is empty, we're done
    if (snapshot.blocks.length === 0 || 
        (snapshot.blocks.length === 1 && snapshot.blocks[0].text === '')) {
      return;
    }
    
    // Reconstruct document from snapshot
    let globalOffset = 0;
    
    for (let i = 0; i < snapshot.blocks.length; i++) {
      const block = snapshot.blocks[i];
      
      // Insert block text
      if (block.text) {
        this.document.insertText(globalOffset, block.text);
        globalOffset += block.text.length;
      }
      
      // Add newline between blocks (except after last block)
      if (i < snapshot.blocks.length - 1) {
        this.document.insertText(globalOffset, '\n');
        globalOffset += 1;
      }
    }
    
    // Restore formatting
    for (const fmt of snapshot.formatting) {
      this.document.applyFormatting(fmt);
    }
  }
  
  /**
   * Clear redo stack when new actions are recorded
   */
  private clearRedoStack(): void {
    for (const entry of this.redoStack) {
      this.totalMemoryBytes -= entry.sizeBytes;
    }
    this.redoStack = [];
  }
  
  /**
   * Enforce history limits (max actions and memory)
   */
  private enforceHistoryLimits(): void {
    const maxMemoryBytes = this.config.maxMemoryMB * 1024 * 1024;
    
    // Remove oldest entries if over action limit
    while (this.undoStack.length > this.config.maxActions) {
      const removed = this.undoStack.shift()!;
      this.totalMemoryBytes -= removed.sizeBytes;
    }
    
    // Remove oldest entries if over memory limit
    while (this.totalMemoryBytes > maxMemoryBytes && this.undoStack.length > 0) {
      const removed = this.undoStack.shift()!;
      this.totalMemoryBytes -= removed.sizeBytes;
    }
  }
  
  /**
   * Estimate memory size of a snapshot
   */
  private estimateSnapshotSize(snapshot: DocumentSnapshot): number {
    let size = 0;
    
    // Estimate block sizes
    for (const block of snapshot.blocks) {
      size += block.text.length * 2; // UTF-16 characters
      size += 100; // Overhead for block metadata
    }
    
    // Estimate formatting sizes
    size += snapshot.formatting.length * 50; // ~50 bytes per formatting
    
    return size;
  }
  
  /**
   * Estimate memory size of diff operations
   */
  private estimateDiffSize(operations: DiffOp[]): number {
    let size = 0;
    
    for (const op of operations) {
      size += 50; // Base operation overhead
      
      if ('text' in op) {
        size += (op.text?.length || 0) * 2;
      }
      if ('deletedText' in op) {
        size += (op.deletedText?.length || 0) * 2;
      }
      if ('oldText' in op) {
        size += (op.oldText?.length || 0) * 2;
      }
      if ('newText' in op) {
        size += (op.newText?.length || 0) * 2;
      }
    }
    
    return size;
  }
  
  /**
   * Notify listeners of state change
   */
  private notifyStateChange(): void {
    this.config.onChange?.(this.canUndo(), this.canRedo());
  }
  
  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  
  /**
   * Get undo stack size
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }
  
  /**
   * Get redo stack size
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }
  
  /**
   * Get total memory usage in bytes
   */
  getMemoryUsage(): number {
    return this.totalMemoryBytes;
  }
  
  /**
   * Clear all history
   */
  clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.totalMemoryBytes = 0;
    this.createSnapshot();
    this.notifyStateChange();
  }
  
  /**
   * Handle keyboard shortcuts (to be integrated with InputHandlerService)
   */
  handleKeyboardShortcut(event: KeyboardEvent): boolean {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? event.metaKey : event.ctrlKey;
    
    if (modKey && event.key === 'z' && !event.shiftKey) {
      // Undo: Ctrl/Cmd + Z
      event.preventDefault();
      return this.undo();
    } else if (modKey && event.key === 'z' && event.shiftKey) {
      // Redo: Ctrl/Cmd + Shift + Z
      event.preventDefault();
      return this.redo();
    } else if (modKey && event.key === 'y' && !isMac) {
      // Redo: Ctrl + Y (Windows/Linux)
      event.preventDefault();
      return this.redo();
    }
    
    return false;
  }
}