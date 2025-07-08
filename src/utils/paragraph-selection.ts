/**
 * Paragraph Selection Handler - Manages Alt+Shift+Up/Down paragraph selection
 * Extends selection from cursor position to paragraph boundaries
 */

import { findBlockElement } from './selection-helpers';

interface ParagraphSelectionState {
  anchorBlock: HTMLElement | null;
  anchorOffset: number;
  anchorContainer: Node | null;
  isExtending: boolean;
}

// Track selection state for paragraph selection
let paragraphSelectionState: ParagraphSelectionState = {
  anchorBlock: null,
  anchorOffset: 0,
  anchorContainer: null,
  isExtending: false
};

/**
 * Handle Alt+Shift+Up/Down for paragraph selection
 */
export function handleAltShiftParagraphSelection(
  e: React.KeyboardEvent<HTMLDivElement>,
  editorRef: React.RefObject<HTMLDivElement>,
  onActiveLineChange?: (index: number) => void
) {
  const selection = window.getSelection();
  if (!selection || !editorRef.current) return;
  
  const blocks = Array.from(editorRef.current.querySelectorAll('[data-block-id]')) as HTMLElement[];
  if (blocks.length === 0) return;
  
  // Get current cursor position - use focus position for extending selections
  let currentBlock: HTMLElement | null = null;
  let currentOffset = 0;
  let currentContainer: Node | null = null;
  
  if (selection.rangeCount > 0) {
    // Use focusNode/focusOffset to get the actual cursor position
    // This is important when extending an existing selection
    currentBlock = findBlockElement(selection.focusNode!);
    currentContainer = selection.focusNode;
    currentOffset = selection.focusOffset;
  }
  
  // If no current block, find the focused block
  if (!currentBlock) {
    const activeBlock = editorRef.current.querySelector('[data-block-id]:focus') as HTMLElement;
    if (activeBlock) {
      currentBlock = activeBlock;
      currentContainer = activeBlock.firstChild || activeBlock;
      currentOffset = 0;
    } else {
      return;
    }
  }
  
  // Get the current index based on where the focus is
  const focusBlock = currentBlock;
  const currentIndex = parseInt(focusBlock.dataset.blockIndex || '0');
  
  // Initialize anchor if not extending
  if (!paragraphSelectionState.isExtending || !paragraphSelectionState.anchorBlock) {
    paragraphSelectionState = {
      anchorBlock: currentBlock,
      anchorContainer: currentContainer,
      anchorOffset: currentOffset,
      isExtending: true
    };
  }
  
  const newRange = document.createRange();
  
  if (e.key === 'ArrowUp') {
    // Handle selection when moving up
    const targetIndex = Math.max(0, currentIndex - 1);
    const targetBlock = blocks[targetIndex];
    if (!targetBlock) return;
    
    // Get the start of the target block (where we're moving to)
    const targetStart = getBlockStart(targetBlock);
    
    // Get anchor block index
    const anchorIndex = parseInt(paragraphSelectionState.anchorBlock?.dataset.blockIndex || '0');
    
    if (targetIndex === currentIndex) {
      // Already at the first block, select from start to anchor if anchor is not at start
      if (anchorIndex > 0 || paragraphSelectionState.anchorOffset > 0) {
        newRange.setStart(targetStart.node, targetStart.offset);
        newRange.setEnd(paragraphSelectionState.anchorContainer!, paragraphSelectionState.anchorOffset);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } else {
      // Moving to a different block
      if (anchorIndex <= targetIndex) {
        // Anchor is above or at the target - extend from anchor to start of target
        newRange.setStart(paragraphSelectionState.anchorContainer!, paragraphSelectionState.anchorOffset);
        newRange.setEnd(targetStart.node, targetStart.offset);
      } else {
        // Anchor is below target - extend from start of target to anchor
        newRange.setStart(targetStart.node, targetStart.offset);
        newRange.setEnd(paragraphSelectionState.anchorContainer!, paragraphSelectionState.anchorOffset);
      }
      
      selection.removeAllRanges();
      selection.addRange(newRange);
      onActiveLineChange?.(targetIndex);
    }
  } else if (e.key === 'ArrowDown') {
    if (currentIndex < blocks.length - 1) {
      const targetBlock = blocks[currentIndex + 1];
      if (!targetBlock) return;
      
      // Set range from cursor position to end of target paragraph
      const targetEnd = getBlockEnd(targetBlock);
      
      // Always extend from original anchor
      const anchorIsAbove = parseInt(paragraphSelectionState.anchorBlock?.dataset.blockIndex || '0') < currentIndex + 1;
      
      if (anchorIsAbove) {
        // Selecting downward from anchor
        newRange.setStart(paragraphSelectionState.anchorContainer!, paragraphSelectionState.anchorOffset);
        newRange.setEnd(targetEnd.node, targetEnd.offset);
      } else {
        // Anchor is below or at target
        newRange.setStart(getBlockStart(currentBlock).node, getBlockStart(currentBlock).offset);
        newRange.setEnd(paragraphSelectionState.anchorContainer!, paragraphSelectionState.anchorOffset);
      }
      
      selection.removeAllRanges();
      selection.addRange(newRange);
      onActiveLineChange?.(currentIndex + 1);
    }
  }
}

/**
 * Clear paragraph selection state
 */
export function clearParagraphSelectionState(): void {
  paragraphSelectionState = {
    anchorBlock: null,
    anchorOffset: 0,
    anchorContainer: null,
    isExtending: false
  };
}

/**
 * Get the start position of a block
 */
function getBlockStart(block: HTMLElement): { node: Node; offset: number } {
  if (block.textContent === '') {
    const textNode = document.createTextNode('');
    block.appendChild(textNode);
    return { node: textNode, offset: 0 };
  }
  
  const walker = document.createTreeWalker(
    block,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  const firstTextNode = walker.firstChild() as Text;
  if (firstTextNode) {
    return { node: firstTextNode, offset: 0 };
  }
  
  return { node: block, offset: 0 };
}

/**
 * Get the end position of a block
 */
function getBlockEnd(block: HTMLElement): { node: Node; offset: number } {
  if (block.textContent === '') {
    const textNode = document.createTextNode('');
    block.appendChild(textNode);
    return { node: textNode, offset: 0 };
  }
  
  let lastTextNode: Text | null = null;
  
  const findLastTextNode = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      lastTextNode = node as Text;
    } else if (node.hasChildNodes()) {
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        findLastTextNode(node.childNodes[i]);
        if (lastTextNode) break;
      }
    }
  };
  
  findLastTextNode(block);
  
  if (lastTextNode) {
    return { node: lastTextNode, offset: lastTextNode.textContent?.length || 0 };
  }
  
  return { node: block, offset: block.childNodes.length };
}