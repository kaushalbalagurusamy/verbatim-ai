/**
 * Toolbar State Service - Queries DocumentModel to determine active formatting
 * Provides reactive updates when selection changes
 * Handles edge cases like collapsed selections and multi-block selections
 */

import { DocumentModel } from '../models/document-model';
import { TextFormatting } from '../data-structures/interval-tree';
import type { HighlightColor } from '@/types/document.types';

export interface ToolbarState {
  isBold: boolean;
  isHighlighted: boolean;
  highlightColor?: HighlightColor;
  isMinimized: boolean;
  activeFormats: Set<string>;
}

export interface SelectionRange {
  start: number;
  end: number;
  isCollapsed: boolean;
}

export class ToolbarStateService {
  private document: DocumentModel;
  private listeners: ((state: ToolbarState) => void)[] = [];
  private currentSelection: SelectionRange | null = null;
  private currentState: ToolbarState = {
    isBold: false,
    isHighlighted: false,
    highlightColor: undefined,
    isMinimized: false,
    activeFormats: new Set()
  };

  constructor(document: DocumentModel) {
    this.document = document;
  }

  /**
   * Update selection and compute new toolbar state
   */
  updateSelection(selection: SelectionRange | null): void {
    this.currentSelection = selection;
    const newState = this.computeToolbarState();
    
    // Only notify if state actually changed
    if (!this.statesEqual(this.currentState, newState)) {
      this.currentState = newState;
      this.notifyListeners();
    }
  }

  /**
   * Get current toolbar state
   */
  getState(): ToolbarState {
    return { ...this.currentState };
  }

  /**
   * Subscribe to toolbar state changes
   */
  subscribe(listener: (state: ToolbarState) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately notify with current state
    listener(this.getState());
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Compute toolbar state based on current selection
   */
  private computeToolbarState(): ToolbarState {
    if (!this.currentSelection) {
      return {
        isBold: false,
        isHighlighted: false,
        highlightColor: undefined,
        isMinimized: false,
        activeFormats: new Set()
      };
    }

    const { start, end, isCollapsed } = this.currentSelection;
    
    if (isCollapsed) {
      // For collapsed selection, check formatting at cursor position
      return this.getFormattingAtPosition(start);
    } else {
      // For range selection, get common formatting across the range
      return this.getCommonFormattingInRange(start, end);
    }
  }

  /**
   * Get formatting at a specific position (for collapsed selections)
   */
  private getFormattingAtPosition(offset: number): ToolbarState {
    const formatting = this.document.getFormattingAt(offset);
    
    const state: ToolbarState = {
      isBold: false,
      isHighlighted: false,
      highlightColor: undefined,
      isMinimized: false,
      activeFormats: new Set()
    };

    // Process all formatting at this position
    for (const fmt of formatting) {
      state.activeFormats.add(fmt.type);
      
      switch (fmt.type) {
        case 'bold':
          state.isBold = true;
          break;
        case 'highlight':
          state.isHighlighted = true;
          state.highlightColor = this.mapColorToHighlightColor(fmt.color);
          break;
        case 'minimize':
          state.isMinimized = true;
          break;
      }
    }

    return state;
  }

  /**
   * Get common formatting across a range (for non-collapsed selections)
   */
  private getCommonFormattingInRange(start: number, end: number): ToolbarState {
    const formatting = this.document.getFormattingInRange(start, end);
    
    // Count how much of the range each format type covers
    const formatCoverage = new Map<string, number>();
    const formatColors = new Map<string, string | undefined>();
    
    for (const fmt of formatting) {
      // Calculate overlap with selection
      const overlapStart = Math.max(fmt.start, start);
      const overlapEnd = Math.min(fmt.end, end);
      const overlapLength = overlapEnd - overlapStart;
      
      if (overlapLength > 0) {
        const key = fmt.type;
        formatCoverage.set(key, (formatCoverage.get(key) || 0) + overlapLength);
        
        // Track color for highlights
        if (fmt.type === 'highlight' && fmt.color) {
          formatColors.set(key, fmt.color);
        }
      }
    }
    
    const selectionLength = end - start;
    const state: ToolbarState = {
      isBold: false,
      isHighlighted: false,
      highlightColor: undefined,
      isMinimized: false,
      activeFormats: new Set()
    };

    // Consider a format active if it covers the entire selection
    for (const [format, coverage] of formatCoverage) {
      if (coverage >= selectionLength) {
        state.activeFormats.add(format);
        
        switch (format) {
          case 'bold':
            state.isBold = true;
            break;
          case 'highlight':
            state.isHighlighted = true;
            const color = formatColors.get(format);
            state.highlightColor = this.mapColorToHighlightColor(color);
            break;
          case 'minimize':
            state.isMinimized = true;
            break;
        }
      }
    }

    return state;
  }

  /**
   * Map internal color strings to HighlightColor type
   */
  private mapColorToHighlightColor(color?: string): HighlightColor | undefined {
    if (!color) return undefined;
    
    // Map color names to HighlightColor values
    const colorMap: Record<string, HighlightColor> = {
      'yellow': 'yellow',
      'blue': 'blue',
      'green': 'green',
      'pink': 'pink',
      '#fef08a': 'yellow',
      '#bfdbfe': 'blue',
      '#bbf7d0': 'green',
      '#fecaca': 'pink'
    };
    
    return colorMap[color] || 'yellow';
  }

  /**
   * Check if two toolbar states are equal
   */
  private statesEqual(a: ToolbarState, b: ToolbarState): boolean {
    if (a.isBold !== b.isBold ||
        a.isHighlighted !== b.isHighlighted ||
        a.highlightColor !== b.highlightColor ||
        a.isMinimized !== b.isMinimized) {
      return false;
    }
    
    // Check if active formats sets are equal
    if (a.activeFormats.size !== b.activeFormats.size) {
      return false;
    }
    
    for (const format of a.activeFormats) {
      if (!b.activeFormats.has(format)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  /**
   * Check if a format is active in the current selection
   */
  isFormatActive(formatType: TextFormatting['type']): boolean {
    return this.currentState.activeFormats.has(formatType);
  }

  /**
   * Get the current highlight color if any
   */
  getCurrentHighlightColor(): HighlightColor | undefined {
    return this.currentState.highlightColor;
  }
}