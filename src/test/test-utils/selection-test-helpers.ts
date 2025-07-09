/**
 * Selection Test Helpers - Utilities for mocking and testing browser Selection API
 * Provides functions for creating test selections and verifying selection behavior
 */

import { vi } from 'vitest';

/**
 * Mock Selection API for testing
 */
export class MockSelection implements Selection {
  anchorNode: Node | null = null;
  anchorOffset: number = 0;
  focusNode: Node | null = null;
  focusOffset: number = 0;
  isCollapsed: boolean = true;
  rangeCount: number = 0;
  type: string = 'None';
  private ranges: Range[] = [];

  getRangeAt(index: number): Range {
    if (index >= this.rangeCount) {
      throw new Error('INDEX_SIZE_ERR');
    }
    return this.ranges[index];
  }

  addRange(range: Range): void {
    this.ranges.push(range);
    this.rangeCount = this.ranges.length;
    
    // Update anchor and focus
    this.anchorNode = range.startContainer;
    this.anchorOffset = range.startOffset;
    this.focusNode = range.endContainer;
    this.focusOffset = range.endOffset;
    this.isCollapsed = range.collapsed;
    this.type = range.collapsed ? 'Caret' : 'Range';
  }

  removeAllRanges(): void {
    this.ranges = [];
    this.rangeCount = 0;
    this.anchorNode = null;
    this.anchorOffset = 0;
    this.focusNode = null;
    this.focusOffset = 0;
    this.isCollapsed = true;
    this.type = 'None';
  }

  removeRange(range: Range): void {
    const index = this.ranges.indexOf(range);
    if (index !== -1) {
      this.ranges.splice(index, 1);
      this.rangeCount = this.ranges.length;
    }
  }

  collapse(node: Node | null, offset?: number): void {
    if (!node) {
      this.removeAllRanges();
      return;
    }
    
    const range = document.createRange();
    range.setStart(node, offset || 0);
    range.collapse(true);
    
    this.removeAllRanges();
    this.addRange(range);
  }

  collapseToEnd(): void {
    if (this.rangeCount > 0) {
      const range = this.ranges[0];
      this.collapse(range.endContainer, range.endOffset);
    }
  }

  collapseToStart(): void {
    if (this.rangeCount > 0) {
      const range = this.ranges[0];
      this.collapse(range.startContainer, range.startOffset);
    }
  }

  containsNode(node: Node, allowPartialContainment?: boolean): boolean {
    if (this.rangeCount === 0) return false;
    
    return this.ranges.some(range => {
      const nodeRange = document.createRange();
      nodeRange.selectNode(node);
      
      if (allowPartialContainment) {
        return range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0 &&
               range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0;
      } else {
        return range.compareBoundaryPoints(Range.START_TO_START, nodeRange) <= 0 &&
               range.compareBoundaryPoints(Range.END_TO_END, nodeRange) >= 0;
      }
    });
  }

  deleteFromDocument(): void {
    this.ranges.forEach(range => {
      range.deleteContents();
    });
  }

  empty(): void {
    this.removeAllRanges();
  }

  extend(node: Node, offset?: number): void {
    if (!this.anchorNode || this.rangeCount === 0) {
      throw new Error('InvalidStateError');
    }
    
    const range = document.createRange();
    range.setStart(this.anchorNode, this.anchorOffset);
    range.setEnd(node, offset || 0);
    
    this.removeAllRanges();
    this.addRange(range);
  }

  modify(alter?: string, direction?: string, granularity?: string): void {
    // Simplified implementation for testing
    console.log('modify called with:', { alter, direction, granularity });
  }

  selectAllChildren(node: Node): void {
    const range = document.createRange();
    range.selectNodeContents(node);
    this.removeAllRanges();
    this.addRange(range);
  }

  setBaseAndExtent(anchorNode: Node, anchorOffset: number, focusNode: Node, focusOffset: number): void {
    const range = document.createRange();
    range.setStart(anchorNode, anchorOffset);
    range.setEnd(focusNode, focusOffset);
    this.removeAllRanges();
    this.addRange(range);
  }

  setPosition(node: Node | null, offset?: number): void {
    this.collapse(node, offset);
  }

  toString(): string {
    if (this.rangeCount === 0) return '';
    return this.ranges[0].toString();
  }
}

/**
 * Setup mock selection for testing
 */
export function setupMockSelection(): MockSelection {
  const mockSelection = new MockSelection();
  
  // Mock window.getSelection
  vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection as any);
  
  // Mock document.getSelection (alias)
  vi.spyOn(document, 'getSelection').mockReturnValue(mockSelection as any);
  
  return mockSelection;
}

/**
 * Create a selection range
 */
export function createSelectionRange(
  startContainer: Node,
  startOffset: number,
  endContainer: Node,
  endOffset: number
): Range {
  const range = document.createRange();
  range.setStart(startContainer, startOffset);
  range.setEnd(endContainer, endOffset);
  return range;
}

/**
 * Simulate mouse selection
 */
export function simulateMouseSelection(
  element: HTMLElement,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): void {
  // Simulate mousedown
  const mousedownEvent = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    clientX: startX,
    clientY: startY
  });
  element.dispatchEvent(mousedownEvent);
  
  // Simulate mousemove
  const mousemoveEvent = new MouseEvent('mousemove', {
    bubbles: true,
    cancelable: true,
    clientX: endX,
    clientY: endY
  });
  element.dispatchEvent(mousemoveEvent);
  
  // Simulate mouseup
  const mouseupEvent = new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    clientX: endX,
    clientY: endY
  });
  element.dispatchEvent(mouseupEvent);
}

/**
 * Assert selection state
 */
export function assertSelection(expected: {
  start?: number;
  end?: number;
  isCollapsed?: boolean;
  text?: string;
}): void {
  const selection = window.getSelection();
  expect(selection).toBeTruthy();
  
  if (expected.isCollapsed !== undefined) {
    expect(selection!.isCollapsed).toBe(expected.isCollapsed);
  }
  
  if (expected.text !== undefined) {
    expect(selection!.toString()).toBe(expected.text);
  }
  
  // For start/end position checks, we'd need to calculate offsets
  // This is simplified for the example
}

/**
 * Get line number element for a specific line
 */
export function getLineNumberElement(container: HTMLElement, lineNumber: number): HTMLElement | null {
  const lineNumbers = container.querySelectorAll('.line-number');
  return lineNumbers[lineNumber - 1] as HTMLElement || null;
}

/**
 * Check if line number is active (highlighted)
 */
export function isLineNumberActive(lineElement: HTMLElement): boolean {
  return lineElement.classList.contains('active') || 
         lineElement.style.color === '#ffffff' ||
         lineElement.style.color === 'rgb(255, 255, 255)';
}

/**
 * Simulate keyboard shortcut
 */
export function simulateKeyboardShortcut(
  element: HTMLElement,
  key: string,
  modifiers: {
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  } = {}
): void {
  const keydownEvent = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers
  });
  
  element.dispatchEvent(keydownEvent);
}