/**
 * Simplified Undo/Redo Manager Service - Direct snapshot approach
 * Manages document history using complete snapshots for reliability
 * Ensures exact content and formatting preservation
 */

import { DocumentModel } from '../models/document-model';
import { TextFormatting } from '../data-structures/interval-tree';

export interface UndoRedoConfig {
  maxActions: number;  // Maximum number of undo actions to keep
  maxMemoryMB: number; // Maximum memory usage in MB
  onChange?: (canUndo: boolean, canRedo: boolean) => void;
}

interface DocumentState {
  text: string;
  formatting: TextFormatting[];
}

export interface HistoryEntry {
  state: DocumentState;
  timestamp: number;
  sizeBytes: number;
}

export class UndoRedoManagerV2 {
  private document: DocumentModel;
  private config: UndoRedoConfig;
  
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private totalMemoryBytes: number = 0;
  
  // Debounce timer for creating snapshots
  private snapshotTimer: NodeJS.Timeout | null = null;
  private pendingSnapshot: boolean = false;
  
  constructor(
    document: DocumentModel, 
    config: Partial<UndoRedoConfig> = {}
  ) {
    this.document = document;
    this.config = {
      maxActions: config.maxActions || 100,
      maxMemoryMB: config.maxMemoryMB || 10,
      onChange: config.onChange
    };
    
    // Notify initial state
    this.notifyStateChange();
  }
  
  /**
   * Capture current document state
   */
  private captureState(): DocumentState {
    return {
      text: this.document.getText(),
      formatting: this.document.getFormattingInRange(0, this.document.getLength())
        .map(fmt => ({ ...fmt })) // Deep copy
    };
  }
  
  /**
   * Restore document to a specific state
   */
  private restoreState(state: DocumentState): void {
    // Due to DocumentModel quirks with blocks, we need to be careful
    // First, get the actual current text (not just length)
    const currentText = this.document.getText();
    
    // Only delete if there's actual content
    if (currentText.length > 0) {
      const currentLength = this.document.getLength();
      if (currentLength > 0) {
        this.document.deleteText(0, currentLength);
      }
    }
    
    // Force document to reinitialize if needed by inserting and deleting
    // This works around block offset issues
    if (this.document.getLength() === 0 && state.text.length > 0) {
      // Insert a character and delete it to reset block state
      this.document.insertText(0, ' ');
      this.document.deleteText(0, 1);
    }
    
    // Restore text
    if (state.text.length > 0) {
      this.document.insertText(0, state.text);
    }
    
    // Restore formatting
    for (const fmt of state.formatting) {
      this.document.applyFormatting(fmt);
    }
  }
  
  /**
   * Record current state as an undoable action
   */
  recordAction(): void {
    // Debounce snapshot creation to batch rapid changes
    this.pendingSnapshot = true;
    
    if (this.snapshotTimer) {
      clearTimeout(this.snapshotTimer);
    }
    
    this.snapshotTimer = setTimeout(() => {
      if (this.pendingSnapshot) {
        this.createSnapshot();
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
    this.createSnapshot();
    this.pendingSnapshot = false;
  }
  
  /**
   * Create a snapshot and add to undo stack
   */
  private createSnapshot(): void {
    const state = this.captureState();
    const sizeBytes = this.estimateStateSize(state);
    
    // Don't record if nothing changed
    if (this.undoStack.length > 0) {
      const lastEntry = this.undoStack[this.undoStack.length - 1];
      if (lastEntry.state.text === state.text && 
          this.formattingEquals(lastEntry.state.formatting, state.formatting)) {
        return;
      }
    }
    
    // Add to undo stack
    this.undoStack.push({
      state,
      timestamp: Date.now(),
      sizeBytes
    });
    
    this.totalMemoryBytes += sizeBytes;
    
    // Clear redo stack when new action is recorded
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
    
    // Capture current state for redo
    const currentState = this.captureState();
    const currentSize = this.estimateStateSize(currentState);
    
    // Pop from undo stack
    const entry = this.undoStack.pop()!;
    this.totalMemoryBytes -= entry.sizeBytes;
    
    // Push current state to redo stack
    this.redoStack.push({
      state: currentState,
      timestamp: Date.now(),
      sizeBytes: currentSize
    });
    
    // Restore to previous state
    if (this.undoStack.length > 0) {
      // Restore to the previous state in the undo stack
      const previousEntry = this.undoStack[this.undoStack.length - 1];
      this.restoreState(previousEntry.state);
    } else {
      // Restore to empty state
      this.restoreState({ text: '', formatting: [] });
    }
    
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
    
    // Pop from redo stack
    const entry = this.redoStack.pop()!;
    
    // Capture current state for undo
    const currentState = this.captureState();
    const currentSize = this.estimateStateSize(currentState);
    
    // Push current state to undo stack
    this.undoStack.push({
      state: currentState,
      timestamp: Date.now(),
      sizeBytes: currentSize
    });
    this.totalMemoryBytes += currentSize;
    
    // Restore the redo state
    this.restoreState(entry.state);
    
    // Enforce limits
    this.enforceHistoryLimits();
    this.notifyStateChange();
    return true;
  }
  
  /**
   * Check if formatting arrays are equal
   */
  private formattingEquals(a: TextFormatting[], b: TextFormatting[]): boolean {
    if (a.length !== b.length) return false;
    
    for (let i = 0; i < a.length; i++) {
      const fmtA = a[i];
      const fmtB = b[i];
      if (fmtA.type !== fmtB.type || 
          fmtA.start !== fmtB.start || 
          fmtA.end !== fmtB.end ||
          fmtA.id !== fmtB.id) {
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
   * Estimate memory size of a state
   */
  private estimateStateSize(state: DocumentState): number {
    // Text size (UTF-16)
    let size = state.text.length * 2;
    
    // Formatting size
    size += state.formatting.length * 50; // ~50 bytes per formatting
    
    // Object overhead
    size += 100;
    
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
    this.notifyStateChange();
  }
  
  /**
   * Handle keyboard shortcuts
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