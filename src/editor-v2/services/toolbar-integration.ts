/**
 * Toolbar Integration Service - Connects toolbar actions with editor operations
 * Ensures toolbar state syncs with document formatting and handles all format operations
 * Provides unified interface for both button clicks and keyboard shortcuts
 */

import { DocumentModel } from '../models/document-model';
import { TextFormatting } from '../data-structures/interval-tree';

export interface ToolbarAction {
  type: 'bold' | 'highlight' | 'minimize' | 'clear' | 'heading';
  color?: 'yellow' | 'blue' | 'green' | 'pink';
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface ToolbarState {
  isBoldActive: boolean;
  isHighlightActive: boolean;
  activeHighlightColor?: 'yellow' | 'blue' | 'green' | 'pink';
  isMinimizeActive: boolean;
  currentHeadingLevel: number;
}

export interface SelectionInfo {
  start: number;
  end: number;
  isCollapsed: boolean;
}

export class ToolbarIntegrationService {
  private document: DocumentModel;
  private onStateChange?: (state: ToolbarState) => void;
  private currentSelection: SelectionInfo | null = null;

  constructor(document: DocumentModel, onStateChange?: (state: ToolbarState) => void) {
    this.document = document;
    this.onStateChange = onStateChange;
  }

  /**
   * Update current selection and recalculate toolbar state
   */
  updateSelection(selection: SelectionInfo | null): void {
    this.currentSelection = selection;
    if (selection && !selection.isCollapsed) {
      const state = this.calculateToolbarState(selection);
      this.onStateChange?.(state);
    }
  }

  /**
   * Calculate toolbar state based on current selection
   */
  private calculateToolbarState(selection: SelectionInfo): ToolbarState {
    const formats = this.document.getFormattingInRange(selection.start, selection.end);
    
    // Check if entire selection has formatting
    const isBoldActive = this.hasCompleteFormatting(formats, 'bold', selection);
    const highlightFormat = this.getCompleteHighlightFormat(formats, selection);
    const isMinimizeActive = this.hasCompleteFormatting(formats, 'minimize', selection);
    
    // Get heading level from block type
    const blocks = this.document.getBlocks();
    const block = blocks.find(b => 
      selection.start >= b.offset && selection.start <= b.offset + b.length
    );
    
    let currentHeadingLevel = 1;
    if (block && block.type.startsWith('heading')) {
      currentHeadingLevel = parseInt(block.type.replace('heading', '')) || 1;
    }
    
    return {
      isBoldActive,
      isHighlightActive: !!highlightFormat,
      activeHighlightColor: highlightFormat?.color,
      isMinimizeActive,
      currentHeadingLevel
    };
  }

  /**
   * Check if entire selection has specific formatting
   */
  private hasCompleteFormatting(formats: TextFormatting[], type: TextFormatting['type'], selection: SelectionInfo): boolean {
    // Find all formatting of this type that overlaps with selection
    const relevantFormats = formats.filter(f => f.type === type);
    if (relevantFormats.length === 0) return false;
    
    // Check if formats cover entire selection
    const sortedFormats = relevantFormats.sort((a, b) => a.start - b.start);
    let coveredEnd = selection.start;
    
    for (const format of sortedFormats) {
      // If there's a gap, not complete coverage
      if (format.start > coveredEnd) return false;
      
      // Update covered end
      coveredEnd = Math.max(coveredEnd, format.end);
      
      // If we've covered the entire selection, return true
      if (coveredEnd >= selection.end) return true;
    }
    
    return coveredEnd >= selection.end;
  }

  /**
   * Get complete highlight format if entire selection is highlighted with same color
   */
  private getCompleteHighlightFormat(formats: TextFormatting[], selection: SelectionInfo): TextFormatting | null {
    const highlightFormats = formats.filter(f => f.type === 'highlight');
    if (highlightFormats.length === 0) return null;
    
    // Check if all highlights have the same color
    const firstColor = highlightFormats[0].color;
    if (!highlightFormats.every(f => f.color === firstColor)) return null;
    
    // Check complete coverage
    if (this.hasCompleteFormatting(highlightFormats, 'highlight', selection)) {
      return highlightFormats[0];
    }
    
    return null;
  }

  /**
   * Execute toolbar action
   */
  executeAction(action: ToolbarAction): void {
    if (!this.currentSelection || this.currentSelection.isCollapsed) {
      console.warn('No text selected for formatting');
      return;
    }

    const { start, end } = this.currentSelection;

    switch (action.type) {
      case 'bold':
        this.toggleBold(start, end);
        break;
      
      case 'highlight':
        this.toggleHighlight(start, end, action.color || 'yellow');
        break;
      
      case 'minimize':
        this.toggleMinimize(start, end);
        break;
      
      case 'clear':
        this.clearFormatting(start, end);
        break;
      
      case 'heading':
        this.setHeading(action.headingLevel || 1);
        break;
    }

    // Recalculate toolbar state after action
    this.updateSelection(this.currentSelection);
  }

  /**
   * Toggle bold formatting
   */
  private toggleBold(start: number, end: number): void {
    const formats = this.document.getFormattingInRange(start, end);
    const hasBold = this.hasCompleteFormatting(formats.filter(f => f.type === 'bold'), 'bold', { start, end, isCollapsed: false });
    
    if (hasBold) {
      // Remove bold formatting
      this.document.removeFormatting(start, end, 'bold');
    } else {
      // Apply bold formatting
      this.document.applyFormatting({
        type: 'bold',
        start,
        end,
        id: `fmt-bold-${Date.now()}`
      });
    }
  }

  /**
   * Toggle highlight formatting
   */
  private toggleHighlight(start: number, end: number, color: TextFormatting['color']): void {
    const formats = this.document.getFormattingInRange(start, end);
    const currentHighlight = this.getCompleteHighlightFormat(formats, { start, end, isCollapsed: false });
    
    if (currentHighlight && currentHighlight.color === color) {
      // Remove highlight if same color
      this.document.removeFormatting(start, end, 'highlight');
    } else {
      // Apply new highlight (replaces any existing)
      this.document.applyFormatting({
        type: 'highlight',
        color,
        start,
        end,
        id: `fmt-highlight-${Date.now()}`
      });
    }
  }

  /**
   * Toggle minimize formatting
   */
  private toggleMinimize(start: number, end: number): void {
    const formats = this.document.getFormattingInRange(start, end);
    const hasMinimize = this.hasCompleteFormatting(formats.filter(f => f.type === 'minimize'), 'minimize', { start, end, isCollapsed: false });
    
    if (hasMinimize) {
      // Remove minimize formatting
      this.document.removeFormatting(start, end, 'minimize');
    } else {
      // Apply minimize formatting
      this.document.applyFormatting({
        type: 'minimize',
        start,
        end,
        id: `fmt-minimize-${Date.now()}`
      });
    }
  }

  /**
   * Clear all formatting in selection
   */
  private clearFormatting(start: number, end: number): void {
    this.document.removeFormatting(start, end);
  }

  /**
   * Set heading level for current block
   */
  private setHeading(level: 1 | 2 | 3 | 4 | 5 | 6): void {
    if (!this.currentSelection) return;
    
    const blocks = this.document.getBlocks();
    const block = blocks.find(b => 
      this.currentSelection!.start >= b.offset && 
      this.currentSelection!.start <= b.offset + b.length
    );
    
    if (block) {
      // Update block type
      block.type = `heading${level}` as any;
    }
  }

  /**
   * Get current toolbar state
   */
  getCurrentState(): ToolbarState {
    if (!this.currentSelection || this.currentSelection.isCollapsed) {
      return {
        isBoldActive: false,
        isHighlightActive: false,
        isMinimizeActive: false,
        currentHeadingLevel: 1
      };
    }
    
    return this.calculateToolbarState(this.currentSelection);
  }
}