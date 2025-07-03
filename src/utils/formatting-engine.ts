/**
 * Formatting Engine - Core logic for applying text formatting
 * Handles complex formatting operations including overlaps and conflicts
 */

import type { ContentBlock, TextFormatting, FormattingType, HighlightColor } from '@/types/document.types';
import type { TextSelection } from './selection-manager';

const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'blue', 'green', 'pink'];

export class FormattingEngine {
  /**
   * Apply formatting to multiple selections across blocks
   * @param blocks - Content blocks to format
   * @param selections - Text selections to format
   * @param type - Type of formatting to apply
   * @param color - Highlight color (for highlight type)
   * @returns Updated content blocks
   */
  static applyFormatting(
    blocks: ContentBlock[],
    selections: TextSelection[],
    type: FormattingType,
    color?: HighlightColor
  ): ContentBlock[] {
    // Group selections by block
    const selectionsByBlock = new Map<string, TextSelection[]>();
    selections.forEach(sel => {
      const list = selectionsByBlock.get(sel.blockId) || [];
      list.push(sel);
      selectionsByBlock.set(sel.blockId, list);
    });
    
    // Apply formatting to each block
    return blocks.map(block => {
      const blockSelections = selectionsByBlock.get(block.id);
      if (!blockSelections) return block;
      
      let formatting = [...(block.formatting || [])];
      
      blockSelections.forEach(selection => {
        if (type === 'bold') {
          formatting = this.applyBoldFormatting(formatting, selection, block);
        } else if (type === 'highlight') {
          formatting = this.applyHighlightFormatting(formatting, selection, color);
        } else if (type === 'minimize') {
          formatting = this.applyMinimizeFormatting(formatting, selection, block);
        }
      });
      
      return {
        ...block,
        formatting: this.cleanupFormatting(formatting)
      };
    });
  }
  
  /**
   * Clear all formatting from selections
   */
  static clearFormatting(
    blocks: ContentBlock[],
    selections: TextSelection[]
  ): ContentBlock[] {
    const selectionsByBlock = new Map<string, TextSelection[]>();
    selections.forEach(sel => {
      const list = selectionsByBlock.get(sel.blockId) || [];
      list.push(sel);
      selectionsByBlock.set(sel.blockId, list);
    });
    
    return blocks.map(block => {
      const blockSelections = selectionsByBlock.get(block.id);
      if (!blockSelections || !block.formatting) return block;
      
      let formatting = [...block.formatting];
      
      blockSelections.forEach(selection => {
        formatting = formatting.filter(fmt => {
          // Remove formatting that overlaps with selection
          return fmt.end <= selection.start || fmt.start >= selection.end;
        }).map(fmt => {
          // Adjust formatting that partially overlaps
          if (fmt.start < selection.start && fmt.end > selection.start) {
            return { ...fmt, end: selection.start };
          }
          if (fmt.start < selection.end && fmt.end > selection.end) {
            return { ...fmt, start: selection.end };
          }
          return fmt;
        });
      });
      
      return {
        ...block,
        formatting: this.cleanupFormatting(formatting)
      };
    });
  }
  
  /**
   * Apply bold formatting with special rules
   */
  private static applyBoldFormatting(
    formatting: TextFormatting[],
    selection: TextSelection,
    block: ContentBlock
  ): TextFormatting[] {
    // Check if selection covers entire paragraph
    const isFullParagraph = selection.start === 0 && selection.end === block.content.length;
    
    // Remove existing bold in selection range
    formatting = this.removeFormattingInRange(formatting, 'bold', selection.start, selection.end);
    
    // Add new bold formatting
    formatting.push({
      type: 'bold',
      start: selection.start,
      end: selection.end
    });
    
    return formatting;
  }
  
  /**
   * Apply highlight formatting with color cycling
   */
  private static applyHighlightFormatting(
    formatting: TextFormatting[],
    selection: TextSelection,
    color?: HighlightColor
  ): TextFormatting[] {
    // Find existing highlights in range
    const existingHighlights = formatting.filter(fmt => 
      fmt.type === 'highlight' &&
      fmt.start >= selection.start &&
      fmt.end <= selection.end
    );
    
    if (existingHighlights.length > 0) {
      // Cycle through colors
      const currentColor = existingHighlights[0].color || 'yellow';
      const currentIndex = HIGHLIGHT_COLORS.indexOf(currentColor);
      const nextColor = HIGHLIGHT_COLORS[(currentIndex + 1) % HIGHLIGHT_COLORS.length];
      
      // Update existing highlights
      formatting = formatting.map(fmt => {
        if (fmt.type === 'highlight' && 
            fmt.start >= selection.start && 
            fmt.end <= selection.end) {
          return { ...fmt, color: nextColor };
        }
        return fmt;
      });
    } else {
      // Remove any partial highlights and add new one
      formatting = this.removeFormattingInRange(formatting, 'highlight', selection.start, selection.end);
      formatting.push({
        type: 'highlight',
        start: selection.start,
        end: selection.end,
        color: color || 'yellow'
      });
    }
    
    return formatting;
  }
  
  /**
   * Apply minimize formatting (only on non-emphasized text)
   */
  private static applyMinimizeFormatting(
    formatting: TextFormatting[],
    selection: TextSelection,
    block: ContentBlock
  ): TextFormatting[] {
    // Check for bold formatting in selection
    const hasBold = formatting.some(fmt => 
      fmt.type === 'bold' &&
      fmt.start < selection.end &&
      fmt.end > selection.start
    );
    
    if (hasBold) {
      // Don't apply minimize to emphasized text
      return formatting;
    }
    
    // Remove existing minimize and add new
    formatting = this.removeFormattingInRange(formatting, 'minimize', selection.start, selection.end);
    formatting.push({
      type: 'minimize',
      start: selection.start,
      end: selection.end
    });
    
    return formatting;
  }
  
  /**
   * Remove formatting of specific type in range
   */
  private static removeFormattingInRange(
    formatting: TextFormatting[],
    type: FormattingType,
    start: number,
    end: number
  ): TextFormatting[] {
    const result: TextFormatting[] = [];
    
    formatting.forEach(fmt => {
      if (fmt.type !== type) {
        result.push(fmt);
        return;
      }
      
      // Format is outside range
      if (fmt.end <= start || fmt.start >= end) {
        result.push(fmt);
        return;
      }
      
      // Format partially overlaps - split it
      if (fmt.start < start) {
        result.push({ ...fmt, end: start });
      }
      if (fmt.end > end) {
        result.push({ ...fmt, start: end });
      }
    });
    
    return result;
  }
  
  /**
   * Clean up and merge adjacent formatting
   */
  private static cleanupFormatting(formatting: TextFormatting[]): TextFormatting[] {
    if (formatting.length === 0) return [];
    
    // Sort by start position
    formatting.sort((a, b) => a.start - b.start);
    
    // Merge adjacent formatting of same type
    const merged: TextFormatting[] = [];
    let current: TextFormatting | null = null;
    
    for (const fmt of formatting) {
      if (!current) {
        current = { ...fmt };
        continue;
      }
      
      // Check if can merge with current
      if (current.type === fmt.type &&
          current.end >= fmt.start &&
          current.color === fmt.color) {
        current.end = Math.max(current.end, fmt.end);
      } else {
        merged.push(current);
        current = { ...fmt };
      }
    }
    
    if (current) {
      merged.push(current);
    }
    
    return merged;
  }
  
  /**
   * Get the next highlight color in cycle
   */
  static getNextHighlightColor(currentColor?: HighlightColor): HighlightColor {
    if (!currentColor) return 'yellow';
    const index = HIGHLIGHT_COLORS.indexOf(currentColor);
    return HIGHLIGHT_COLORS[(index + 1) % HIGHLIGHT_COLORS.length];
  }
  
  /**
   * Check if text has emphasis (bold) formatting
   */
  static hasEmphasis(formatting: TextFormatting[], start: number, end: number): boolean {
    return formatting.some(fmt => 
      fmt.type === 'bold' &&
      fmt.start < end &&
      fmt.end > start
    );
  }
}