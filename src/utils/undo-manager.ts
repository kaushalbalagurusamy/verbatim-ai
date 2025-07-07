/**
 * Undo Manager - Efficient history management for editor with debouncing
 * Uses circular buffer and stores only necessary state for low latency
 */

import type { ContentBlock } from '@/types/document.types';
import type { CursorPosition } from './cursor-manager';

export interface HistoryEntry {
  content: ContentBlock[];
  timestamp: number;
  cursorPosition?: CursorPosition;
}

export class UndoManager {
  private history: HistoryEntry[] = [];
  private currentIndex: number = -1;
  private maxHistory: number = 50;
  private lastSaveTime: number = 0;
  private debounceMs: number = 300;
  private pendingSave: NodeJS.Timeout | null = null;
  
  constructor(maxHistory: number = 50, debounceMs: number = 300) {
    this.maxHistory = maxHistory;
    this.debounceMs = debounceMs;
  }
  
  /**
   * Save state with debouncing to avoid storing every keystroke
   */
  saveState(content: ContentBlock[], cursorPosition?: CursorPosition): void {
    const now = Date.now();
    
    // Clear any pending save
    if (this.pendingSave) {
      clearTimeout(this.pendingSave);
      this.pendingSave = null;
    }
    
    // If we've undone some states, remove the future states
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }
    
    const saveEntry = () => {
      // Deep clone content to avoid reference issues
      const entry: HistoryEntry = {
        content: JSON.parse(JSON.stringify(content)),
        timestamp: Date.now(),
        cursorPosition: cursorPosition ? { ...cursorPosition } : undefined
      };
      
      // Add to history
      this.history.push(entry);
      
      // Maintain circular buffer size
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      } else {
        this.currentIndex++;
      }
      
      this.lastSaveTime = Date.now();
    };
    
    // If enough time has passed since last save, save immediately
    if (now - this.lastSaveTime > this.debounceMs * 2) {
      saveEntry();
    } else {
      // Otherwise, debounce
      this.pendingSave = setTimeout(saveEntry, this.debounceMs);
    }
  }
  
  /**
   * Force save current state (useful before operations like paste)
   */
  forceSave(content: ContentBlock[], cursorPosition?: CursorPosition): void {
    if (this.pendingSave) {
      clearTimeout(this.pendingSave);
      this.pendingSave = null;
    }
    
    // If we've undone some states, remove the future states
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }
    
    const entry: HistoryEntry = {
      content: JSON.parse(JSON.stringify(content)),
      timestamp: Date.now(),
      cursorPosition: cursorPosition ? { ...cursorPosition } : undefined
    };
    
    this.history.push(entry);
    
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
    
    this.lastSaveTime = Date.now();
  }
  
  /**
   * Undo to previous state
   */
  undo(): HistoryEntry | null {
    if (!this.canUndo()) return null;
    
    this.currentIndex--;
    return { ...this.history[this.currentIndex] };
  }
  
  /**
   * Redo to next state
   */
  redo(): HistoryEntry | null {
    if (!this.canRedo()) return null;
    
    this.currentIndex++;
    return { ...this.history[this.currentIndex] };
  }
  
  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }
  
  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }
  
  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    this.lastSaveTime = 0;
    if (this.pendingSave) {
      clearTimeout(this.pendingSave);
      this.pendingSave = null;
    }
  }
  
  /**
   * Get current history size
   */
  getHistorySize(): number {
    return this.history.length;
  }
  
  /**
   * Get current position in history
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }
}