/**
 * Editor Event Handlers - Keyboard and selection handling logic
 * Extracted to keep main Editor component under 200 lines
 */
import type { ContentBlock, FormattingType, HighlightColor } from '@/types/document.types';
import { getCursorPosition, isCursorAtBlockStart, isCursorAtBlockEnd } from '@/utils/cursor-manager';

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
  onActiveLineChange?: (index: number) => void
) {
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
          // Clear formatting is handled differently - need to pass a special flag
          // For now, we'll handle this in the Editor component
        }
        return;
    }
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