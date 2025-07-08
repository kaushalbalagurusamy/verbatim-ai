/**
 * Cursor Column Tracker - Preserves horizontal cursor position during vertical navigation
 * Tracks character offset within visual lines for consistent cursor placement
 */

import { getCursorPosition } from './cursor-manager';

// Store the last known column position for vertical navigation
let lastColumnPosition: number | null = null;
let lastXCoordinate: number | null = null;

/**
 * Get the current cursor's character offset within its visual line
 */
export function getCurrentColumnOffset(blockElement: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;
  
  const range = selection.getRangeAt(0);
  if (!blockElement.contains(range.commonAncestorContainer)) return 0;
  
  try {
    // Clone range to avoid modifying selection
    const testRange = range.cloneRange();
    testRange.collapse(true);
    
    // Get the X coordinate of the cursor
    const tempNode = document.createTextNode('\u200B');
    testRange.insertNode(tempNode);
    const cursorRect = tempNode.getBoundingClientRect();
    const cursorX = cursorRect.left;
    const cursorY = Math.round(cursorRect.top);
    tempNode.remove();
    
    // Store X coordinate for later use
    lastXCoordinate = cursorX;
    
    // Count characters from the start of the visual line
    let columnOffset = 0;
    const textContent = blockElement.textContent || '';
    
    // Create a range from block start to cursor
    const startToCaretRange = document.createRange();
    startToCaretRange.setStart(blockElement, 0);
    startToCaretRange.setEnd(range.startContainer, range.startOffset);
    
    const textBeforeCursor = startToCaretRange.toString();
    
    // Find the last line break or start of text on the same visual line
    let lineStartOffset = 0;
    
    // Check each character position to find where the current line starts
    const textNodes = getTextNodes(blockElement);
    let accumulatedLength = 0;
    
    for (const textNode of textNodes) {
      const nodeText = textNode.textContent || '';
      
      for (let i = 0; i < nodeText.length; i++) {
        const charRange = document.createRange();
        charRange.setStart(textNode, i);
        charRange.setEnd(textNode, Math.min(i + 1, nodeText.length));
        
        const charRect = charRange.getBoundingClientRect();
        const charY = Math.round(charRect.top);
        
        // If we're on the cursor's line
        if (charY === cursorY) {
          // Update line start if this is the first char on this line
          if (accumulatedLength + i > lineStartOffset && charY === cursorY) {
            const prevCharRange = document.createRange();
            if (i > 0) {
              prevCharRange.setStart(textNode, i - 1);
              prevCharRange.setEnd(textNode, i);
            } else if (accumulatedLength > 0) {
              // Check previous text node
              continue;
            }
            
            const prevRect = prevCharRange.getBoundingClientRect();
            if (i === 0 || Math.round(prevRect.top) < cursorY) {
              lineStartOffset = accumulatedLength + i;
            }
          }
        }
        
        if (accumulatedLength + i >= textBeforeCursor.length) {
          break;
        }
      }
      
      accumulatedLength += nodeText.length;
      if (accumulatedLength >= textBeforeCursor.length) {
        break;
      }
    }
    
    columnOffset = textBeforeCursor.length - lineStartOffset;
    return Math.max(0, columnOffset);
    
  } catch (error) {
    console.warn('Failed to get column offset:', error);
    return 0;
  }
}

/**
 * Store the current column position for later restoration
 */
export function saveColumnPosition(blockElement: HTMLElement): void {
  lastColumnPosition = getCurrentColumnOffset(blockElement);
}

/**
 * Get the last saved column position
 */
export function getSavedColumnPosition(): number | null {
  return lastColumnPosition;
}

/**
 * Get the last saved X coordinate
 */
export function getSavedXCoordinate(): number | null {
  return lastXCoordinate;
}

/**
 * Clear saved column position (e.g., when user clicks or moves horizontally)
 */
export function clearColumnPosition(): void {
  lastColumnPosition = null;
  lastXCoordinate = null;
}

/**
 * Restore cursor to a specific column offset in a block
 */
export function restoreCursorToColumn(
  blockElement: HTMLElement, 
  targetColumn: number,
  targetX?: number
): void {
  const selection = window.getSelection();
  if (!selection) return;
  
  try {
    // If we have a target X coordinate, try to use it for more accurate positioning
    if (targetX !== undefined) {
      const position = findPositionAtX(blockElement, targetX);
      if (position) {
        const range = document.createRange();
        range.setStart(position.node, position.offset);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
    }
    
    // For wrapped text, we need to find the position on the first visual line
    // that matches our target column offset
    const textNodes = getTextNodes(blockElement);
    if (textNodes.length === 0) {
      blockElement.focus();
      return;
    }
    
    // Get the Y position of the first visual line in this block
    let firstLineY: number | null = null;
    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      for (let i = 0; i < text.length; i++) {
        if (text[i].trim() === '') continue;
        
        const range = document.createRange();
        range.setStart(textNode, i);
        range.setEnd(textNode, Math.min(i + 1, text.length));
        
        const rect = range.getBoundingClientRect();
        if (rect.height > 0) {
          firstLineY = Math.round(rect.top);
          break;
        }
      }
      if (firstLineY !== null) break;
    }
    
    // Find position on first line at target column
    let currentColumn = 0;
    let found = false;
    
    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      
      for (let i = 0; i < text.length; i++) {
        // Check if this character is on the first line
        const range = document.createRange();
        range.setStart(textNode, i);
        range.setEnd(textNode, Math.min(i + 1, text.length));
        
        const rect = range.getBoundingClientRect();
        const charY = Math.round(rect.top);
        
        // If we've moved past the first line, stop
        if (firstLineY !== null && charY > firstLineY) {
          // Place cursor at end of first line
          if (i > 0) {
            const endRange = document.createRange();
            endRange.setStart(textNode, i - 1);
            endRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(endRange);
            return;
          }
          break;
        }
        
        if (currentColumn >= targetColumn) {
          const targetRange = document.createRange();
          targetRange.setStart(textNode, i);
          targetRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(targetRange);
          found = true;
          break;
        }
        
        currentColumn++;
      }
      
      if (found) break;
    }
    
    // If we didn't find the exact position, place at end of first line or block
    if (!found) {
      const textContent = blockElement.textContent || '';
      const targetOffset = Math.min(targetColumn, textContent.length);
      
      const position = findNodeAtOffset(blockElement, targetOffset);
      if (position) {
        const range = document.createRange();
        range.setStart(position.node, position.offset);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    
  } catch (error) {
    console.warn('Failed to restore cursor position:', error);
    // Fallback: place cursor at start of block
    blockElement.focus();
  }
}

/**
 * Find the position in a block that's closest to a given X coordinate
 */
function findPositionAtX(blockElement: HTMLElement, targetX: number): { node: Node; offset: number } | null {
  const textNodes = getTextNodes(blockElement);
  if (textNodes.length === 0) return null;
  
  let closestPosition: { node: Node; offset: number; distance: number } | null = null;
  
  for (const textNode of textNodes) {
    const text = textNode.textContent || '';
    
    for (let i = 0; i <= text.length; i++) {
      const range = document.createRange();
      range.setStart(textNode, i);
      range.collapse(true);
      
      const tempNode = document.createTextNode('\u200B');
      range.insertNode(tempNode);
      const rect = tempNode.getBoundingClientRect();
      const x = rect.left;
      tempNode.remove();
      
      const distance = Math.abs(x - targetX);
      
      if (!closestPosition || distance < closestPosition.distance) {
        closestPosition = { node: textNode, offset: i, distance };
      }
      
      // If we've passed the target X, we can stop
      if (x > targetX && closestPosition.distance < distance) {
        break;
      }
    }
  }
  
  return closestPosition ? { node: closestPosition.node, offset: closestPosition.offset } : null;
}

/**
 * Get all text nodes within an element
 */
function getTextNodes(element: Node): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let node = walker.nextNode();
  while (node) {
    textNodes.push(node as Text);
    node = walker.nextNode();
  }
  
  return textNodes;
}

/**
 * Find node and offset at a specific text position
 */
function findNodeAtOffset(block: HTMLElement, targetOffset: number): { node: Node; offset: number } | null {
  let currentOffset = 0;
  
  function traverse(node: Node): { node: Node; offset: number } | null {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length || 0;
      if (currentOffset + length >= targetOffset) {
        return {
          node,
          offset: targetOffset - currentOffset
        };
      }
      currentOffset += length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of Array.from(node.childNodes)) {
        const result = traverse(child);
        if (result) return result;
      }
    }
    return null;
  }
  
  const result = traverse(block);
  
  // If not found, return the last position
  if (!result) {
    const lastText = findLastTextNode(block);
    if (lastText) {
      return {
        node: lastText,
        offset: lastText.textContent?.length || 0
      };
    }
    return { node: block, offset: 0 };
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