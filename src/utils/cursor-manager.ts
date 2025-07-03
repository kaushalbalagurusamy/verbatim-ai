/**
 * Cursor Manager - Utilities for saving and restoring cursor position
 * Handles contentEditable cursor management during DOM updates
 */

export interface CursorPosition {
  blockId: string;
  offset: number;
  length: number;
}

/**
 * Get current cursor position in contentEditable
 */
export function getCursorPosition(): CursorPosition | null {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  const blockElement = findBlockElement(range.startContainer);
  
  if (!blockElement) return null;

  const blockId = blockElement.dataset.blockId || '';
  const offset = calculateOffset(blockElement, range.startContainer, range.startOffset);
  const length = range.toString().length;

  return { blockId, offset, length };
}

/**
 * Restore cursor position after DOM update
 */
export function restoreCursorPosition(position: CursorPosition): void {
  const blockElement = document.querySelector(`[data-block-id="${position.blockId}"]`);
  if (!blockElement) return;

  try {
    const { node, offset } = findNodeAtOffset(blockElement, position.offset);
    if (!node) return;

    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.setStart(node, offset);
    
    if (position.length > 0) {
      const { node: endNode, offset: endOffset } = findNodeAtOffset(
        blockElement, 
        position.offset + position.length
      );
      if (endNode) {
        range.setEnd(endNode, endOffset);
      }
    } else {
      range.collapse(true);
    }

    selection.removeAllRanges();
    selection.addRange(range);
  } catch (e) {
    console.warn('Failed to restore cursor position:', e);
  }
}

/**
 * Find the block element containing a node
 */
function findBlockElement(node: Node): HTMLElement | null {
  let current: Node | null = node;
  
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current as HTMLElement;
      if (element.dataset?.blockId) {
        return element;
      }
    }
    current = current.parentNode;
  }
  
  return null;
}

/**
 * Calculate text offset from block start to a specific position
 */
function calculateOffset(block: HTMLElement, targetNode: Node, targetOffset: number): number {
  let offset = 0;
  let found = false;

  function traverse(node: Node): void {
    if (found) return;

    if (node === targetNode) {
      offset += targetOffset;
      found = true;
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      offset += node.textContent?.length || 0;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of Array.from(node.childNodes)) {
        traverse(child);
        if (found) break;
      }
    }
  }

  traverse(block);
  return offset;
}

/**
 * Find node and offset at a specific text position
 */
function findNodeAtOffset(block: HTMLElement, targetOffset: number): { node: Node; offset: number } {
  let currentOffset = 0;
  let result: { node: Node; offset: number } | null = null;

  function traverse(node: Node): boolean {
    if (result) return true;

    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length || 0;
      if (currentOffset + length >= targetOffset) {
        result = {
          node,
          offset: targetOffset - currentOffset
        };
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
  
  // If not found, return the last position
  if (!result) {
    const lastText = findLastTextNode(block);
    if (lastText) {
      result = {
        node: lastText,
        offset: lastText.textContent?.length || 0
      };
    } else {
      result = { node: block, offset: 0 };
    }
  }

  return result;
}

/**
 * Find the last text node in an element
 */
function findLastTextNode(element: HTMLElement): Text | null {
  let lastText: Text | null = null;

  function traverse(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      lastText = node as Text;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of Array.from(node.childNodes)) {
        traverse(child);
      }
    }
  }

  traverse(element);
  return lastText;
}

/**
 * Check if cursor is at the start of a block
 */
export function isCursorAtBlockStart(): boolean {
  const position = getCursorPosition();
  return position ? position.offset === 0 : false;
}

/**
 * Check if cursor is at the end of a block
 */
export function isCursorAtBlockEnd(): boolean {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return false;

  const range = selection.getRangeAt(0);
  const blockElement = findBlockElement(range.endContainer);
  
  if (!blockElement) return false;

  const blockText = blockElement.textContent || '';
  const cursorOffset = calculateOffset(blockElement, range.endContainer, range.endOffset);
  
  return cursorOffset === blockText.length;
}