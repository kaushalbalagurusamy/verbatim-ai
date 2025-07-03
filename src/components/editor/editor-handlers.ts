/**
 * Editor Event Handlers - Keyboard and selection handling logic
 * Extracted to keep main Editor component under 200 lines
 */
import type { ContentBlock } from '@/types/document.types';
import { getCursorPosition, isCursorAtBlockStart } from '@/utils/cursor-manager';

export function handleEnterKey(
  e: React.KeyboardEvent<HTMLDivElement>,
  contentRef: React.MutableRefObject<ContentBlock[]>,
  onChange: (content: ContentBlock[]) => void,
  editorRef: React.RefObject<HTMLDivElement>
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
    }
  }, 10);
}

export function handleBackspaceAtStart(
  e: React.KeyboardEvent<HTMLDivElement>,
  contentRef: React.MutableRefObject<ContentBlock[]>,
  onChange: (content: ContentBlock[]) => void,
  editorRef: React.RefObject<HTMLDivElement>
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
      }
    }, 10);
  }
}

export function handleKeyDown(
  e: React.KeyboardEvent<HTMLDivElement>,
  contentRef: React.MutableRefObject<ContentBlock[]>,
  onChange: (content: ContentBlock[]) => void,
  editorRef: React.RefObject<HTMLDivElement>
) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleEnterKey(e, contentRef, onChange, editorRef);
  } else if (e.key === 'Backspace' && isCursorAtBlockStart()) {
    handleBackspaceAtStart(e, contentRef, onChange, editorRef);
  }
}