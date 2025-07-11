/**
 * Integration example showing how to use SelectionOffsetMapper with the editor
 * Demonstrates common selection operations and edge case handling
 */

import { SelectionOffsetMapper } from './selection-offset-mapper';
import { DocumentModel } from '../models/document-model';
import { SelectionManager } from '../selection/selection-manager';

export class SelectionIntegration {
  private document: DocumentModel;
  private selectionManager: SelectionManager;
  private mapper: SelectionOffsetMapper;
  private container: HTMLElement | null = null;
  
  constructor(document: DocumentModel, selectionManager: SelectionManager) {
    this.document = document;
    this.selectionManager = selectionManager;
    this.mapper = new SelectionOffsetMapper(document);
  }
  
  /**
   * Initialize with editor container
   */
  init(container: HTMLElement): void {
    this.container = container;
    this.mapper.setContainer(container);
    
    // Listen for selection changes
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
    
    // Listen for DOM mutations to update index
    const observer = new MutationObserver(() => {
      this.mapper.updateIndex();
    });
    
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }
  
  /**
   * Handle browser selection changes
   */
  private handleSelectionChange(): void {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      this.selectionManager.clearSelection();
      return;
    }
    
    // Convert DOM selection to global range
    const range = this.mapper.selectionToGlobalRange(selection);
    if (!range) return;
    
    // Update selection manager
    this.selectionManager.setSelection(range.start, range.end);
  }
  
  /**
   * Apply selection from selection manager to DOM
   */
  applySelection(): void {
    const state = this.selectionManager.getState();
    if (state.ranges.length === 0) return;
    
    // For now, handle only the primary selection
    const primaryRange = state.ranges.find(r => r.isAnchor);
    if (!primaryRange) return;
    
    // Convert to DOM selection
    const selectionInfo = this.mapper.globalRangeToSelection({
      start: primaryRange.start,
      end: primaryRange.end
    });
    
    if (!selectionInfo) return;
    
    // Apply to browser selection
    const selection = window.getSelection();
    if (!selection) return;
    
    const range = document.createRange();
    
    try {
      range.setStart(selectionInfo.anchorNode, selectionInfo.anchorOffset);
      range.setEnd(selectionInfo.focusNode, selectionInfo.focusOffset);
      
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) {
      console.error('Failed to apply selection:', e);
      // Rebuild index and retry once
      this.mapper.updateIndex();
      
      const retryInfo = this.mapper.globalRangeToSelection({
        start: primaryRange.start,
        end: primaryRange.end
      });
      
      if (retryInfo) {
        try {
          range.setStart(retryInfo.anchorNode, retryInfo.anchorOffset);
          range.setEnd(retryInfo.focusNode, retryInfo.focusOffset);
          
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (e2) {
          console.error('Retry failed:', e2);
        }
      }
    }
  }
  
  /**
   * Handle triple-click to select block
   */
  handleTripleClick(event: MouseEvent): void {
    if (!this.container) return;
    
    // Find clicked block
    const target = event.target as HTMLElement;
    const blockEl = target.closest('[data-block-id]');
    if (!blockEl) return;
    
    const blockId = blockEl.getAttribute('data-block-id');
    if (!blockId) return;
    
    // Get block selection range
    const range = this.mapper.handleTripleClickSelection(blockId);
    if (!range) return;
    
    // Update selection
    this.selectionManager.setSelection(range.start, range.end, 'paragraph');
    this.applySelection();
    
    // Prevent default triple-click behavior
    event.preventDefault();
  }
  
  /**
   * Handle Shift+End key combination
   */
  handleShiftEnd(): void {
    const state = this.selectionManager.getState();
    if (state.ranges.length === 0) return;
    
    const primaryRange = state.ranges.find(r => r.isAnchor);
    if (!primaryRange) return;
    
    // Get current position (use focus position for extending)
    const currentPos = primaryRange.isReversed ? primaryRange.start : primaryRange.end;
    
    // Get range to end of line
    const range = this.mapper.handleShiftEndSelection(currentPos);
    if (!range) return;
    
    // Extend selection
    this.selectionManager.extendSelection(range.end);
    this.applySelection();
  }
  
  /**
   * Handle Shift+Home key combination
   */
  handleShiftHome(): void {
    const state = this.selectionManager.getState();
    if (state.ranges.length === 0) return;
    
    const primaryRange = state.ranges.find(r => r.isAnchor);
    if (!primaryRange) return;
    
    // Get current position
    const currentPos = primaryRange.isReversed ? primaryRange.start : primaryRange.end;
    
    // Get range to start of line
    const range = this.mapper.handleShiftHomeSelection(currentPos);
    if (!range) return;
    
    // Extend selection
    this.selectionManager.extendSelection(range.start);
    this.applySelection();
  }
  
  /**
   * Handle drag selection with proper boundary detection
   */
  handleDragSelection(startEvent: MouseEvent, endEvent: MouseEvent): void {
    if (!this.container) return;
    
    // Get positions from mouse events
    const startPos = this.getPositionFromPoint(startEvent.clientX, startEvent.clientY);
    const endPos = this.getPositionFromPoint(endEvent.clientX, endEvent.clientY);
    
    if (!startPos || !endPos) return;
    
    // Convert to global offsets
    const startOffset = this.mapper.domPositionToGlobalOffset(startPos.node, startPos.offset);
    const endOffset = this.mapper.domPositionToGlobalOffset(endPos.node, endPos.offset);
    
    if (startOffset === null || endOffset === null) return;
    
    // Update selection
    this.selectionManager.setSelection(startOffset, endOffset);
    this.applySelection();
  }
  
  /**
   * Get DOM position from point (for mouse interactions)
   */
  private getPositionFromPoint(x: number, y: number): { node: Node; offset: number } | null {
    if (!document.caretPositionFromPoint && !document.caretRangeFromPoint) {
      return null;
    }
    
    if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      return pos ? { node: pos.offsetNode, offset: pos.offset } : null;
    } else {
      const range = document.caretRangeFromPoint!(x, y);
      return range ? { node: range.startContainer, offset: range.startOffset } : null;
    }
  }
  
  /**
   * Restore selection after document changes
   */
  restoreSelection(): void {
    // Get current selection state
    const state = this.selectionManager.getState();
    if (state.ranges.length === 0) return;
    
    // Update mapper index after document changes
    this.mapper.updateIndex();
    
    // Reapply selection
    this.applySelection();
  }
  
  /**
   * Handle selection in formatted text
   */
  handleFormattedTextSelection(
    startNode: Node, 
    startOffset: number, 
    endNode: Node, 
    endOffset: number
  ): void {
    // This handles selections that span across formatting boundaries
    const range = this.mapper.selectionToGlobalRange({
      anchorNode: startNode,
      anchorOffset: startOffset,
      focusNode: endNode,
      focusOffset: endOffset
    });
    
    if (!range) return;
    
    // Update selection manager
    this.selectionManager.setSelection(range.start, range.end);
    this.applySelection();
  }
  
  /**
   * Debug helper: log current selection mapping
   */
  debugSelection(): void {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      console.log('No selection');
      return;
    }
    
    console.log('=== Selection Debug ===');
    console.log('DOM Selection:', {
      anchorNode: selection.anchorNode,
      anchorOffset: selection.anchorOffset,
      focusNode: selection.focusNode,
      focusOffset: selection.focusOffset,
      text: selection.toString()
    });
    
    const range = this.mapper.selectionToGlobalRange(selection);
    if (range) {
      console.log('Global Range:', range);
      
      // Test round trip
      const backToSelection = this.mapper.globalRangeToSelection(range);
      console.log('Round Trip:', backToSelection);
    }
    
    // Print mapper index
    this.mapper.debugPrintIndex();
  }
}

/**
 * Example usage in editor component
 */
export function setupSelectionIntegration(
  editorElement: HTMLElement,
  document: DocumentModel,
  selectionManager: SelectionManager
): SelectionIntegration {
  const integration = new SelectionIntegration(document, selectionManager);
  integration.init(editorElement);
  
  // Add event listeners
  editorElement.addEventListener('click', (e) => {
    if (e.detail === 3) { // Triple click
      integration.handleTripleClick(e);
    }
  });
  
  editorElement.addEventListener('keydown', (e) => {
    if (e.shiftKey) {
      if (e.key === 'End') {
        e.preventDefault();
        integration.handleShiftEnd();
      } else if (e.key === 'Home') {
        e.preventDefault();
        integration.handleShiftHome();
      }
    }
  });
  
  // Drag selection handling would require more complex mouse event tracking
  
  return integration;
}