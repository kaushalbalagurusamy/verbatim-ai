/**
 * Formatting Helper Functions - Utilities for text formatting operations
 */

import type { ContentBlock, TextFormatting } from '@/types/document.types';
import type { TextSelection } from './selection-manager';

/**
 * Find emphasized (bold) ranges in a block
 */
export function findEmphasizedRanges(block: ContentBlock): { start: number; end: number }[] {
  return block.formatting
    .filter(f => f.type === 'bold')
    .map(f => ({ start: f.start, end: f.end }));
}

/**
 * Find non-emphasized ranges in a block
 */
export function findNonEmphasizedRanges(block: ContentBlock): { start: number; end: number }[] {
  const emphasized = findEmphasizedRanges(block);
  const ranges: { start: number; end: number }[] = [];
  
  let currentPos = 0;
  emphasized.sort((a, b) => a.start - b.start);
  
  emphasized.forEach(emp => {
    if (currentPos < emp.start) {
      ranges.push({ start: currentPos, end: emp.start });
    }
    currentPos = Math.max(currentPos, emp.end);
  });
  
  if (currentPos < block.content.length) {
    ranges.push({ start: currentPos, end: block.content.length });
  }
  
  return ranges;
}

/**
 * Filter selections to only emphasized portions
 */
export function filterEmphasizedPortions(blocks: ContentBlock[], selections: TextSelection[]): TextSelection[] {
  const filtered: TextSelection[] = [];
  
  selections.forEach(selection => {
    const block = blocks.find(b => b.id === selection.blockId);
    if (!block) return;
    
    const emphasizedRanges = findEmphasizedRanges(block);
    
    emphasizedRanges.forEach(range => {
      // Find intersection between selection and emphasized range
      const start = Math.max(selection.start, range.start);
      const end = Math.min(selection.end, range.end);
      
      if (start < end) {
        filtered.push({
          blockId: selection.blockId,
          blockIndex: selection.blockIndex,
          start,
          end,
          text: block.content.substring(start, end)
        });
      }
    });
  });
  
  return filtered;
}

/**
 * Filter selections to only non-emphasized portions
 */
export function filterNonEmphasizedPortions(blocks: ContentBlock[], selections: TextSelection[]): TextSelection[] {
  const filtered: TextSelection[] = [];
  
  selections.forEach(selection => {
    const block = blocks.find(b => b.id === selection.blockId);
    if (!block) return;
    
    const nonEmphasizedRanges = findNonEmphasizedRanges(block);
    
    nonEmphasizedRanges.forEach(range => {
      // Find intersection between selection and non-emphasized range
      const start = Math.max(selection.start, range.start);
      const end = Math.min(selection.end, range.end);
      
      if (start < end) {
        filtered.push({
          blockId: selection.blockId,
          blockIndex: selection.blockIndex,
          start,
          end,
          text: block.content.substring(start, end)
        });
      }
    });
  });
  
  return filtered;
}

/**
 * Add formatting to a block's formatting array
 */
export function addFormattingToBlock(existing: TextFormatting[], newFormat: TextFormatting): TextFormatting[] {
  // Remove any overlapping formatting of the same type
  const filtered = existing.filter(f => 
    f.type !== newFormat.type || 
    f.end < newFormat.start || 
    f.start > newFormat.end
  );
  
  return [...filtered, newFormat].sort((a, b) => a.start - b.start);
}

/**
 * Clear formatting in a range
 */
export function clearFormattingInRange(formatting: TextFormatting[], start: number, end: number): TextFormatting[] {
  const result: TextFormatting[] = [];
  
  formatting.forEach(f => {
    // Format is completely outside the range
    if (f.end <= start || f.start >= end) {
      result.push(f);
    }
    // Format is partially overlapping - split it
    else {
      if (f.start < start) {
        result.push({
          ...f,
          end: start
        });
      }
      if (f.end > end) {
        result.push({
          ...f,
          start: end
        });
      }
    }
  });
  
  return result;
}

/**
 * Get current block index from cursor position
 */
export function getCurrentBlockIndex(): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return -1;
  
  const range = selection.getRangeAt(0);
  let node: Node | null = range.startContainer;
  
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.dataset?.blockIndex) {
        return parseInt(element.dataset.blockIndex);
      }
    }
    node = node.parentNode;
  }
  
  return -1;
}