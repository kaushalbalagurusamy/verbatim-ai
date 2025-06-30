import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { ContentBlock, TextFormatting, FormattingType, HighlightColor } from '@/types/document.types';

interface EditorProps {
  content: ContentBlock[];
  onChange: (content: ContentBlock[]) => void;
  onSelectionChange?: (selection: Selection | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

interface EditorState {
  selectionStart: number;
  selectionEnd: number;
  currentBlock: number;
}

export function Editor({ 
  content, 
  onChange, 
  onSelectionChange,
  placeholder = "Type anything, use @ to mention files, use / to spawn agent",
  autoFocus = false 
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    selectionStart: 0,
    selectionEnd: 0,
    currentBlock: 0
  });

  // Initialize editor with content
  useEffect(() => {
    if (editorRef.current && content.length > 0) {
      renderContent();
    }
  }, [content]);

  // Auto focus if requested
  useEffect(() => {
    if (autoFocus && editorRef.current) {
      editorRef.current.focus();
    }
  }, [autoFocus]);

  const renderContent = useCallback(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    editor.innerHTML = '';

    content.forEach((block, blockIndex) => {
      const blockElement = document.createElement('div');
      blockElement.dataset.blockId = block.id;
      blockElement.dataset.blockIndex = blockIndex.toString();
      blockElement.className = getBlockClassName(block.type);
      
      // Apply formatting to text
      const formattedHTML = applyFormatting(block.content, block.formatting || []);
      blockElement.innerHTML = formattedHTML || '<br>'; // Empty line handling
      
      editor.appendChild(blockElement);
    });
  }, [content]);

  const getBlockClassName = (type: string): string => {
    const baseClasses = 'min-h-[1.5rem] leading-relaxed outline-none';
    
    switch (type) {
      case 'heading1':
        return `${baseClasses} text-2xl font-bold text-[#ffffff] mb-4`;
      case 'heading2':
        return `${baseClasses} text-xl font-bold text-[#ffffff] mb-3`;
      case 'heading3':
        return `${baseClasses} text-lg font-bold text-[#ffffff] mb-2`;
      case 'heading4':
        return `${baseClasses} text-base font-bold text-[#ffffff] mb-2`;
      case 'heading5':
        return `${baseClasses} text-sm font-bold text-[#ffffff] mb-1`;
      case 'heading6':
        return `${baseClasses} text-xs font-bold text-[#ffffff] mb-1`;
      case 'mention':
        return `${baseClasses} text-[#4fc3f7] bg-[#4fc3f7]/10 px-1 rounded`;
      case 'command':
        return `${baseClasses} text-[#ffa726] bg-[#ffa726]/10 px-1 rounded`;
      default:
        return `${baseClasses} text-[#cccccc] mb-2`;
    }
  };

  const applyFormatting = (text: string, formatting: TextFormatting[]): string => {
    if (!formatting.length) return text;

    // Sort formatting by start position (descending) to apply from end to start
    const sortedFormatting = [...formatting].sort((a, b) => b.start - a.start);
    
    let result = text;
    
    sortedFormatting.forEach(format => {
      const before = result.slice(0, format.start);
      const formatted = result.slice(format.start, format.end);
      const after = result.slice(format.end);
      
      let wrapper = '';
      
      switch (format.type) {
        case 'bold':
          wrapper = `<strong class="font-bold underline">${formatted}</strong>`;
          break;
        case 'highlight':
          const colorClass = getHighlightColorClass(format.color || 'yellow');
          wrapper = `<mark class="${colorClass}">${formatted}</mark>`;
          break;
        case 'minimize':
          wrapper = `<small class="text-xs opacity-60">${formatted}</small>`;
          break;
        default:
          wrapper = formatted;
      }
      
      result = before + wrapper + after;
    });
    
    return result;
  };

  const getHighlightColorClass = (color: HighlightColor): string => {
    switch (color) {
      case 'yellow':
        return 'bg-yellow-200 text-yellow-900';
      case 'blue':
        return 'bg-blue-200 text-blue-900';
      case 'green':
        return 'bg-green-200 text-green-900';
      case 'pink':
        return 'bg-pink-200 text-pink-900';
      default:
        return 'bg-yellow-200 text-yellow-900';
    }
  };

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const editor = e.currentTarget;
    const blocks = Array.from(editor.children);
    
    const newContent = blocks.map((blockEl, index) => {
      const element = blockEl as HTMLDivElement;
      const blockId = element.dataset.blockId || content[index]?.id || `block-${Date.now()}-${index}`;
      const textContent = element.textContent || '';
      
      // Detect block type based on content
      let blockType = content[index]?.type || 'paragraph';
      if (textContent.startsWith('@')) {
        blockType = 'mention';
      } else if (textContent.startsWith('/')) {
        blockType = 'command';
      }
      
      return {
        id: blockId,
        type: blockType,
        content: textContent,
        formatting: content[index]?.formatting || []
      } as ContentBlock;
    });
    
    onChange(newContent);
  }, [content, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Enter key for new blocks
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const blockElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement?.closest('[data-block-id]')
        : range.commonAncestorContainer.closest?.('[data-block-id]');
      
      if (blockElement) {
        const blockIndex = parseInt(blockElement.getAttribute('data-block-index') || '0');
        
        // Create new block
        const newBlock: ContentBlock = {
          id: `block-${Date.now()}`,
          type: 'paragraph',
          content: '',
          formatting: []
        };
        
        // Insert after current block
        const newContent = [...content];
        newContent.splice(blockIndex + 1, 0, newBlock);
        onChange(newContent);
        
        // Focus will be handled by the effect
        setTimeout(() => {
          const editor = editorRef.current;
          if (editor) {
            const newBlockEl = editor.children[blockIndex + 1] as HTMLElement;
            if (newBlockEl) {
              newBlockEl.focus();
              
              // Set cursor at beginning
              const sel = window.getSelection();
              if (sel) {
                const range = document.createRange();
                range.setStart(newBlockEl, 0);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }
          }
        }, 0);
      }
    }
    
    // Handle Backspace for block deletion
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      if (range.startOffset === 0 && range.endOffset === 0) {
        const blockElement = range.commonAncestorContainer.closest?.('[data-block-id]');
        if (blockElement) {
          const blockIndex = parseInt(blockElement.getAttribute('data-block-index') || '0');
          if (blockIndex > 0 && content.length > 1) {
            e.preventDefault();
            
            // Remove current block and merge with previous if needed
            const newContent = [...content];
            newContent.splice(blockIndex, 1);
            onChange(newContent);
            
            // Focus previous block
            setTimeout(() => {
              const editor = editorRef.current;
              if (editor && editor.children[blockIndex - 1]) {
                const prevBlock = editor.children[blockIndex - 1] as HTMLElement;
                prevBlock.focus();
                
                // Set cursor at end
                const sel = window.getSelection();
                if (sel) {
                  const range = document.createRange();
                  range.selectNodeContents(prevBlock);
                  range.collapse(false);
                  sel.removeAllRanges();
                  sel.addRange(range);
                }
              }
            }, 0);
          }
        }
      }
    }
  }, [content, onChange]);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    onSelectionChange?.(selection);
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      setEditorState({
        selectionStart: range.startOffset,
        selectionEnd: range.endOffset,
        currentBlock: 0 // TODO: Calculate actual block index
      });
    }
  }, [onSelectionChange]);

  // Apply formatting to selected text
  const applyFormatToSelection = useCallback((formatType: FormattingType, color?: HighlightColor) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) return;
    
    const range = selection.getRangeAt(0);
    const blockElement = range.commonAncestorContainer.closest?.('[data-block-id]');
    
    if (blockElement) {
      const blockIndex = parseInt(blockElement.getAttribute('data-block-index') || '0');
      const block = content[blockIndex];
      
      if (block) {
        const newFormatting: TextFormatting = {
          type: formatType,
          start: range.startOffset,
          end: range.endOffset,
          ...(color && { color })
        };
        
        const updatedBlock = {
          ...block,
          formatting: [...(block.formatting || []), newFormatting]
        };
        
        const newContent = [...content];
        newContent[blockIndex] = updatedBlock;
        onChange(newContent);
      }
    }
  }, [content, onChange]);

  // Expose formatting function to parent
  useEffect(() => {
    (editorRef.current as any)?.setApplyFormat?.(applyFormatToSelection);
  }, [applyFormatToSelection]);

  return (
    <div className="flex-1 overflow-auto">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        className="h-full p-6 bg-[#1e1e1e] text-[#cccccc] focus:outline-none"
        style={{ 
          minHeight: '100%',
          fontFamily: '"Segoe UI", "Roboto", sans-serif',
          fontSize: '14px',
          lineHeight: '1.6'
        }}
        data-placeholder={placeholder}
      />
    </div>
  );
}