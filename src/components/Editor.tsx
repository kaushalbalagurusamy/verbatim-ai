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
import { selectionManager, SelectionManager, TextSelection } from '@/utils/selection-manager';
import { FormattingEngine } from '@/utils/formatting-engine';

interface EditorProps {
  content: ContentBlock[];
  onChange: (content: ContentBlock[]) => void;
  onSelectionChange?: (selection: Selection | null) => void;
  onApplyFormatRef?: (fn: (type: FormattingType, color?: HighlightColor) => void) => void;
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
  onApplyFormatRef,
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
    editor.innerHTML = '';
    content.forEach((block, index) => {
      const blockElement = createBlockElement(block, index);
      editor.appendChild(blockElement);
    });
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
    element.dataset.blockType = block.type;
    element.className = getBlockClassName(block.type);
    const currentText = element.textContent || '';
    if (currentText !== block.content) {
      const formattedHTML = applyFormatting(block.content, block.formatting || []);
      element.innerHTML = formattedHTML || '<br>';
    }
  };

  const updateBlocks = useCallback(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const blocks = Array.from(editor.children) as HTMLElement[];
    const cursorPos = getCursorPosition();

    // Update only changed blocks
    content.forEach((block, index) => {
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
        if (currentText !== block.content || existingBlock.dataset.blockType !== block.type) {
          updateBlockContent(existingBlock, block);
        }
      }
    });

    // Remove extra blocks
    while (editor.children.length > content.length) {
      editor.removeChild(editor.lastChild!);
    }

    // Restore cursor position
    if (cursorPos) {
      restoreCursorPosition(cursorPos);
    }
  }, [content]);

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const blockElement = target.closest('[data-block-id]') as HTMLElement;
    if (!blockElement) return;

    const blockIndex = parseInt(blockElement.dataset.blockIndex || '0');
    const blockId = blockElement.dataset.blockId || '';
    const textContent = blockElement.textContent || '';
    
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
  }, [onChange]);

  const handleSelectionChange = useCallback((e?: MouseEvent) => {
    const selection = window.getSelection();
    onSelectionChange?.(selection);
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const blockElement = range.startContainer.parentElement?.closest('[data-block-id]') as HTMLElement;
      
      if (blockElement) {
        const blockIndex = parseInt(blockElement.dataset.blockIndex || '0');
        setEditorState(prev => ({ ...prev, activeLineIndex: blockIndex }));
      }
      
      // Handle multi-selection with Cmd/Ctrl + click
      const isMultiSelect = e && (e.metaKey || e.ctrlKey);
      if (!selection.isCollapsed) {
        const textSelection = SelectionManager.fromDOMSelection(selection);
        if (textSelection) {
          selectionManager.addSelection(textSelection, isMultiSelect);
          const selections = selectionManager.getSelections();
          setEditorState(prev => ({ ...prev, multiSelections: selections }));
          updateMultiSelectionVisuals();
        }
      } else if (!isMultiSelect) {
        // Clear selections on normal click
        selectionManager.clearSelections();
        setEditorState(prev => ({ ...prev, multiSelections: [] }));
        clearMultiSelectionVisuals();
      }
    }
  }, [onSelectionChange]);
  
  // Update visual indicators for multiple selections
  const updateMultiSelectionVisuals = useCallback(() => {
    if (!editorRef.current) return;
    
    // Clear existing visual indicators
    clearMultiSelectionVisuals();
    
    const selections = selectionManager.getSelections();
    if (selections.length <= 1) return;
    
    // Add visual indicators for additional selections
    selections.slice(1).forEach((sel, index) => {
      const blockElement = editorRef.current!.querySelector(
        `[data-block-id="${sel.blockId}"]`
      ) as HTMLElement;
      if (!blockElement) return;
      
      // Create highlight span
      const span = document.createElement('span');
      span.className = 'multi-selection-highlight';
      span.dataset.selectionIndex = index.toString();
      
      // Apply highlight style
      const text = blockElement.textContent || '';
      const before = text.substring(0, sel.start);
      const selected = text.substring(sel.start, sel.end);
      const after = text.substring(sel.end);
      
      // This is a simplified approach - in production, we'd need to handle formatted text
      span.style.backgroundColor = 'rgba(79, 195, 247, 0.2)';
      span.style.borderRadius = '2px';
    });
  }, []);
  
  // Clear visual indicators for multiple selections
  const clearMultiSelectionVisuals = useCallback(() => {
    if (!editorRef.current) return;
    
    const highlights = editorRef.current.querySelectorAll('.multi-selection-highlight');
    highlights.forEach(highlight => highlight.remove());
  }, []);
  
  // Apply formatting function that can be called from toolbar
  const applyFormat = useCallback((type: FormattingType, color?: HighlightColor) => {
    const selections = selectionManager.getSelections();
    if (selections.length === 0) {
      // Try to get current selection
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        const textSelection = SelectionManager.fromDOMSelection(selection);
        if (textSelection) {
          selections.push(textSelection);
        }
      }
    }
    
    if (selections.length === 0) return;
    
    // Apply formatting using the formatting engine
    const updatedContent = FormattingEngine.applyFormatting(
      contentRef.current,
      selections,
      type,
      color
    );
    
    onChange(updatedContent);
    
    // Clear selections after formatting
    selectionManager.clearSelections();
    setEditorState(prev => ({ ...prev, multiSelections: [] }));
    clearMultiSelectionVisuals();
  }, [onChange]);
  
  // Provide the formatting function to parent
  useEffect(() => {
    onApplyFormatRef?.(applyFormat);
  }, [onApplyFormatRef, applyFormat]);

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
          onKeyDown={(e) => {
            // Handle clear formatting shortcut
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
              e.preventDefault();
              const selections = selectionManager.getSelections();
              if (selections.length === 0) {
                const selection = window.getSelection();
                if (selection && !selection.isCollapsed) {
                  const textSelection = SelectionManager.fromDOMSelection(selection);
                  if (textSelection) selections.push(textSelection);
                }
              }
              
              if (selections.length > 0) {
                const updatedContent = FormattingEngine.clearFormatting(
                  contentRef.current,
                  selections
                );
                onChange(updatedContent);
                selectionManager.clearSelections();
                setEditorState(prev => ({ ...prev, multiSelections: [] }));
                clearMultiSelectionVisuals();
              }
              return;
            }
            
            handleKeyDown(e, contentRef, onChange, editorRef, applyFormat);
          }}
          onMouseUp={(e) => handleSelectionChange(e.nativeEvent)}
          onKeyUp={() => handleSelectionChange()}
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