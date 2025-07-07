/**
 * Editor Event Handlers - Keyboard and selection handling logic
 * Extracted to keep main Editor component under 200 lines
 */
import type { ContentBlock, FormattingType, HighlightColor } from '@/types/document.types';
import { getCursorPosition, isCursorAtBlockStart, isCursorAtBlockEnd } from '@/utils/cursor-manager';
import { findBlockElement } from '@/utils/selection-helpers';

export function handleEnterKey(
  e: React.KeyboardEvent<HTMLDivElement>,
  contentRef: React.MutableRefObject<ContentBlock[]>,
  onChange: (content: ContentBlock[]) => void,
  editorRef: React.RefObject<HTMLDivElement>,
  onActiveLineChange?: (index: number) => void
) {
  const target = e.target as HTMLElement;
  const blockElement = target.closest('[data-block-id]') as HTMLElement;
  if (!blockElement) return;

  const blockIndex = parseInt(blockElement.dataset.blockIndex || '0');
  const cursorPos = getCursorPosition();
  const newBlock: ContentBlock = {
    id: `block-${Date.now()}`,
    type: 'paragraph',
    content: '',
    formatting: []
  };
  
  // Split content at cursor if in middle of text
  if (cursorPos && cursorPos.offset < (blockElement.textContent?.length || 0)) {
    const currentBlock = contentRef.current[blockIndex];
    const beforeCursor = currentBlock.content.substring(0, cursorPos.offset);
    const afterCursor = currentBlock.content.substring(cursorPos.offset);
    
    const newContent = [...contentRef.current];
    newContent[blockIndex] = { ...currentBlock, content: beforeCursor };
    newContent.splice(blockIndex + 1, 0, { ...newBlock, content: afterCursor });
    onChange(newContent);
  } else {
    const newContent = [...contentRef.current];
    newContent.splice(blockIndex + 1, 0, newBlock);
    onChange(newContent);
  }
  
  // Focus new block after render
  setTimeout(() => {
    const newBlockEl = editorRef.current?.querySelector(
      `[data-block-id="${newBlock.id}"]`
    ) as HTMLElement;
    if (newBlockEl) {
      newBlockEl.focus();
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.setStart(newBlockEl, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      // Update active line index to the new block
      const newBlockIndex = parseInt(newBlockEl.dataset.blockIndex || '0');
      onActiveLineChange?.(newBlockIndex);
    }
  }, 10);
}

export function handleBackspaceAtStart(
  e: React.KeyboardEvent<HTMLDivElement>,
  contentRef: React.MutableRefObject<ContentBlock[]>,
  onChange: (content: ContentBlock[]) => void,
  editorRef: React.RefObject<HTMLDivElement>,
  onActiveLineChange?: (index: number) => void
) {
  const target = e.target as HTMLElement;
  const blockElement = target.closest('[data-block-id]') as HTMLElement;
  if (!blockElement) return;

  const blockIndex = parseInt(blockElement.dataset.blockIndex || '0');
  if (blockIndex > 0 && contentRef.current.length > 1) {
    e.preventDefault();
    
    const currentBlock = contentRef.current[blockIndex];
    const prevBlock = contentRef.current[blockIndex - 1];
    const mergedContent = prevBlock.content + currentBlock.content;
    const newContent = [...contentRef.current];
    newContent[blockIndex - 1] = { ...prevBlock, content: mergedContent };
    newContent.splice(blockIndex, 1);
    onChange(newContent);
    
    // Focus previous block at merge point
    setTimeout(() => {
      const prevBlockEl = editorRef.current?.querySelector(
        `[data-block-id="${prevBlock.id}"]`
      ) as HTMLElement;
      if (prevBlockEl) {
        prevBlockEl.focus();
        const selection = window.getSelection();
        if (selection) {
          const textNode = prevBlockEl.firstChild || prevBlockEl;
          const range = document.createRange();
          const offset = Math.min(prevBlock.content.length, textNode.textContent?.length || 0);
          range.setStart(textNode, offset);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        // Update active line index to the previous block
        onActiveLineChange?.(blockIndex - 1);
      }
    }, 10);
  }
}

export function handleKeyDown(
  e: React.KeyboardEvent<HTMLDivElement>,
  contentRef: React.MutableRefObject<ContentBlock[]>,
  onChange: (content: ContentBlock[]) => void,
  editorRef: React.RefObject<HTMLDivElement>,
  applyFormat?: (type: FormattingType, color?: HighlightColor) => void,
  onActiveLineChange?: (index: number) => void,
  onUndo?: () => void,
  onRedo?: () => void
) {
  // Handle undo/redo shortcuts first
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      onRedo?.();
    } else {
      onUndo?.();
    }
    return;
  }
  
  // Handle formatting shortcuts
  if ((e.metaKey || e.ctrlKey) && applyFormat) {
    switch (e.key.toLowerCase()) {
      case 'b':
        e.preventDefault();
        applyFormat('bold');
        return;
      case 'h':
        e.preventDefault();
        applyFormat('highlight');
        return;
      case 'm':
        e.preventDefault();
        applyFormat('minimize');
        return;
      case 'c':
        if (e.shiftKey) {
          e.preventDefault();
          applyFormat('clear');
        }
        return;
    }
  }
  
  // Handle word selection with Option/Alt + Shift + Arrow
  if (e.altKey && e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault();
    const selection = window.getSelection();
    if (!selection) return;
    
    // Use the browser's built-in word selection
    const direction = e.key === 'ArrowLeft' ? 'backward' : 'forward';
    const granularity = 'word';
    
    // Modify selection by word
    selection.modify('extend', direction, granularity);
    return;
  }
  
  // Handle paragraph selection with Cmd/Ctrl + Shift + Up/Down
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault();
    handleParagraphSelection(e, editorRef, contentRef, onActiveLineChange);
    return;
  }
  
  // Handle regular editing shortcuts
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleEnterKey(e, contentRef, onChange, editorRef, onActiveLineChange);
  } else if (e.key === 'Backspace' && isCursorAtBlockStart()) {
    handleBackspaceAtStart(e, contentRef, onChange, editorRef, onActiveLineChange);
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    // Handle vertical navigation between blocks
    const target = e.target as HTMLElement;
    const blockElement = target.closest('[data-block-id]') as HTMLElement;
    if (!blockElement || !editorRef.current) return;
    
    const blockIndex = parseInt(blockElement.dataset.blockIndex || '0');
    const blocks = Array.from(editorRef.current.querySelectorAll('[data-block-id]')) as HTMLElement[];
    
    if (e.key === 'ArrowUp' && blockIndex > 0) {
      // Move to previous block
      const prevBlock = blocks[blockIndex - 1];
      if (prevBlock) {
        e.preventDefault();
        prevBlock.focus();
        // Place cursor at end of previous block
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          const textNode = prevBlock.lastChild || prevBlock;
          range.selectNodeContents(textNode);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        onActiveLineChange?.(blockIndex - 1);
      }
    } else if (e.key === 'ArrowDown' && blockIndex < blocks.length - 1) {
      // Move to next block
      const nextBlock = blocks[blockIndex + 1];
      if (nextBlock) {
        e.preventDefault();
        nextBlock.focus();
        // Place cursor at beginning of next block
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.setStart(nextBlock, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        onActiveLineChange?.(blockIndex + 1);
      }
    }
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    // Handle horizontal navigation at block boundaries
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const blockElement = range.startContainer.parentElement?.closest('[data-block-id]') as HTMLElement;
    if (!blockElement || !editorRef.current) return;
    
    const blockIndex = parseInt(blockElement.dataset.blockIndex || '0');
    const blocks = Array.from(editorRef.current.querySelectorAll('[data-block-id]')) as HTMLElement[];
    
    // Check if cursor is at the beginning or end of block
    const cursorAtStart = isCursorAtBlockStart();
    const cursorAtEnd = isCursorAtBlockEnd();
    
    if (e.key === 'ArrowLeft' && cursorAtStart && blockIndex > 0) {
      // Move to end of previous block
      e.preventDefault();
      const prevBlock = blocks[blockIndex - 1];
      if (prevBlock) {
        prevBlock.focus();
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          const textNode = prevBlock.lastChild || prevBlock;
          range.selectNodeContents(textNode);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        onActiveLineChange?.(blockIndex - 1);
      }
    } else if (e.key === 'ArrowRight' && cursorAtEnd && blockIndex < blocks.length - 1) {
      // Move to beginning of next block
      e.preventDefault();
      const nextBlock = blocks[blockIndex + 1];
      if (nextBlock) {
        nextBlock.focus();
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.setStart(nextBlock, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        onActiveLineChange?.(blockIndex + 1);
      }
    }
  }
}

export function handleParagraphSelection(
  e: React.KeyboardEvent<HTMLDivElement>,
  editorRef: React.RefObject<HTMLDivElement>,
  contentRef: React.MutableRefObject<ContentBlock[]>,
  onActiveLineChange?: (index: number) => void
) {
  const selection = window.getSelection();
  if (!selection || !editorRef.current || selection.rangeCount === 0) return;
  
  const range = selection.getRangeAt(0);
  const blocks = Array.from(editorRef.current.querySelectorAll('[data-block-id]')) as HTMLElement[];
  
  // Use proper block detection for both anchor and focus
  const anchorBlock = findBlockElement(range.startContainer);
  const focusBlock = findBlockElement(range.endContainer);
  
  if (!focusBlock) return;
  
  const focusIndex = parseInt(focusBlock.dataset.blockIndex || '0');
  
  // Determine if we're extending or creating a new selection
  const isCollapsed = range.collapsed;
  const isExtending = !isCollapsed;
  
  if (e.key === 'ArrowUp') {
    if (focusIndex > 0) {
      const targetBlock = blocks[focusIndex - 1];
      if (!targetBlock) return;
      
      const newRange = document.createRange();
      
      if (isExtending) {
        // Extend existing selection
        newRange.setStart(range.startContainer, range.startOffset);
        newRange.setEnd(targetBlock, 0);
      } else {
        // Create new selection from current position to start of previous block
        newRange.setStart(targetBlock, 0);
        newRange.setEnd(range.endContainer, range.endOffset);
      }
      
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      // Update active line to the focus block (where cursor visually is)
      onActiveLineChange?.(focusIndex - 1);
    }
  } else if (e.key === 'ArrowDown') {
    if (focusIndex < blocks.length - 1) {
      const targetBlock = blocks[focusIndex + 1];
      if (!targetBlock) return;
      
      const newRange = document.createRange();
      
      // Find the last text node in the target block
      let lastNode: Node = targetBlock;
      let lastOffset = 0;
      
      // Traverse to find the actual last text position
      const findLastPosition = (node: Node): void => {
        if (node.nodeType === Node.TEXT_NODE) {
          lastNode = node;
          lastOffset = node.textContent?.length || 0;
        } else if (node.hasChildNodes()) {
          for (let i = node.childNodes.length - 1; i >= 0; i--) {
            findLastPosition(node.childNodes[i]);
            if (lastNode !== targetBlock) break;
          }
        }
      };
      
      findLastPosition(targetBlock);
      
      if (isExtending) {
        // Extend existing selection
        newRange.setStart(range.startContainer, range.startOffset);
        newRange.setEnd(lastNode, lastOffset);
      } else {
        // Create new selection from current position to end of next block
        newRange.setStart(range.startContainer, range.startOffset);
        newRange.setEnd(lastNode, lastOffset);
      }
      
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      // Update active line to the focus block
      onActiveLineChange?.(focusIndex + 1);
    }
  }
}

export function handlePaste(
  e: React.ClipboardEvent<HTMLDivElement>,
  contentRef: React.MutableRefObject<ContentBlock[]>,
  onChange: (content: ContentBlock[]) => void,
  editorRef: React.RefObject<HTMLDivElement>,
  onActiveLineChange?: (index: number) => void
) {
  e.preventDefault();
  
  // Get the pasted text
  const pastedText = e.clipboardData.getData('text/plain');
  if (!pastedText) return;
  
  const selection = window.getSelection();
  if (!selection || !editorRef.current) return;
  
  const range = selection.getRangeAt(0);
  const currentBlock = findBlockElement(range.startContainer);
  if (!currentBlock) return;
  
  const currentIndex = parseInt(currentBlock.dataset.blockIndex || '0');
  const cursorPos = getCursorPosition();
  
  // Split pasted text by line breaks
  const lines = pastedText.split(/\r?\n/);
  
  if (lines.length === 1) {
    // Single line paste - insert into current block
    const currentContent = contentRef.current[currentIndex];
    const beforeCursor = currentContent.content.substring(0, cursorPos?.offset || 0);
    const afterCursor = currentContent.content.substring(cursorPos?.offset || 0);
    
    const newContent = [...contentRef.current];
    newContent[currentIndex] = {
      ...currentContent,
      content: beforeCursor + pastedText + afterCursor
    };
    
    onChange(newContent);
    
    // Set cursor position after pasted text
    setTimeout(() => {
      const updatedBlock = editorRef.current?.querySelector(`[data-block-id="${currentContent.id}"]`) as HTMLElement;
      if (updatedBlock) {
        const textNode = updatedBlock.firstChild || updatedBlock;
        const newOffset = beforeCursor.length + pastedText.length;
        const newRange = document.createRange();
        newRange.setStart(textNode, Math.min(newOffset, textNode.textContent?.length || 0));
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }, 10);
  } else {
    // Multi-line paste - create new blocks
    const currentContent = contentRef.current[currentIndex];
    const beforeCursor = currentContent.content.substring(0, cursorPos?.offset || 0);
    const afterCursor = currentContent.content.substring(cursorPos?.offset || 0);
    
    const newBlocks: ContentBlock[] = [];
    
    // First line goes into current block with content before cursor
    if (lines[0]) {
      newBlocks.push({
        ...currentContent,
        content: beforeCursor + lines[0]
      });
    }
    
    // Middle lines become new blocks
    for (let i = 1; i < lines.length - 1; i++) {
      newBlocks.push({
        id: `block-${Date.now()}-${i}`,
        type: 'paragraph',
        content: lines[i],
        formatting: []
      });
    }
    
    // Last line gets the content after cursor
    if (lines.length > 1) {
      newBlocks.push({
        id: `block-${Date.now()}-last`,
        type: 'paragraph',
        content: lines[lines.length - 1] + afterCursor,
        formatting: []
      });
    }
    
    // Replace current block with new blocks
    const newContent = [
      ...contentRef.current.slice(0, currentIndex),
      ...newBlocks,
      ...contentRef.current.slice(currentIndex + 1)
    ];
    
    onChange(newContent);
    
    // Focus on the last new block
    const lastNewBlockIndex = currentIndex + newBlocks.length - 1;
    setTimeout(() => {
      const blocks = editorRef.current?.querySelectorAll('[data-block-id]') as NodeListOf<HTMLElement>;
      const lastNewBlock = blocks[lastNewBlockIndex];
      if (lastNewBlock) {
        lastNewBlock.focus();
        const textNode = lastNewBlock.firstChild || lastNewBlock;
        const offset = lines[lines.length - 1].length;
        const newRange = document.createRange();
        newRange.setStart(textNode, Math.min(offset, textNode.textContent?.length || 0));
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        onActiveLineChange?.(lastNewBlockIndex);
      }
    }, 10);
  }
}