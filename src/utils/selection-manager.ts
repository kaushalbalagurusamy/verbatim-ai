/**
 * Selection Manager - Handles multiple text selections in the editor
 * Supports Cmd/Ctrl+click for adding additional selections
 */

import type { ContentBlock } from '@/types/document.types';
import { findBlockElement, getTextOffset } from './selection-helpers';

export interface TextSelection {
  blockId: string;
  blockIndex: number;
  start: number;
  end: number;
  text: string;
}

export interface SelectionRange {
  anchorBlockId: string;
  anchorOffset: number;
  focusBlockId: string;
  focusOffset: number;
}

/**
 * Manages multiple text selections in the editor
 */
export class SelectionManager {
  private selections: TextSelection[] = [];
  private isMultiSelectMode = false;

  /**
   * Clear all selections
   */
  clear(): void {
    this.selections = [];
    this.isMultiSelectMode = false;
  }

  /**
   * Add a new selection to the collection
   */
  addSelection(selection: TextSelection): void {
    // Check if this selection overlaps with existing ones
    const merged = this.mergeOverlappingSelections([...this.selections, selection]);
    this.selections = merged;
    this.isMultiSelectMode = true;
  }

  /**
   * Remove a selection at the given index
   */
  removeSelection(index: number): void {
    this.selections.splice(index, 1);
    if (this.selections.length === 0) {
      this.isMultiSelectMode = false;
    }
  }

  /**
   * Get all current selections
   */
  getSelections(): TextSelection[] {
    return [...this.selections];
  }

  /**
   * Check if we're in multi-select mode
   */
  isMultiSelect(): boolean {
    return this.isMultiSelectMode;
  }

  /**
   * Set selections from a single DOM selection
   */
  setFromDOMSelection(blocks: ContentBlock[]): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this.clear();
      return;
    }

    const range = selection.getRangeAt(0);
    const textSelection = this.rangeToTextSelection(range, blocks);
    
    if (textSelection) {
      this.selections = [textSelection];
      this.isMultiSelectMode = false;
    }
  }

  /**
   * Add selection from a DOM range (for Cmd/Ctrl+click)
   */
  addFromDOMRange(range: Range, blocks: ContentBlock[]): void {
    const textSelection = this.rangeToTextSelection(range, blocks);
    if (textSelection) {
      this.addSelection(textSelection);
    }
  }

  /**
   * Convert DOM Range to TextSelection
   */
  private rangeToTextSelection(range: Range, blocks: ContentBlock[]): TextSelection | null {
    const startBlock = findBlockElement(range.startContainer);
    const endBlock = findBlockElement(range.endContainer);
    
    if (!startBlock || !endBlock) return null;

    const startBlockId = startBlock.dataset.blockId || '';
    const startBlockIndex = parseInt(startBlock.dataset.blockIndex || '0');
    
    // Handle single block selection
    if (startBlock === endBlock) {
      const text = range.toString();
      const start = getTextOffset(startBlock, range.startContainer, range.startOffset);
      const end = start + text.length;

      return {
        blockId: startBlockId,
        blockIndex: startBlockIndex,
        start,
        end,
        text
      };
    }

    // For multi-block selections, return the first block portion
    // (Real implementation would handle multi-block properly)
    const blockText = startBlock.textContent || '';
    const start = getTextOffset(startBlock, range.startContainer, range.startOffset);
    
    return {
      blockId: startBlockId,
      blockIndex: startBlockIndex,
      start,
      end: blockText.length,
      text: blockText.substring(start)
    };
  }

  /**
   * Merge overlapping selections in the same block
   */
  private mergeOverlappingSelections(selections: TextSelection[]): TextSelection[] {
    // Group by block
    const byBlock = new Map<string, TextSelection[]>();
    
    selections.forEach(sel => {
      const blockSelections = byBlock.get(sel.blockId) || [];
      blockSelections.push(sel);
      byBlock.set(sel.blockId, blockSelections);
    });

    // Merge overlapping selections in each block
    const merged: TextSelection[] = [];
    
    byBlock.forEach((blockSelections, blockId) => {
      // Sort by start position
      blockSelections.sort((a, b) => a.start - b.start);
      
      const mergedBlock: TextSelection[] = [];
      let current = blockSelections[0];
      
      for (let i = 1; i < blockSelections.length; i++) {
        const next = blockSelections[i];
        
        // Check if overlapping or adjacent
        if (current.end >= next.start) {
          // Merge
          current = {
            ...current,
            end: Math.max(current.end, next.end),
            text: current.text + next.text.substring(Math.max(0, current.end - next.start))
          };
        } else {
          mergedBlock.push(current);
          current = next;
        }
      }
      
      mergedBlock.push(current);
      merged.push(...mergedBlock);
    });

    return merged;
  }
}

// Singleton instance
export const selectionManager = new SelectionManager();