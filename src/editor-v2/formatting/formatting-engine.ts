/**
 * New Formatting Engine - Handles text formatting with proper color mapping
 * Fixes the hex color to color name mapping issue
 * Provides efficient formatting operations with proper highlight toggling
 */

import { DocumentModel } from '../models/document-model';
import { TextFormatting } from '../data-structures/interval-tree';
import { SelectionRange } from '../selection/selection-manager';

export type FormattingType = 'bold' | 'highlight' | 'minimize';
export type HighlightColor = 'yellow' | 'blue' | 'green' | 'pink';

// Color mapping from hex to names
const HEX_TO_COLOR_NAME: Record<string, HighlightColor> = {
  '#fef08a': 'yellow',
  '#facc15': 'yellow', // Icon color variant
  '#bfdbfe': 'blue',
  '#3b82f6': 'blue',   // Icon color variant
  '#bbf7d0': 'green',
  '#22c55e': 'green',  // Icon color variant
  '#fecaca': 'pink',
  '#ec4899': 'pink'    // Icon color variant
};

// Color cycling order
const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'blue', 'green', 'pink'];

export class FormattingEngine {
  private document: DocumentModel;
  private formatCounter: number;

  constructor(document: DocumentModel) {
    this.document = document;
    this.formatCounter = 0;
  }

  /**
   * Apply formatting to a selection
   */
  applyFormatting(
    selection: SelectionRange,
    type: FormattingType,
    colorOrHex?: string
  ): void {
    const { start, end } = selection;
    
    if (start === end) {
      // No selection, apply to paragraph
      this.applyToParagraph(start, type, colorOrHex);
      return;
    }
    
    switch (type) {
      case 'bold':
        this.applyBold(start, end);
        break;
        
      case 'highlight':
        this.applyHighlight(start, end, colorOrHex);
        break;
        
      case 'minimize':
        this.applyMinimize(start, end);
        break;
    }
  }

  /**
   * Apply bold formatting
   */
  private applyBold(start: number, end: number): void {
    // Remove existing bold in range
    this.document.removeFormatting(start, end, 'bold');
    
    // Apply new bold
    this.document.applyFormatting({
      id: this.generateId(),
      type: 'bold',
      start,
      end
    });
  }

  /**
   * Apply highlight formatting with proper color handling
   */
  private applyHighlight(start: number, end: number, colorOrHex?: string): void {
    // Convert hex to color name if needed
    let color: HighlightColor | undefined;
    
    if (colorOrHex) {
      // Check if it's already a valid color name
      if (HIGHLIGHT_COLORS.includes(colorOrHex as HighlightColor)) {
        color = colorOrHex as HighlightColor;
      } else {
        // Try to map from hex
        color = HEX_TO_COLOR_NAME[colorOrHex.toLowerCase()];
      }
    }
    
    // Get existing highlights in range
    const existingHighlights = this.document.getFormattingInRange(start, end)
      .filter(f => f.type === 'highlight');
    
    if (existingHighlights.length > 0) {
      // Check if all text in range is already highlighted with the same color
      const allSameColor = existingHighlights.every(h => h.color === color);
      const fullyHighlighted = this.isFullyFormatted(start, end, existingHighlights);
      
      if (allSameColor && fullyHighlighted) {
        // Toggle off - remove highlighting
        this.document.removeFormatting(start, end, 'highlight');
        return;
      }
      
      // Otherwise, cycle to next color
      const currentColor = existingHighlights[0].color || 'yellow';
      const currentIndex = HIGHLIGHT_COLORS.indexOf(currentColor);
      color = HIGHLIGHT_COLORS[(currentIndex + 1) % HIGHLIGHT_COLORS.length];
    } else if (!color) {
      // No existing highlights and no color specified, use first color
      color = HIGHLIGHT_COLORS[0];
    }
    
    // Remove existing highlights
    this.document.removeFormatting(start, end, 'highlight');
    
    // Apply new highlight
    this.document.applyFormatting({
      id: this.generateId(),
      type: 'highlight',
      color,
      start,
      end
    });
  }

  /**
   * Apply minimize formatting
   */
  private applyMinimize(start: number, end: number): void {
    // Check if already minimized
    const existing = this.document.getFormattingInRange(start, end)
      .filter(f => f.type === 'minimize');
    
    if (this.isFullyFormatted(start, end, existing)) {
      // Toggle off
      this.document.removeFormatting(start, end, 'minimize');
    } else {
      // Apply minimize
      this.document.removeFormatting(start, end, 'minimize');
      this.document.applyFormatting({
        id: this.generateId(),
        type: 'minimize',
        start,
        end
      });
    }
  }

  /**
   * Apply formatting to entire paragraph
   */
  private applyToParagraph(offset: number, type: FormattingType, colorOrHex?: string): void {
    const blocks = this.document.getBlocks();
    const block = blocks.find(b => offset >= b.offset && offset < b.offset + b.length);
    
    if (!block) return;
    
    const start = block.offset;
    const end = block.offset + block.length;
    
    switch (type) {
      case 'bold':
        this.applyBold(start, end);
        break;
        
      case 'highlight': {
        // For paragraph highlighting, find emphasized text
        const emphasizedRanges = this.findEmphasizedRanges(block);
        if (emphasizedRanges.length > 0) {
          for (const range of emphasizedRanges) {
            this.applyHighlight(
              block.offset + range.start,
              block.offset + range.end,
              colorOrHex
            );
          }
        } else {
          // No emphasized text, highlight entire paragraph
          this.applyHighlight(start, end, colorOrHex);
        }
        break;
      }
        
      case 'minimize': {
        // For paragraph minimize, find non-emphasized text
        const nonEmphasizedRanges = this.findNonEmphasizedRanges(block);
        for (const range of nonEmphasizedRanges) {
          this.applyMinimize(
            block.offset + range.start,
            block.offset + range.end
          );
        }
        break;
      }
    }
  }

  /**
   * Clear all formatting in a range
   */
  clearFormatting(start: number, end: number): void {
    this.document.removeFormatting(start, end);
  }

  /**
   * Toggle highlight color on selected text
   */
  toggleHighlight(selection: SelectionRange, currentColorHex?: string): void {
    const { start, end } = selection;
    
    if (start === end) return;
    
    // Get current highlight color
    const existing = this.document.getFormattingInRange(start, end)
      .filter(f => f.type === 'highlight');
    
    if (existing.length === 0) {
      // No highlight, apply default or specified color
      const color = currentColorHex ? 
        (HEX_TO_COLOR_NAME[currentColorHex.toLowerCase()] || 'yellow') : 
        'yellow';
      
      this.applyHighlight(start, end, color);
    } else {
      // Has highlight, check if we should remove or change color
      const firstColor = existing[0].color;
      const allSameColor = existing.every(h => h.color === firstColor);
      
      if (allSameColor && this.isFullyFormatted(start, end, existing)) {
        // All same color and fully highlighted - remove
        this.document.removeFormatting(start, end, 'highlight');
      } else {
        // Mixed colors or partial - cycle to next
        const nextColor = this.getNextHighlightColor(firstColor);
        this.applyHighlight(start, end, nextColor);
      }
    }
  }

  /**
   * Get next highlight color in cycle
   */
  private getNextHighlightColor(current?: HighlightColor): HighlightColor {
    if (!current) return 'yellow';
    
    const index = HIGHLIGHT_COLORS.indexOf(current);
    return HIGHLIGHT_COLORS[(index + 1) % HIGHLIGHT_COLORS.length];
  }

  /**
   * Check if range is fully covered by formatting
   */
  private isFullyFormatted(start: number, end: number, formatting: TextFormatting[]): boolean {
    if (formatting.length === 0) return false;
    
    // Sort by start position
    const sorted = [...formatting].sort((a, b) => a.start - b.start);
    
    // Check if first format starts at or before range start
    if (sorted[0].start > start) return false;
    
    // Check for gaps
    let currentEnd = start;
    
    for (const fmt of sorted) {
      if (fmt.start > currentEnd) return false;
      currentEnd = Math.max(currentEnd, fmt.end);
      if (currentEnd >= end) return true;
    }
    
    return currentEnd >= end;
  }

  /**
   * Find emphasized ranges in a block (mock implementation)
   */
  private findEmphasizedRanges(block: { text: string }): Array<{ start: number; end: number }> {
    // This would analyze the text for emphasized portions
    // For now, return a simple implementation
    const ranges: Array<{ start: number; end: number }> = [];
    
    // Look for quoted text
    const quoteRegex = /"([^"]+)"/g;
    let match;
    
    while ((match = quoteRegex.exec(block.text)) !== null) {
      ranges.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    return ranges;
  }

  /**
   * Find non-emphasized ranges in a block
   */
  private findNonEmphasizedRanges(block: { text: string }): Array<{ start: number; end: number }> {
    const emphasized = this.findEmphasizedRanges(block);
    const ranges: Array<{ start: number; end: number }> = [];
    
    let lastEnd = 0;
    
    for (const emp of emphasized) {
      if (emp.start > lastEnd) {
        ranges.push({ start: lastEnd, end: emp.start });
      }
      lastEnd = emp.end;
    }
    
    if (lastEnd < block.text.length) {
      ranges.push({ start: lastEnd, end: block.text.length });
    }
    
    return ranges;
  }

  /**
   * Generate unique formatting ID
   */
  private generateId(): string {
    return `fmt-${Date.now()}-${this.formatCounter++}`;
  }

  /**
   * Get formatting at cursor position
   */
  getFormattingAtCursor(offset: number): {
    isBold: boolean;
    isHighlighted: boolean;
    highlightColor?: HighlightColor;
    isMinimized: boolean;
  } {
    const formatting = this.document.getFormattingAt(offset);
    
    return {
      isBold: formatting.some(f => f.type === 'bold'),
      isHighlighted: formatting.some(f => f.type === 'highlight'),
      highlightColor: formatting.find(f => f.type === 'highlight')?.color,
      isMinimized: formatting.some(f => f.type === 'minimize')
    };
  }

  /**
   * Convert hex color to highlight color name
   */
  static hexToColorName(hex: string): HighlightColor | undefined {
    return HEX_TO_COLOR_NAME[hex.toLowerCase()];
  }

  /**
   * Get hex color for highlight color name
   */
  static colorNameToHex(color: HighlightColor): string {
    const hexMap: Record<HighlightColor, string> = {
      yellow: '#fef08a',
      blue: '#bfdbfe',
      green: '#bbf7d0',
      pink: '#fecaca'
    };
    
    return hexMap[color];
  }
}