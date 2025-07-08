/**
 * Utilities for detecting text formatting at cursor position
 * Used to update toolbar button states based on current cursor location
 */
import type { ContentBlock, TextFormatting } from '@/types/document.types';

interface ActiveFormats {
  isBold: boolean;
  isHighlighted: boolean;
  highlightColor?: string;
  isMinimized: boolean;
  headingLevel: number;
}

/**
 * Get the current formatting at cursor position
 * @param blocks - Content blocks array
 * @param blockIndex - Index of the block containing cursor
 * @param cursorOffset - Character offset within the block
 * @returns Active formatting states at cursor position
 */
export function getFormatsAtCursor(
  blocks: ContentBlock[],
  blockIndex: number,
  cursorOffset: number
): ActiveFormats {
  const result: ActiveFormats = {
    isBold: false,
    isHighlighted: false,
    isMinimized: false,
    headingLevel: 0
  };

  // Validate inputs
  if (!blocks || blockIndex < 0 || blockIndex >= blocks.length) {
    return result;
  }

  const block = blocks[blockIndex];
  
  // Check block type for heading
  if (block.type === 'heading' || block.type?.startsWith('heading')) {
    // Extract heading level from type (e.g., 'heading2' -> 2)
    const match = block.type.match(/heading(\d)/);
    result.headingLevel = match ? parseInt(match[1]) : 1;
  }

  // Check formatting spans at cursor position
  if (block.formatting && Array.isArray(block.formatting)) {
    block.formatting.forEach((format: TextFormatting) => {
      // Check if cursor is within this formatting span
      if (cursorOffset >= format.start && cursorOffset <= format.end) {
        switch (format.type) {
          case 'bold':
            result.isBold = true;
            break;
          case 'highlight':
            result.isHighlighted = true;
            result.highlightColor = format.color;
            break;
          case 'minimize':
            result.isMinimized = true;
            break;
        }
      }
    });
  }

  return result;
}

/**
 * Get cursor position information from the current selection
 * @returns Object with blockIndex and offset, or null if no selection
 */
export function getCursorInfo(): { blockIndex: number; offset: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const container = range.startContainer;
  
  // Find the block element
  let blockElement: HTMLElement | null = null;
  let node: Node | null = container;
  
  while (node && node !== document.body) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.dataset?.blockId) {
        blockElement = element;
        break;
      }
    }
    node = node.parentNode;
  }

  if (!blockElement) return null;

  const blockIndex = parseInt(blockElement.dataset.blockIndex || '0');
  
  // Calculate offset within the block
  const blockRange = document.createRange();
  blockRange.selectNodeContents(blockElement);
  blockRange.setEnd(range.startContainer, range.startOffset);
  const offset = blockRange.toString().length;

  return { blockIndex, offset };
}

/**
 * Check if the current selection spans multiple blocks
 * @returns true if selection crosses block boundaries
 */
export function isMultiBlockSelection(): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return false;
  }

  const range = selection.getRangeAt(0);
  
  // Find start and end block elements
  let startBlock: HTMLElement | null = null;
  let endBlock: HTMLElement | null = null;
  
  // Find start block
  let node: Node | null = range.startContainer;
  while (node && node !== document.body) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.dataset?.blockId) {
        startBlock = element;
        break;
      }
    }
    node = node.parentNode;
  }
  
  // Find end block
  node = range.endContainer;
  while (node && node !== document.body) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.dataset?.blockId) {
        endBlock = element;
        break;
      }
    }
    node = node.parentNode;
  }

  // If blocks are different, it's a multi-block selection
  return startBlock !== endBlock;
}