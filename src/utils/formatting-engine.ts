/**
 * Formatting Engine - Core logic for applying text formatting
 * Handles bold, highlight, minimize, and clear formatting operations
 */

import type { ContentBlock, TextFormatting, FormattingType, HighlightColor } from '@/types/document.types';
import type { TextSelection } from './selection-manager';
import { 
  findEmphasizedRanges, 
  findNonEmphasizedRanges,
  filterEmphasizedPortions,
  filterNonEmphasizedPortions,
  addFormattingToBlock,
  clearFormattingInRange,
  getCurrentBlockIndex
} from './formatting-helpers';

// Highlight color cycling order
const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'blue', 'green', 'pink'];

/**
 * Apply formatting to content blocks based on selections
 */
export function applyFormatting(
  blocks: ContentBlock[],
  selections: TextSelection[],
  formatType: FormattingType,
  color?: HighlightColor
): ContentBlock[] {
  // If no selections, apply to entire paragraph where cursor is
  if (selections.length === 0) {
    return blocks;
  }

  // Clone blocks to avoid mutations
  const newBlocks = blocks.map(block => ({
    ...block,
    formatting: [...block.formatting]
  }));

  // Apply formatting to each selection
  selections.forEach(selection => {
    const blockIndex = newBlocks.findIndex(b => b.id === selection.blockId);
    if (blockIndex === -1) return;

    const block = newBlocks[blockIndex];
    
    if (formatType === 'clear') {
      // Clear all formatting in the selection range
      block.formatting = clearFormattingInRange(block.formatting, selection.start, selection.end);
    } else {
      // Add new formatting
      const newFormat: TextFormatting = {
        type: formatType,
        start: selection.start,
        end: selection.end,
        ...(color && { color })
      };
      
      block.formatting = addFormattingToBlock(block.formatting, newFormat);
    }
  });

  return newBlocks;
}

/**
 * Apply bold formatting with special rules
 */
export function applyBoldFormatting(
  blocks: ContentBlock[],
  selections: TextSelection[],
  cursorBlockIndex?: number
): ContentBlock[] {
  if (selections.length === 0 && cursorBlockIndex !== undefined) {
    // Apply to entire paragraph where cursor is
    if (cursorBlockIndex === -1 || cursorBlockIndex >= blocks.length) return blocks;
    
    const block = blocks[cursorBlockIndex];
    const fullSelection: TextSelection = {
      blockId: block.id,
      blockIndex: cursorBlockIndex,
      start: 0,
      end: block.content.length,
      text: block.content
    };
    
    return applyFormatting(blocks, [fullSelection], 'bold');
  }
  
  return applyFormatting(blocks, selections, 'bold');
}

/**
 * Apply highlight with color cycling
 */
export function applyHighlightFormatting(
  blocks: ContentBlock[],
  selections: TextSelection[],
  currentColor?: HighlightColor,
  cursorBlockIndex?: number
): ContentBlock[] {
  // Determine next color in cycle
  const nextColor = getNextHighlightColor(currentColor);
  
  if (selections.length === 0 && cursorBlockIndex !== undefined) {
    // Find all emphasized text in current paragraph and highlight it
    if (cursorBlockIndex === -1 || cursorBlockIndex >= blocks.length) return blocks;
    
    const block = blocks[cursorBlockIndex];
    const emphasizedRanges = findEmphasizedRanges(block);
    
    const emphasizedSelections = emphasizedRanges.map(range => ({
      blockId: block.id,
      blockIndex: cursorBlockIndex,
      start: range.start,
      end: range.end,
      text: block.content.substring(range.start, range.end)
    }));
    
    return applyFormatting(blocks, emphasizedSelections, 'highlight', nextColor);
  }
  
  // Only apply to emphasized portions of selections
  const emphasizedSelections = filterEmphasizedPortions(blocks, selections);
  return applyFormatting(blocks, emphasizedSelections, 'highlight', nextColor);
}

/**
 * Apply minimize formatting
 */
export function applyMinimizeFormatting(
  blocks: ContentBlock[],
  selections: TextSelection[],
  cursorBlockIndex?: number
): ContentBlock[] {
  if (selections.length === 0 && cursorBlockIndex !== undefined) {
    // Find all non-emphasized text in current paragraph
    if (cursorBlockIndex === -1 || cursorBlockIndex >= blocks.length) return blocks;
    
    const block = blocks[cursorBlockIndex];
    const nonEmphasizedRanges = findNonEmphasizedRanges(block);
    
    const nonEmphasizedSelections = nonEmphasizedRanges.map(range => ({
      blockId: block.id,
      blockIndex: cursorBlockIndex,
      start: range.start,
      end: range.end,
      text: block.content.substring(range.start, range.end)
    }));
    
    return applyFormatting(blocks, nonEmphasizedSelections, 'minimize');
  }
  
  // Only apply to non-emphasized portions of selections
  const nonEmphasizedSelections = filterNonEmphasizedPortions(blocks, selections);
  return applyFormatting(blocks, nonEmphasizedSelections, 'minimize');
}

/**
 * Clear all formatting
 */
export function clearFormatting(
  blocks: ContentBlock[],
  selections: TextSelection[],
  cursorBlockIndex?: number
): ContentBlock[] {
  if (selections.length === 0 && cursorBlockIndex !== undefined) {
    // Clear entire paragraph where cursor is
    if (cursorBlockIndex === -1 || cursorBlockIndex >= blocks.length) return blocks;
    
    const block = blocks[cursorBlockIndex];
    const fullSelection: TextSelection = {
      blockId: block.id,
      blockIndex: cursorBlockIndex,
      start: 0,
      end: block.content.length,
      text: block.content
    };
    
    return applyFormatting(blocks, [fullSelection], 'clear');
  }
  
  return applyFormatting(blocks, selections, 'clear');
}

/**
 * Get the next highlight color in the cycle
 */
function getNextHighlightColor(currentColor?: HighlightColor): HighlightColor {
  if (!currentColor) return HIGHLIGHT_COLORS[0];
  
  const currentIndex = HIGHLIGHT_COLORS.indexOf(currentColor);
  const nextIndex = (currentIndex + 1) % HIGHLIGHT_COLORS.length;
  return HIGHLIGHT_COLORS[nextIndex];
}