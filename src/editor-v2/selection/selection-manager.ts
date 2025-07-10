/**
 * Unified Selection Manager - Handles all selection operations
 * Supports single selection, multiple selections, and special selection modes
 * Integrates with native browser selection API
 */

import { DocumentModel } from '../models/document-model';
import { LineRegistry } from '../models/line-registry';
import { codeUnitLength, getGraphemeAt } from '../utils/string-utils';

export interface SelectionRange {
  id: string;
  start: number;
  end: number;
  isReversed: boolean; // True if selection was made right-to-left
  isAnchor: boolean;   // True if this is the primary selection
}

export interface SelectionState {
  ranges: SelectionRange[];
  mode: SelectionMode;
  lastModified: number;
}

export type SelectionMode = 
  | 'normal'           // Regular text selection
  | 'column'           // Column/block selection
  | 'line'             // Line selection mode
  | 'word'             // Word selection mode
  | 'paragraph';       // Paragraph selection mode

export class SelectionManager {
  private document: DocumentModel;
  private lineRegistry: LineRegistry;
  private state: SelectionState;
  private listeners: ((state: SelectionState) => void)[];
  private domSelection: Selection | null;

  constructor(document: DocumentModel, lineRegistry: LineRegistry) {
    this.document = document;
    this.lineRegistry = lineRegistry;
    this.state = {
      ranges: [],
      mode: 'normal',
      lastModified: Date.now()
    };
    this.listeners = [];
    this.domSelection = null;
  }

  /**
   * Initialize with DOM selection
   */
  init(selection: Selection): void {
    this.domSelection = selection;
  }

  /**
   * Get current selection state
   */
  getState(): SelectionState {
    return { ...this.state };
  }

  /**
   * Set selection from DOM coordinates
   */
  setFromDOM(startContainer: Node, startOffset: number, endContainer: Node, endOffset: number): void {
    const start = this.domToDocumentOffset(startContainer, startOffset);
    const end = this.domToDocumentOffset(endContainer, endOffset);
    
    this.setSelection(start, end);
  }

  /**
   * Set a single selection range
   */
  setSelection(start: number, end: number, mode: SelectionMode = 'normal'): void {
    const range: SelectionRange = {
      id: this.generateId(),
      start: Math.min(start, end),
      end: Math.max(start, end),
      isReversed: end < start,
      isAnchor: true
    };
    
    this.state = {
      ranges: [range],
      mode,
      lastModified: Date.now()
    };
    
    this.syncToDOM();
    this.notifyListeners();
  }

  /**
   * Add an additional selection range (multi-cursor)
   */
  addSelection(start: number, end: number): void {
    // Check if this overlaps with existing selections
    const newRange: SelectionRange = {
      id: this.generateId(),
      start: Math.min(start, end),
      end: Math.max(start, end),
      isReversed: end < start,
      isAnchor: false
    };
    
    // Merge or add
    const merged = this.mergeOverlappingRanges([...this.state.ranges, newRange]);
    
    this.state = {
      ...this.state,
      ranges: merged,
      lastModified: Date.now()
    };
    
    this.notifyListeners();
  }

  /**
   * Extend selection to a position
   */
  extendSelection(position: number): void {
    if (this.state.ranges.length === 0) {
      this.setSelection(position, position);
      return;
    }
    
    const anchor = this.state.ranges.find(r => r.isAnchor);
    if (!anchor) return;
    
    const newEnd = position;
    const newStart = anchor.isReversed ? anchor.end : anchor.start;
    
    anchor.end = Math.max(newStart, newEnd);
    anchor.start = Math.min(newStart, newEnd);
    anchor.isReversed = newEnd < newStart;
    
    this.state.lastModified = Date.now();
    
    this.syncToDOM();
    this.notifyListeners();
  }

  /**
   * Select word at position
   */
  selectWordAt(position: number): void {
    const text = this.document.getText();
    
    // Find word boundaries
    let start = position;
    let end = position;
    
    // Word boundary regex
    const wordBoundary = /\W/;
    
    // Find start of word
    while (start > 0 && !wordBoundary.test(text[start - 1])) {
      start--;
    }
    
    // Find end of word
    while (end < codeUnitLength(text) && !wordBoundary.test(text[end])) {
      end++;
    }
    
    this.setSelection(start, end, 'word');
  }

  /**
   * Select line at position
   */
  selectLineAt(position: number): void {
    const line = this.lineRegistry.getLineByOffset(position);
    if (!line) return;
    
    this.setSelection(line.startOffset, line.endOffset, 'line');
  }

  /**
   * Select paragraph at position
   */
  selectParagraphAt(position: number): void {
    const block = this.document.getBlocks().find(
      b => position >= b.offset && position < b.offset + b.length
    );
    
    if (!block) return;
    
    this.setSelection(block.offset, block.offset + block.length, 'paragraph');
  }

  /**
   * Extend selection by word/line/paragraph
   */
  extendByUnit(direction: 'left' | 'right' | 'up' | 'down', unit: 'word' | 'line' | 'paragraph'): void {
    if (this.state.ranges.length === 0) return;
    
    const anchor = this.state.ranges.find(r => r.isAnchor);
    if (!anchor) return;
    
    let newPosition: number;
    
    switch (unit) {
      case 'word':
        newPosition = this.getNextWordPosition(
          anchor.isReversed ? anchor.start : anchor.end,
          direction === 'left' || direction === 'up' ? 'backward' : 'forward'
        );
        break;
        
      case 'line':
        newPosition = this.getNextLinePosition(
          anchor.isReversed ? anchor.start : anchor.end,
          direction === 'up' ? 'up' : 'down'
        );
        break;
        
      case 'paragraph':
        newPosition = this.getNextParagraphPosition(
          anchor.isReversed ? anchor.start : anchor.end,
          direction === 'up' ? 'backward' : 'forward'
        );
        break;
    }
    
    this.extendSelection(newPosition);
  }

  /**
   * Select to document boundary
   */
  selectToDocumentBoundary(direction: 'start' | 'end'): void {
    const anchor = this.state.ranges.find(r => r.isAnchor);
    const anchorPos = anchor ? (anchor.isReversed ? anchor.start : anchor.end) : 0;
    
    if (direction === 'start') {
      this.setSelection(0, anchorPos);
    } else {
      this.setSelection(anchorPos, this.document.getLength());
    }
  }

  /**
   * Select all content
   */
  selectAll(): void {
    this.setSelection(0, this.document.getLength());
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.state = {
      ranges: [],
      mode: 'normal',
      lastModified: Date.now()
    };
    
    if (this.domSelection) {
      this.domSelection.removeAllRanges();
    }
    
    this.notifyListeners();
  }

  /**
   * Collapse selection to cursor
   */
  collapseToEnd(): void {
    if (this.state.ranges.length === 0) return;
    
    const anchor = this.state.ranges.find(r => r.isAnchor);
    if (!anchor) return;
    
    const position = anchor.isReversed ? anchor.start : anchor.end;
    this.setSelection(position, position);
  }

  /**
   * Get next word position
   */
  private getNextWordPosition(from: number, direction: 'forward' | 'backward'): number {
    const text = this.document.getText();
    const wordBoundary = /\W/;
    
    if (direction === 'forward') {
      let pos = from;
      
      // Skip current word
      while (pos < codeUnitLength(text) && !wordBoundary.test(text[pos])) {
        pos++;
      }
      
      // Skip whitespace
      while (pos < codeUnitLength(text) && wordBoundary.test(text[pos])) {
        pos++;
      }
      
      return Math.min(pos, codeUnitLength(text));
    } else {
      let pos = from;
      
      // Skip whitespace
      while (pos > 0 && wordBoundary.test(text[pos - 1])) {
        pos--;
      }
      
      // Skip to start of word
      while (pos > 0 && !wordBoundary.test(text[pos - 1])) {
        pos--;
      }
      
      return Math.max(0, pos);
    }
  }

  /**
   * Get next line position
   */
  private getNextLinePosition(from: number, direction: 'up' | 'down'): number {
    const currentLine = this.lineRegistry.getLineByOffset(from);
    if (!currentLine) return from;
    
    const targetLineNumber = direction === 'up' 
      ? Math.max(1, currentLine.lineNumber - 1)
      : Math.min(this.lineRegistry.getLineCount(), currentLine.lineNumber + 1);
    
    const targetLine = this.lineRegistry.getLine(targetLineNumber);
    if (!targetLine) return from;
    
    // Try to maintain horizontal position
    const currentLineOffset = from - currentLine.startOffset;
    const ratio = currentLineOffset / (currentLine.endOffset - currentLine.startOffset);
    
    return targetLine.startOffset + 
      Math.floor(ratio * (targetLine.endOffset - targetLine.startOffset));
  }

  /**
   * Get next paragraph position
   */
  private getNextParagraphPosition(from: number, direction: 'forward' | 'backward'): number {
    const blocks = this.document.getBlocks();
    const currentBlock = blocks.find(b => from >= b.offset && from < b.offset + b.length);
    
    if (!currentBlock) return from;
    
    const currentIndex = blocks.indexOf(currentBlock);
    
    if (direction === 'forward') {
      const nextBlock = blocks[currentIndex + 1];
      return nextBlock ? nextBlock.offset : this.document.getLength();
    } else {
      const prevBlock = blocks[currentIndex - 1];
      return prevBlock ? prevBlock.offset : 0;
    }
  }

  /**
   * Convert DOM position to document offset
   */
  private domToDocumentOffset(container: Node, offset: number): number {
    // This would need access to the editor DOM
    // For now, return a placeholder implementation
    return offset;
  }

  /**
   * Sync selection to DOM
   */
  private syncToDOM(): void {
    if (!this.domSelection || this.state.ranges.length === 0) return;
    
    // For now, only sync the primary selection
    const anchor = this.state.ranges.find(r => r.isAnchor);
    if (!anchor) return;
    
    // This would need to convert document offsets to DOM positions
    // Placeholder for now
  }

  /**
   * Merge overlapping ranges
   */
  private mergeOverlappingRanges(ranges: SelectionRange[]): SelectionRange[] {
    if (ranges.length <= 1) return ranges;
    
    // Sort by start position
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const merged: SelectionRange[] = [];
    
    let current = sorted[0];
    
    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      
      // Check if ranges overlap or are adjacent
      if (current.end >= next.start - 1) {
        // Merge ranges
        current = {
          ...current,
          end: Math.max(current.end, next.end),
          isAnchor: current.isAnchor || next.isAnchor
        };
      } else {
        // Add current and move to next
        merged.push(current);
        current = next;
      }
    }
    
    merged.push(current);
    return merged;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `sel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add selection listener
   */
  onChange(listener: (state: SelectionState) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyboardNavigation(
    key: string,
    shift: boolean,
    ctrl: boolean,
    alt: boolean,
    meta: boolean
  ): boolean {
    // Cmd/Ctrl + A: Select all
    if ((ctrl || meta) && key === 'a') {
      this.selectAll();
      return true;
    }
    
    // Cmd/Ctrl + Shift + Up/Down: Select to document boundary
    if ((ctrl || meta) && shift && (key === 'ArrowUp' || key === 'ArrowDown')) {
      this.selectToDocumentBoundary(key === 'ArrowUp' ? 'start' : 'end');
      return true;
    }
    
    // Alt + Shift + Arrow: Extend by word/paragraph
    if (alt && shift && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
      const direction = key === 'ArrowLeft' ? 'left' : 
                       key === 'ArrowRight' ? 'right' :
                       key === 'ArrowUp' ? 'up' : 'down';
      
      const unit = (key === 'ArrowLeft' || key === 'ArrowRight') ? 'word' : 'paragraph';
      
      this.extendByUnit(direction, unit);
      return true;
    }
    
    return false;
  }
}