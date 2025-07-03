/**
 * Selection Helper Functions - Utilities for working with DOM selections
 */

/**
 * Find the block element containing a node
 */
export function findBlockElement(node: Node): HTMLElement | null {
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
 * Get text offset within a block element
 */
export function getTextOffset(block: HTMLElement, node: Node, offset: number): number {
  let textOffset = 0;
  let found = false;

  const traverse = (n: Node): void => {
    if (found) return;

    if (n === node) {
      textOffset += offset;
      found = true;
      return;
    }

    if (n.nodeType === Node.TEXT_NODE) {
      textOffset += n.textContent?.length || 0;
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      for (const child of Array.from(n.childNodes)) {
        traverse(child);
        if (found) break;
      }
    }
  };

  traverse(block);
  return textOffset;
}

/**
 * Find node and offset at a specific text position
 */
export function findNodeAtOffset(block: HTMLElement, targetOffset: number): { node: Node; offset: number } | null {
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