/**
 * Optimized Editor Component - Performance-focused contentEditable implementation
 * Uses selective DOM updates instead of full re-renders to preserve cursor position
 * Supports multiple text selections with Cmd/Ctrl + click
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { ContentBlock, TextFormatting, FormattingType, HighlightColor } from '@/types/document.types';
import { getCursorPosition, restoreCursorPosition } from '@/utils/cursor-manager';
import { LineNumber } from './editor/LineNumber';
import { getBlockClassName, applyFormatting } from './editor/editor-helpers';
import { handleKeyDown } from './editor/editor-handlers';
import { selectionManager } from '@/utils/selection-manager';
import type { TextSelection } from '@/utils/selection-manager';
import { 
  applyBoldFormatting,
  applyHighlightFormatting,
  applyMinimizeFormatting,
  clearFormatting
} from '@/utils/formatting-engine';

interface EditorProps {
  content: ContentBlock[];
  onChange: (content: ContentBlock[]) => void;
  onSelectionChange?: (selection: Selection | null) => void;
  setApplyFormatRef?: (fn: (type: FormattingType, color?: HighlightColor) => void) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

interface EditorState {
  activeLineIndex: number;
  isComposing: boolean;
  multiSelections: TextSelection[];
}

export function Editor({ 
  content, 
  onChange, 
  onSelectionChange,
  setApplyFormatRef,
  placeholder = "Type anything, use @ to mention files, use / to spawn agent",
  autoFocus = false 
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<ContentBlock[]>(content);
  const [editorState, setEditorState] = useState<EditorState>({
    activeLineIndex: 0,
    isComposing: false,
    multiSelections: []
  });

  // Update content ref when content changes
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Initialize editor only once
  useEffect(() => {
    if (editorRef.current) {
      initializeEditor();
    }
  }, []); // Empty deps - only run once

  // Update blocks when content changes (but not during composition)
  useEffect(() => {
    if (editorRef.current && !editorState.isComposing) {
      updateBlocks();
    }
  }, [content, editorState.isComposing]);

  // Auto focus
  useEffect(() => {
    if (autoFocus && editorRef.current) {
      const firstBlock = editorRef.current.querySelector('[data-block-id]') as HTMLElement;
      firstBlock?.focus();
    }
  }, [autoFocus]);

  const initializeEditor = () => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    
    try {
      editor.innerHTML = '';
      
      // Ensure content is valid array
      if (!Array.isArray(content) || content.length === 0) {
        // Create default block if no content
        const defaultBlock = document.createElement('div');
        defaultBlock.dataset.blockId = 'default-block';
        defaultBlock.dataset.blockIndex = '0';
        defaultBlock.className = getBlockClassName('paragraph');
        defaultBlock.contentEditable = 'true';
        defaultBlock.innerHTML = '<br>';
        editor.appendChild(defaultBlock);
        return;
      }
      
      content.forEach((block, index) => {
        if (block && typeof block === 'object') {
          const blockElement = createBlockElement(block, index);
          editor.appendChild(blockElement);
        }
      });
    } catch (error) {
      console.error('Error initializing editor:', error);
    }
  };

  const createBlockElement = (block: ContentBlock, index: number): HTMLElement => {
    const blockElement = document.createElement('div');
    blockElement.dataset.blockId = block.id;
    blockElement.dataset.blockIndex = index.toString();
    blockElement.className = getBlockClassName(block.type);
    blockElement.contentEditable = 'true';
    blockElement.spellcheck = false;
    updateBlockContent(blockElement, block);
    return blockElement;
  };

  const updateBlockContent = (element: HTMLElement, block: ContentBlock) => {
    try {
      element.dataset.blockType = block.type || 'paragraph';
      element.className = getBlockClassName(block.type || 'paragraph');
      const currentText = element.textContent || '';
      const blockContent = block.content || '';
      
      if (currentText !== blockContent) {
        const formattedHTML = applyFormatting(blockContent, block.formatting || []);
        element.innerHTML = formattedHTML || '<br>';
      }
    } catch (error) {
      console.error('Error updating block content:', error);
      element.innerHTML = '<br>';
    }
  };

  const updateBlocks = useCallback(() => {
    if (!editorRef.current) return;
    
    try {
      const editor = editorRef.current;
      const blocks = Array.from(editor.children) as HTMLElement[];
      const cursorPos = getCursorPosition();

      // Validate content
      if (!Array.isArray(content)) {
        console.error('Invalid content: expected array');
        return;
      }

      // Update only changed blocks
      content.forEach((block, index) => {
        if (!block || typeof block !== 'object') return;
        
        const existingBlock = blocks[index];
        if (!existingBlock || existingBlock.dataset.blockId !== block.id) {
          const newBlock = createBlockElement(block, index);
          if (existingBlock) {
            editor.replaceChild(newBlock, existingBlock);
          } else {
            editor.appendChild(newBlock);
          }
        } else {
          const currentText = existingBlock.textContent || '';
          const blockContent = block.content || '';
          if (currentText !== blockContent || existingBlock.dataset.blockType !== block.type) {
            updateBlockContent(existingBlock, block);
          }
        }
      });

      // Remove extra blocks
      while (editor.children.length > content.length) {
        const lastChild = editor.lastChild;
        if (lastChild) {
          editor.removeChild(lastChild);
        }
      }

      // Restore cursor position
      if (cursorPos) {
        restoreCursorPosition(cursorPos);
      }
    } catch (error) {
      console.error('Error updating blocks:', error);
    }
  }, [content]);

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    try {
      const target = e.target as HTMLElement;
      const blockElement = target.closest('[data-block-id]') as HTMLElement;
      if (!blockElement) return;

      const blockIndex = parseInt(blockElement.dataset.blockIndex || '0');
      const blockId = blockElement.dataset.blockId || '';
      const textContent = blockElement.textContent || '';
      
      // Validate block index
      if (blockIndex < 0 || blockIndex >= contentRef.current.length) {
        console.error('Invalid block index:', blockIndex);
        return;
      }
      
      // Detect block type based on content
      let blockType = contentRef.current[blockIndex]?.type || 'paragraph';
      if (textContent.startsWith('@')) {
        blockType = 'mention';
      } else if (textContent.startsWith('/')) {
        blockType = 'command';
      }
      
      // Update only the changed block
      const newContent = [...contentRef.current];
      newContent[blockIndex] = {
        id: blockId,
        type: blockType,
        content: textContent,
        formatting: contentRef.current[blockIndex]?.formatting || []
      };
      
      onChange(newContent);
    } catch (error) {
      console.error('Error handling input:', error);
    }
  }, [onChange]);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    onSelectionChange?.(selection);
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const blockElement = range.startContainer.parentElement?.closest('[data-block-id]') as HTMLElement;
      
      if (blockElement) {
        const blockIndex = parseInt(blockElement.dataset.blockIndex || '0');
        setEditorState(prev => ({ ...prev, activeLineIndex: blockIndex }));
      }
      
      // Update selection manager with current selection
      if (!selection.isCollapsed) {
        selectionManager.setFromDOMSelection(contentRef.current);
        const selections = selectionManager.getSelections();
        setEditorState(prev => ({ ...prev, multiSelections: selections }));
      }
    }
  }, [onSelectionChange]);

  // Handle mouse down for multi-selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      
      // Get current selection before it changes
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Add to existing selections
        if (!selection.isCollapsed) {
          selectionManager.addFromDOMRange(range, contentRef.current);
          const selections = selectionManager.getSelections();
          setEditorState(prev => ({ ...prev, multiSelections: selections }));
        }
      }
    } else {
      // Clear multi-selections on normal click
      selectionManager.clear();
      setEditorState(prev => ({ ...prev, multiSelections: [] }));
    }
  }, []);
    
  
  // Apply formatting function that can be called from toolbar
  const applyFormat = useCallback((type: FormattingType, color?: HighlightColor) => {
    const selections = selectionManager.getSelections();
    let newContent: ContentBlock[];
    
    switch (type) {
      case 'bold':
        newContent = applyBoldFormatting(contentRef.current, selections, editorState.activeLineIndex);
        break;
      case 'highlight':
        newContent = applyHighlightFormatting(contentRef.current, selections, color, editorState.activeLineIndex);
        break;
      case 'minimize':
        newContent = applyMinimizeFormatting(contentRef.current, selections, editorState.activeLineIndex);
        break;
      case 'clear':
        newContent = clearFormatting(contentRef.current, selections, editorState.activeLineIndex);
        break;
      default:
        return;
    }
    
    onChange(newContent);
  }, [onChange, editorState.activeLineIndex]);

  // Provide the formatting function to parent
  useEffect(() => {
    setApplyFormatRef?.(applyFormat);
  }, [setApplyFormatRef, applyFormat]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex h-full">
        {/* Line Numbers */}
        <div className="w-8 bg-[#1e1e1e] flex-shrink-0 py-6 px-1">
          {content.map((block, index) => (
            <LineNumber
              key={`line-${block.id}`}
              index={index}
              block={block}
              isActive={index === editorState.activeLineIndex}
            />
          ))}
        </div>
        
        {/* Editor Content */}
        <div
          ref={editorRef}
          onInput={handleInput}
          onMouseDown={handleMouseDown}
          onKeyDown={(e) => {
            // Handle formatting shortcuts
            if (e.metaKey || e.ctrlKey) {
              if (e.key === 'b') {
                e.preventDefault();
                applyFormat('bold');
              } else if (e.key === 'h') {
                e.preventDefault();
                applyFormat('highlight');
              } else if (e.key === 'm') {
                e.preventDefault();
                applyFormat('minimize');
              } else if (e.shiftKey && e.key === 'C') {
                e.preventDefault();
                applyFormat('clear');
              }
            }
            
            // Handle other key events
            handleKeyDown(e, contentRef, onChange, editorRef);
          }}
          onMouseUp={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          onCompositionStart={() => setEditorState(prev => ({ ...prev, isComposing: true }))}
          onCompositionEnd={() => setEditorState(prev => ({ ...prev, isComposing: false }))}
          className="flex-1 p-6 bg-[#1e1e1e] text-[#cccccc] focus:outline-none"
          style={{ 
            minHeight: '100%',
            fontFamily: '"Segoe UI", "Roboto", sans-serif',
            fontSize: '14px',
            lineHeight: '1.6'
          }}
          data-placeholder={placeholder}
        />
      </div>
    </div>
  );
}