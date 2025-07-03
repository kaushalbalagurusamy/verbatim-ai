/**
 * Selection Manager - Handles multiple text selections for advanced formatting
 * Supports Cmd/Ctrl + click for adding selections and manages selection state
 */

export interface TextSelection {
  blockId: string;
  start: number;
  end: number;
  text?: string;
}

export class SelectionManager {
  private selections: TextSelection[] = [];
  private lastClickTime: number = 0;
  private lastClickBlock: string = '';
  
  /**
   * Add a new selection or toggle existing selection
   * @param selection - The selection to add or remove
   * @param isMultiSelect - Whether this is a multi-select operation (Cmd/Ctrl held)
   */
  addSelection(selection: TextSelection, isMultiSelect: boolean = false): void {
    if (!isMultiSelect) {
      // Single selection mode - replace all selections
      this.selections = [selection];
      return;
    }
    
    // Check if this selection already exists (for toggle behavior)
    const existingIndex = this.findOverlappingSelection(selection);
    if (existingIndex !== -1) {
      // Remove the selection if clicking on existing selection
      this.selections.splice(existingIndex, 1);
    } else {
      // Add new selection and merge if overlapping
      this.selections.push(selection);
      this.mergeOverlappingSelections();
    }
  }
  
  /**
   * Clear all selections
   */
  clearSelections(): void {
    this.selections = [];
  }
  
  /**
   * Get all current selections
   */
  getSelections(): TextSelection[] {
    return [...this.selections];
  }
  
  /**
   * Check if there are any selections
   */
  hasSelections(): boolean {
    return this.selections.length > 0;
  }
  
  /**
   * Get selections for a specific block
   */
  getSelectionsForBlock(blockId: string): TextSelection[] {
    return this.selections.filter(sel => sel.blockId === blockId);
  }
  
  /**
   * Update selections after content change
   * @param blockId - Block that changed
   * @param offset - Position of change
   * @param delta - Amount of text added (positive) or removed (negative)
   */
  updateSelectionsAfterEdit(blockId: string, offset: number, delta: number): void {
    this.selections = this.selections.map(sel => {
      if (sel.blockId !== blockId) return sel;
      
      // Selection is after the edit - shift it
      if (sel.start >= offset) {
        return {
          ...sel,
          start: sel.start + delta,
          end: sel.end + delta
        };
      }
      
      // Selection contains the edit point
      if (sel.end > offset) {
        return {
          ...sel,
          end: sel.end + delta
        };
      }
      
      return sel;
    }).filter(sel => sel.start < sel.end); // Remove empty selections
  }
  
  /**
   * Convert DOM selection to TextSelection
   */
  static fromDOMSelection(selection: Selection): TextSelection | null {
    if (!selection.rangeCount) return null;
    
    const range = selection.getRangeAt(0);
    const blockElement = this.findBlockElement(range.commonAncestorContainer);
    if (!blockElement) return null;
    
    const blockId = blockElement.dataset.blockId || '';
    const start = this.getTextOffset(blockElement, range.startContainer, range.startOffset);
    const end = this.getTextOffset(blockElement, range.endContainer, range.endOffset);
    
    return {
      blockId,
      start,
      end,
      text: range.toString()
    };
  }
  
  /**
   * Apply selections to DOM
   */
  applySelectionsToDOM(selections: TextSelection[]): void {
    const selection = window.getSelection();
    if (!selection) return;
    
    selection.removeAllRanges();
    
    // Apply only the first selection for now (browser limitation)
    // Multiple selections will be visually indicated differently
    if (selections.length > 0) {
      const sel = selections[0];
      const blockElement = document.querySelector(`[data-block-id="${sel.blockId}"]`);
      if (!blockElement) return;
      
      const range = this.createRangeFromSelection(blockElement as HTMLElement, sel);
      if (range) {
        selection.addRange(range);
      }
    }
  }
  
  /**
   * Find overlapping selection
   */
  private findOverlappingSelection(selection: TextSelection): number {
    return this.selections.findIndex(sel => 
      sel.blockId === selection.blockId &&
      sel.start <= selection.end &&
      sel.end >= selection.start
    );
  }
  
  /**
   * Merge overlapping selections in the same block
   */
  private mergeOverlappingSelections(): void {
    const merged: TextSelection[] = [];
    
    this.selections.sort((a, b) => {
      if (a.blockId !== b.blockId) return a.blockId.localeCompare(b.blockId);
      return a.start - b.start;
    });
    
    for (const sel of this.selections) {
      const lastMerged = merged[merged.length - 1];
      
      if (lastMerged && 
          lastMerged.blockId === sel.blockId && 
          lastMerged.end >= sel.start) {
        // Merge with previous selection
        lastMerged.end = Math.max(lastMerged.end, sel.end);
      } else {
        merged.push({ ...sel });
      }
    }
    
    this.selections = merged;
  }
  
  /**
   * Find block element containing node
   */
  private static findBlockElement(node: Node): HTMLElement | null {
    let current: Node | null = node;
    while (current) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        const element = current as HTMLElement;
        if (element.dataset?.blockId) return element;
      }
      current = current.parentNode;
    }
    return null;
  }
  
  /**
   * Get text offset within block
   */
  private static getTextOffset(block: HTMLElement, node: Node, offset: number): number {
    let textOffset = 0;
    let found = false;
    
    function traverse(n: Node): void {
      if (found) return;
      
      if (n === node) {
        textOffset += offset;
        found = true;
        return;
      }
      
      if (n.nodeType === Node.TEXT_NODE) {
        textOffset += n.textContent?.length || 0;
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        for (const child of Array.from(n.childNodes)) {
          traverse(child);
          if (found) break;
        }
      }
    }
    
    traverse(block);
    return textOffset;
  }
  
  /**
   * Create DOM range from TextSelection
   */
  private createRangeFromSelection(block: HTMLElement, sel: TextSelection): Range | null {
    const range = document.createRange();
    const startPoint = this.findNodeAtOffset(block, sel.start);
    const endPoint = this.findNodeAtOffset(block, sel.end);
    
    if (!startPoint || !endPoint) return null;
    
    try {
      range.setStart(startPoint.node, startPoint.offset);
      range.setEnd(endPoint.node, endPoint.offset);
      return range;
    } catch {
      return null;
    }
  }
  
  /**
   * Find node at text offset
   */
  private findNodeAtOffset(block: HTMLElement, targetOffset: number): { node: Node; offset: number } | null {
    let currentOffset = 0;
    let result: { node: Node; offset: number } | null = null;
    
    function traverse(node: Node): boolean {
      if (result) return true;
      
      if (node.nodeType === Node.TEXT_NODE) {
        const length = node.textContent?.length || 0;
        if (currentOffset + length >= targetOffset) {
          result = { node, offset: targetOffset - currentOffset };
          return true;
        }
        currentOffset += length;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        for (const child of Array.from(node.childNodes)) {
          if (traverse(child)) return true;
        }
      }
      return false;
    }
    
    traverse(block);
    return result;
  }
}

// Global instance for managing selections
export const selectionManager = new SelectionManager();