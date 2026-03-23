/**
 * Final Undo/Redo Manager Service - Hybrid approach
 * Uses snapshots for reliability with diff tracking for efficiency
 * Ensures exact content and formatting preservation
 */

import { DocumentModel } from '../models/document-model';
import { DocumentDiffEmitter, DocumentSnapshot } from './document-diff-emitter';

export interface UndoRedoConfig {
  maxActions: number;
  maxMemoryMB: number;
  onChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export interface HistoryEntry {
  beforeSnapshot: DocumentSnapshot;
  afterSnapshot: DocumentSnapshot;
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
  
  // Debounce timer
  private snapshotTimer: NodeJS.Timeout | null = null;
  private pendingSnapshot: boolean = false;
  private beforeChangeSnapshot: DocumentSnapshot | null = null;
  
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
    this.currentSnapshot = this.diffEmitter.createSnapshot(this.document);
    
    // Notify initial state
    this.notifyStateChange();
  }
  
  /**
   * Mark the beginning of a change (call before document modification)
   */
  beginChange(): void {
    if (!this.beforeChangeSnapshot) {
      this.beforeChangeSnapshot = this.diffEmitter.createSnapshot(this.document);
    }
  }
  
  /**
   * Record the change (call after document modification)
   */
  recordAction(): void {
    this.pendingSnapshot = true;
    
    if (this.snapshotTimer) {
      clearTimeout(this.snapshotTimer);
    }
    
    this.snapshotTimer = setTimeout(() => {
      if (this.pendingSnapshot) {
        this.commitChange();
        this.pendingSnapshot = false;
      }
    }, 100);
  }
  
  /**
   * Force immediate recording
   */
  recordActionImmediate(): void {
    if (this.snapshotTimer) {
      clearTimeout(this.snapshotTimer);
      this.snapshotTimer = null;
    }
    
    // If no explicit beginChange was called, use current snapshot as before
    if (!this.beforeChangeSnapshot && this.currentSnapshot) {
      this.beforeChangeSnapshot = this.currentSnapshot;
    }
    
    this.commitChange();
    this.pendingSnapshot = false;
  }
  
  /**
   * Commit the current change to history
   */
  private commitChange(): void {
    const afterSnapshot = this.diffEmitter.createSnapshot(this.document);
    
    // Don't record if nothing changed
    if (this.beforeChangeSnapshot && 
        this.snapshotsEqual(this.beforeChangeSnapshot, afterSnapshot)) {
      this.beforeChangeSnapshot = null;
      return;
    }
    
    // Use the before snapshot or current snapshot
    const beforeSnap = this.beforeChangeSnapshot || this.currentSnapshot;
    if (!beforeSnap) return;
    
    // Calculate size
    const sizeBytes = this.estimateSnapshotSize(beforeSnap) + 
                     this.estimateSnapshotSize(afterSnapshot);
    
    // Add to undo stack
    this.undoStack.push({
      beforeSnapshot: beforeSnap,
      afterSnapshot: afterSnapshot,
      timestamp: Date.now(),
      sizeBytes
    });
    
    this.totalMemoryBytes += sizeBytes;
    this.currentSnapshot = afterSnapshot;
    this.beforeChangeSnapshot = null;
    
    // Clear redo stack
    this.clearRedoStack();
    
    // Enforce limits
    this.enforceHistoryLimits();
    this.notifyStateChange();
  }
  
  /**
   * Undo the last action
   */
  undo(): boolean {
    if (this.undoStack.length === 0) {
      return false;
    }
    
    // Get the last entry
    const entry = this.undoStack.pop()!;
    this.totalMemoryBytes -= entry.sizeBytes;
    
    // Restore to before state
    this.restoreFromSnapshot(entry.beforeSnapshot);
    
    // Add to redo stack
    this.redoStack.push(entry);
    
    // Update current snapshot
    this.currentSnapshot = entry.beforeSnapshot;
    
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
    
    // Restore to after state
    this.restoreFromSnapshot(entry.afterSnapshot);
    
    // Add back to undo stack
    this.undoStack.push(entry);
    this.totalMemoryBytes += entry.sizeBytes;
    
    // Update current snapshot
    this.currentSnapshot = entry.afterSnapshot;
    
    this.enforceHistoryLimits();
    this.notifyStateChange();
    return true;
  }
  
  /**
   * Restore document from a snapshot
   */
  private restoreFromSnapshot(snapshot: DocumentSnapshot): void {
    // Create a new document model to avoid block offset issues
    const newDoc = new DocumentModel();
    
    // Get the full text from snapshot
    const fullText = snapshot.blocks.map(b => b.text).join('\n');
    
    // Insert all text at once
    if (fullText.length > 0) {
      newDoc.insertText(0, fullText);
    }
    
    // Apply all formatting
    for (const fmt of snapshot.formatting) {
      newDoc.applyFormatting(fmt);
    }
    
    // Now copy the state to our document
    // First clear current document
    const currentLength = this.document.getLength();
    if (currentLength > 0) {
      this.document.deleteText(0, currentLength);
    }
    
    // Then insert the new content
    const newText = newDoc.getText();
    if (newText.length > 0) {
      this.document.insertText(0, newText);
    }
    
    // Reapply formatting
    for (const fmt of snapshot.formatting) {
      this.document.applyFormatting(fmt);
    }
  }
  
  /**
   * Check if two snapshots are equal
   */
  private snapshotsEqual(a: DocumentSnapshot, b: DocumentSnapshot): boolean {
    // Compare total text
    const textA = a.blocks.map(block => block.text).join('\n');
    const textB = b.blocks.map(block => block.text).join('\n');
    
    if (textA !== textB) return false;
    
    // Compare formatting
    if (a.formatting.length !== b.formatting.length) return false;
    
    for (let i = 0; i < a.formatting.length; i++) {
      const fmtA = a.formatting[i];
      const fmtB = b.formatting[i];
      if (fmtA.type !== fmtB.type || 
          fmtA.start !== fmtB.start || 
          fmtA.end !== fmtB.end) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Clear redo stack
   */
  private clearRedoStack(): void {
    this.redoStack = [];
  }
  
  /**
   * Enforce history limits
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
    
    // Text size
    for (const block of snapshot.blocks) {
      size += block.text.length * 2;
      size += 100; // Block overhead
    }
    
    // Formatting size
    size += snapshot.formatting.length * 50;
    
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
   * Get total memory usage
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
    this.currentSnapshot = this.diffEmitter.createSnapshot(this.document);
    this.notifyStateChange();
  }
  
  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcut(event: KeyboardEvent): boolean {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? event.metaKey : event.ctrlKey;
    
    if (modKey && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      return this.undo();
    } else if (modKey && event.key === 'z' && event.shiftKey) {
      event.preventDefault();
      return this.redo();
    } else if (modKey && event.key === 'y' && !isMac) {
      event.preventDefault();
      return this.redo();
    }
    
    return false;
  }
}