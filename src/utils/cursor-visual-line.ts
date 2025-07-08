/**
 * Cursor Visual Line - Determines which visual line the cursor is on within a wrapped block
 * Uses Range API for accurate position detection
 */

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
 * Get unique Y positions from text nodes
 */
function getLineYPositions(textNodes: Text[]): number[] {
  const lineYPositions: number[] = [];
  const seenY = new Set<number>();
  
  textNodes.forEach(textNode => {
    const text = textNode.nodeValue || '';
    for (let i = 0; i < text.length; i++) {
      if (text[i].trim() === '') continue;
      
      const testRange = document.createRange();
      testRange.setStart(textNode, i);
      testRange.setEnd(textNode, Math.min(i + 1, text.length));
      
      const rect = testRange.getBoundingClientRect();
      if (rect.height > 0) {
        const y = Math.round(rect.top);
        if (!seenY.has(y)) {
          seenY.add(y);
          lineYPositions.push(y);
        }
      }
    }
  });
  
  return lineYPositions.sort((a, b) => a - b);
}

/**
 * Get the visual line number where the cursor is positioned within a block
 */
export function getCurrentCursorVisualLine(blockElement: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;
  
  const range = selection.getRangeAt(0);
  
  // Check if cursor is in this block
  if (!blockElement.contains(range.commonAncestorContainer)) {
    return 0;
  }
  
  try {
    const textNodes = getTextNodes(blockElement);
    if (textNodes.length === 0) return 0;
    
    const lineYPositions = getLineYPositions(textNodes);
    if (lineYPositions.length === 0) return 0;
    
    // Get cursor position
    const cursorRange = range.cloneRange();
    cursorRange.collapse(true);
    
    // Handle empty selection by inserting a zero-width space temporarily
    const tempNode = document.createTextNode('\u200B');
    cursorRange.insertNode(tempNode);
    const cursorRect = tempNode.getBoundingClientRect();
    const cursorY = Math.round(cursorRect.top);
    tempNode.remove();
    
    // Find which line the cursor is on (return 0-based index)
    let visualLine = 0;
    for (let i = 0; i < lineYPositions.length; i++) {
      if (cursorY >= lineYPositions[i]) {
        visualLine = i;
      } else {
        break;
      }
    }
    
    return Math.max(0, Math.min(visualLine, lineYPositions.length - 1));
    
  } catch (error) {
    console.warn('Failed to calculate cursor visual line:', error);
    return 0;
  }
}

/**
 * Get the total number of visual lines in a block accounting for word wrap
 */
export function getBlockVisualLineCount(blockElement: HTMLElement): number {
  if (!blockElement) return 1;
  
  try {
    const textNodes = getTextNodes(blockElement);
    if (textNodes.length === 0) return 1;
    
    const lineYPositions = new Set<number>();
    
    textNodes.forEach(textNode => {
      const text = textNode.nodeValue || '';
      for (let i = 0; i < text.length; i++) {
        if (text[i].trim() === '') continue;
        
        const range = document.createRange();
        range.setStart(textNode, i);
        range.setEnd(textNode, Math.min(i + 1, text.length));
        
        const rect = range.getBoundingClientRect();
        if (rect.height > 0) {
          lineYPositions.add(Math.round(rect.top));
        }
      }
    });
    
    return Math.max(1, lineYPositions.size);
    
  } catch (error) {
    console.warn('Failed to calculate block visual lines:', error);
    return 1;
  }
}

/**
 * Check if cursor is at the start of a visual line
 */
export function isCursorAtVisualLineStart(blockElement: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  
  const range = selection.getRangeAt(0);
  if (!blockElement.contains(range.commonAncestorContainer)) return false;
  
  try {
    // Check if we're at the very start of the block
    const blockStart = document.createRange();
    blockStart.selectNodeContents(blockElement);
    blockStart.collapse(true);
    
    if (range.compareBoundaryPoints(Range.START_TO_START, blockStart) === 0) {
      return true;
    }
    
    // Get current cursor Y position
    const cursorRange = range.cloneRange();
    cursorRange.collapse(true);
    const tempNode = document.createTextNode('\u200B');
    cursorRange.insertNode(tempNode);
    const cursorY = Math.round(tempNode.getBoundingClientRect().top);
    tempNode.remove();
    
    // Check if there's any content to the left on the same line
    const textNode = range.startContainer;
    if (textNode.nodeType === Node.TEXT_NODE) {
      const offset = range.startOffset;
      
      // Check characters to the left
      for (let i = offset - 1; i >= 0; i--) {
        const testRange = document.createRange();
        testRange.setStart(textNode, i);
        testRange.setEnd(textNode, i + 1);
        
        const rect = testRange.getBoundingClientRect();
        if (rect.height > 0 && Math.round(rect.top) === cursorY) {
          return false; // Found content on the same line to the left
        }
      }
    }
    
    return true;
    
  } catch (error) {
    console.warn('Failed to check visual line start:', error);
    return false;
  }
}