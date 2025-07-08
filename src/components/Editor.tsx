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
import { findBlockElement } from '@/utils/selection-helpers';
import { calculateVisualLinesForBlocks, createDebouncedCalculator } from '@/utils/visual-line-calculator';
import { UndoManager } from '@/utils/undo-manager';
import { handlePaste } from './editor/editor-handlers';
import { getCurrentCursorVisualLine } from '@/utils/cursor-visual-line';
import { clearSelectionAnchor } from '@/utils/selection-state';
import { clearParagraphSelectionState } from '@/utils/paragraph-selection';
import { 
  startCrossParagraphSelection,
  updateCrossParagraphSelection,
  endCrossParagraphSelection,
  isSelectingCrossParagraph
} from '@/utils/cross-paragraph-selection';
import { 
  applyBoldFormatting,
  applyHighlightFormatting,
  applyMinimizeFormatting,
  clearFormatting
} from '@/utils/formatting-engine';
import { clearColumnPosition } from '@/utils/cursor-column-tracker';

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
  activeVisualLine: number; // Which visual line within the active block
  isComposing: boolean;
  multiSelections: TextSelection[];
  visualLines: Map<string, number>; // blockId -> visual line count
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
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const undoManagerRef = useRef<UndoManager>(new UndoManager());
  const [editorState, setEditorState] = useState<EditorState>({
    activeLineIndex: 0,
    activeVisualLine: 0,
    isComposing: false,
    multiSelections: [],
    visualLines: new Map()
  });

  // Update content ref when content changes
  useEffect(() => {
    contentRef.current = content;
    // Save to undo history (debounced)
    const cursorPos = getCursorPosition();
    undoManagerRef.current.saveState(content, cursorPos || undefined);
  }, [content]);
  
  // Function to update visual line counts
  const updateVisualLines = useCallback(() => {
    if (!editorRef.current) return;
    
    const blocks = Array.from(editorRef.current.querySelectorAll('[data-block-id]')) as HTMLElement[];
    const visualLines = calculateVisualLinesForBlocks(blocks);
    
    setEditorState(prev => ({
      ...prev,
      visualLines
    }));
  }, []);
  
  // Debounced version for resize events
  const debouncedUpdateVisualLines = useRef(
    createDebouncedCalculator(100)
  ).current;
  
  // Undo function
  const handleUndo = useCallback(() => {
    const historyEntry = undoManagerRef.current.undo();
    if (historyEntry) {
      onChange(historyEntry.content);
      // Restore cursor position after DOM update
      setTimeout(() => {
        if (historyEntry.cursorPosition) {
          restoreCursorPosition(historyEntry.cursorPosition);
        }
        updateVisualLines();
      }, 50);
    }
  }, [onChange, updateVisualLines]);
  
  // Redo function  
  const handleRedo = useCallback(() => {
    const historyEntry = undoManagerRef.current.redo();
    if (historyEntry) {
      onChange(historyEntry.content);
      // Restore cursor position after DOM update
      setTimeout(() => {
        if (historyEntry.cursorPosition) {
          restoreCursorPosition(historyEntry.cursorPosition);
        }
        updateVisualLines();
      }, 50);
    }
  }, [onChange, updateVisualLines]);

  // Initialize editor only once
  useEffect(() => {
    if (editorRef.current) {
      initializeEditor();
      // Initial visual line calculation
      setTimeout(updateVisualLines, 50);
    }
  }, []); // Empty deps - only run once
  
  // Setup ResizeObserver for dynamic visual line updates
  useEffect(() => {
    if (!editorRef.current) return;
    
    const observer = new ResizeObserver(() => {
      debouncedUpdateVisualLines(() => updateVisualLines());
    });
    
    observer.observe(editorRef.current);
    resizeObserverRef.current = observer;
    
    return () => {
      observer.disconnect();
      resizeObserverRef.current = null;
    };
  }, [updateVisualLines, debouncedUpdateVisualLines]);

  // Update blocks when content changes (but not during composition)
  useEffect(() => {
    if (editorRef.current && !editorState.isComposing) {
      updateBlocks();
      // Update visual lines after DOM updates
      setTimeout(updateVisualLines, 50);
    }
  }, [content, editorState.isComposing, updateVisualLines]);

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
    blockElement.style.wordWrap = 'break-word';
    blockElement.style.overflowWrap = 'break-word';
    blockElement.style.wordBreak = 'break-word';
    blockElement.style.whiteSpace = 'normal';
    blockElement.style.lineHeight = '1.15';
    blockElement.style.width = '100%';
    updateBlockContent(blockElement, block);
    return blockElement;
  };

  const updateBlockContent = (element: HTMLElement, block: ContentBlock) => {
    try {
      element.dataset.blockType = block.type || 'paragraph';
      element.className = getBlockClassName(block.type || 'paragraph');
      const currentText = element.textContent || '';
      const blockContent = block.content || '';
      
      // Always apply formatting, not just when text changes
      // This ensures formatting updates are rendered even when only formatting changes
      const formattedHTML = applyFormatting(blockContent, block.formatting || []);
      
      // Only update innerHTML if it actually changed to preserve cursor position
      if (element.innerHTML !== formattedHTML) {
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
          // Always update block content to ensure formatting changes are applied
          // The updateBlockContent function will check if innerHTML actually needs updating
          updateBlockContent(existingBlock, block);
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
    // Clear column position when typing
    clearColumnPosition();
    
    try {
      const target = e.target as HTMLElement;
      const blockElement = findBlockElement(target);
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
    // Use requestAnimationFrame to ensure cursor has moved
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      onSelectionChange?.(selection);
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const blockElement = findBlockElement(range.startContainer);
        
        if (blockElement) {
          const blockIndex = parseInt(blockElement.dataset.blockIndex || '0');
          
          // Calculate which visual line the cursor is on
          const visualLine = getCurrentCursorVisualLine(blockElement);
          
          setEditorState(prev => ({ 
            ...prev, 
            activeLineIndex: blockIndex,
            activeVisualLine: visualLine
          }));
        }
        
        // Update selection manager with current selection
        if (!selection.isCollapsed) {
          selectionManager.setFromDOMSelection(contentRef.current);
          const selections = selectionManager.getSelections();
          setEditorState(prev => ({ ...prev, multiSelections: selections }));
        } else {
          // Clear selection anchor when no selection
          clearSelectionAnchor();
          clearParagraphSelectionState();
        }
      } else {
        // Clear selection anchor when no selection
        clearSelectionAnchor();
        clearParagraphSelectionState();
      }
    });
  }, [onSelectionChange]);

  // Handle mouse down for multi-selection and cross-paragraph selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Clear column position on any mouse click
    clearColumnPosition();
    
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      
      // First, capture any existing selection before the click
      const currentSelection = window.getSelection();
      if (currentSelection && currentSelection.rangeCount > 0 && !currentSelection.isCollapsed) {
        const currentRange = currentSelection.getRangeAt(0);
        
        // If we don't have any selections yet, add the current one
        if (selectionManager.getSelections().length === 0) {
          selectionManager.addFromDOMRange(currentRange, contentRef.current);
        }
      }
      
      // Then handle the click location for a new selection
      // We'll let the mouseup event handle adding the new selection
      return;
    } else {
      // Clear multi-selections on normal click
      selectionManager.clear();
      setEditorState(prev => ({ ...prev, multiSelections: [] }));
      
      // Start cross-paragraph selection
      startCrossParagraphSelection(e.nativeEvent, editorRef);
    }
  }, []);
  
  // Handle mouse move for cross-paragraph selection
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isSelectingCrossParagraph()) {
      updateCrossParagraphSelection(e.nativeEvent, editorRef);
    }
  }, []);
  
  // Handle mouse up for completing multi-selection
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
          const range = selection.getRangeAt(0);
          selectionManager.addFromDOMRange(range, contentRef.current);
          const selections = selectionManager.getSelections();
          setEditorState(prev => ({ ...prev, multiSelections: selections }));
          
          // Highlight all selections visually
          highlightMultipleSelections(selections);
        }
      }, 10);
    } else {
      // End cross-paragraph selection
      endCrossParagraphSelection();
    }
    
    // Always handle regular selection change
    handleSelectionChange();
  }, [handleSelectionChange]);
  
  // Handle paste events
  const handlePasteEvent = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    // Force save current state before paste
    const cursorPos = getCursorPosition();
    undoManagerRef.current.forceSave(contentRef.current, cursorPos || undefined);
    
    handlePaste(e, contentRef, onChange, editorRef, (index) => {
      setEditorState(prev => ({ ...prev, activeLineIndex: index }));
    });
    
    // Update visual lines after paste using requestAnimationFrame for better timing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateVisualLines();
      });
    });
  }, [onChange, updateVisualLines]);
  
  // Visual highlighting for multiple selections
  const highlightMultipleSelections = useCallback((selections: TextSelection[]) => {
    // Clear previous highlights
    const existingHighlights = editorRef.current?.querySelectorAll('.multi-selection-highlight');
    existingHighlights?.forEach(el => {
      const parent = el.parentNode;
      while (el.firstChild) {
        parent?.insertBefore(el.firstChild, el);
      }
      parent?.removeChild(el);
    });
    
    // Apply new highlights
    selections.forEach((selection, index) => {
      const blockElement = editorRef.current?.querySelector(`[data-block-id="${selection.blockId}"]`);
      if (blockElement && blockElement.textContent) {
        const text = blockElement.textContent;
        const before = text.substring(0, selection.start);
        const selected = text.substring(selection.start, selection.end);
        const after = text.substring(selection.end);
        
        if (selected) {
          const span = document.createElement('span');
          span.className = 'multi-selection-highlight';
          span.style.backgroundColor = index === 0 ? 'rgba(79, 195, 247, 0.3)' : 'rgba(79, 195, 247, 0.2)';
          span.style.borderRadius = '2px';
          span.textContent = selected;
          
          blockElement.innerHTML = '';
          blockElement.appendChild(document.createTextNode(before));
          blockElement.appendChild(span);
          blockElement.appendChild(document.createTextNode(after));
        }
      }
    });
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
        <div className="w-8 bg-[#1e1e1e] flex-shrink-0 pt-6 pb-6 px-1">
          {content.map((block, index) => {
            // Calculate cumulative line number
            let startLineNumber = 1;
            for (let i = 0; i < index; i++) {
              const prevBlock = content[i];
              startLineNumber += editorState.visualLines.get(prevBlock.id) || 1;
            }
            
            return (
              <LineNumber
                key={`line-${block.id}`}
                index={index}
                block={block}
                isActive={index === editorState.activeLineIndex}
                activeVisualLine={editorState.activeVisualLine}
                visualLineCount={editorState.visualLines.get(block.id) || 1}
                startLineNumber={startLineNumber}
              />
            );
          })}
        </div>
        
        {/* Editor Content */}
        <div
          ref={editorRef}
          onInput={handleInput}
          onMouseDown={handleMouseDown}
          onFocus={(e) => {
            // Update active line when any block receives focus
            const target = e.target as HTMLElement;
            const blockElement = findBlockElement(target);
            if (blockElement) {
              const blockIndex = parseInt(blockElement.dataset.blockIndex || '0');
              
              // Calculate visual line after a short delay to ensure cursor is positioned
              setTimeout(() => {
                const visualLine = getCurrentCursorVisualLine(blockElement);
                setEditorState(prev => ({ 
                  ...prev, 
                  activeLineIndex: blockIndex,
                  activeVisualLine: visualLine
                }));
              }, 10);
            }
          }}
          onKeyDown={(e) => {
            // Let handleKeyDown process all events first
            handleKeyDown(e, contentRef, onChange, editorRef, applyFormat, (index) => {
              setEditorState(prev => ({ ...prev, activeLineIndex: index }));
            }, handleUndo, handleRedo);
          }}
          onPaste={handlePasteEvent}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onKeyUp={handleSelectionChange}
          onCompositionStart={() => setEditorState(prev => ({ ...prev, isComposing: true }))}
          onCompositionEnd={() => setEditorState(prev => ({ ...prev, isComposing: false }))}
          className="flex-1 p-6 bg-[#1e1e1e] text-[#cccccc] focus:outline-none overflow-x-hidden"
          style={{ 
            minHeight: '100%',
            fontFamily: '"Segoe UI", "Roboto", sans-serif',
            fontSize: '14px',
            lineHeight: '1.15',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            whiteSpace: 'normal'
          }}
          data-placeholder={placeholder}
        />
      </div>
    </div>
  );
}