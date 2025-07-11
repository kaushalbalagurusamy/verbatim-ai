/**
 * Single ContentEditable Editor - Core editor component using unified architecture
 * Uses a single contentEditable container with virtual blocks for natural browser behavior
 * Integrates with DocumentModel for efficient text operations
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { DocumentModel, DocumentChange } from '../models/document-model';
import { LineRegistry, VisualLine } from '../models/line-registry';
import { TextFormatting } from '../data-structures/interval-tree';
import { DocumentContent } from '../data-structures/btree';
import { codeUnitLength, sliceByCodeUnits, getGraphemeAt } from '../utils/string-utils';
import { textMeasurementService } from '../utils/text-measurement';
import { LineUpdateObserver } from '../observers/line-update-observer';
import { InputHandlerService } from '../services/input-handler';
import { ToolbarStateService } from '../services/toolbar-state-service';
import { DOMDecoratorService } from '../services/dom-decorator';

interface EditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  onSelectionChange?: (selection: EditorSelection | null) => void;
  onToolbarStateChange?: (state: any) => void;
  placeholder?: string;
  className?: string;
}

interface EditorSelection {
  start: number;
  end: number;
  isCollapsed: boolean;
  text: string;
}

interface EditorState {
  isComposing: boolean;
  lastSelection: EditorSelection | null;
  viewportTop: number;
  viewportBottom: number;
}

export const SingleContentEditableEditor = React.forwardRef<any, EditorProps>(({
  initialContent = '',
  onChange,
  onSelectionChange,
  onToolbarStateChange,
  placeholder = 'Start typing...',
  className = ''
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<DocumentModel>(new DocumentModel());
  const lineRegistryRef = useRef<LineRegistry>(new LineRegistry());
  const lineObserverRef = useRef<LineUpdateObserver>(
    new LineUpdateObserver(lineRegistryRef.current, documentRef.current)
  );
  const inputHandlerRef = useRef<InputHandlerService | null>(null);
  const decoratorRef = useRef<DOMDecoratorService | null>(null);
  const toolbarStateRef = useRef<ToolbarStateService | null>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    isComposing: false,
    lastSelection: null,
    viewportTop: 0,
    viewportBottom: 600
  });
  
  // Initialize document model - moved after renderContent definition
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Expose methods to parent components
  React.useImperativeHandle(ref, () => ({
    applyFormatting: (type: 'bold' | 'highlight' | 'minimize', color?: string) => {
      const selection = getDocumentSelection();
      if (!selection || selection.isCollapsed) return;
      
      let formatting: any = {
        type,
        start: selection.start,
        end: selection.end,
        id: `fmt-${Date.now()}`
      };
      
      if (type === 'highlight' && color) {
        formatting.color = color;
      }
      
      documentRef.current.applyFormatting(formatting);
      renderContent();
      
      // Update toolbar state
      if (toolbarStateRef.current) {
        toolbarStateRef.current.updateSelection({
          start: selection.start,
          end: selection.end,
          isCollapsed: selection.isCollapsed
        });
      }
    },
    
    clearFormatting: () => {
      const selection = getDocumentSelection();
      if (!selection || selection.isCollapsed) return;
      
      documentRef.current.removeFormatting(selection.start, selection.end);
      renderContent();
      
      // Update toolbar state
      if (toolbarStateRef.current) {
        toolbarStateRef.current.updateSelection({
          start: selection.start,
          end: selection.end,
          isCollapsed: selection.isCollapsed
        });
      }
    },
    
    setBlockType: (type: string) => {
      const selection = getDocumentSelection();
      if (!selection) return;
      
      // Find the block at cursor position
      const blocks = documentRef.current.getBlocks();
      const block = blocks.find(b => 
        selection.start >= b.offset && selection.start <= b.offset + b.length
      );
      
      if (block) {
        block.type = type as any;
        renderContent();
      }
    },
    
    getDocument: () => documentRef.current
  }), [getDocumentSelection, renderContent]);

  /**
   * Convert document offset to DOM position
   */
  const offsetToDOM = useCallback((offset: number): { node: Node; offset: number } | null => {
    if (!editorRef.current) return null;
    
    // Handle empty editor
    if (editorRef.current.childNodes.length === 0) {
      return null;
    }
    
    // Special case for offset 0 in empty block
    if (offset === 0 && editorRef.current.firstChild) {
      const firstBlock = editorRef.current.firstChild as HTMLElement;
      if (firstBlock.innerHTML === '<br>') {
        return {
          node: firstBlock,
          offset: 0
        };
      }
    }
    
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            return NodeFilter.FILTER_ACCEPT;
          }
          if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR') {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    let currentOffset = 0;
    let node = walker.nextNode();
    
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const textLength = codeUnitLength(node.textContent || '');
        
        if (currentOffset + textLength >= offset) {
          return {
            node,
            offset: offset - currentOffset
          };
        }
        
        currentOffset += textLength;
      }
      
      node = walker.nextNode();
    }
    
    // If offset is at end, return last position
    const lastChild = editorRef.current.lastChild;
    if (lastChild) {
      const lastText = lastChild.lastChild;
      if (lastText && lastText.nodeType === Node.TEXT_NODE) {
        return {
          node: lastText,
          offset: codeUnitLength(lastText.textContent || '')
        };
      } else if (lastChild.nodeType === Node.ELEMENT_NODE) {
        return {
          node: lastChild,
          offset: 0
        };
      }
    }
    
    return null;
  }, []);

  /**
   * Convert DOM position to document offset
   */
  const domToOffset = useCallback((container: Node, offset: number): number => {
    if (!editorRef.current) return 0;
    
    // Handle BR elements and empty blocks
    if (container.nodeType === Node.ELEMENT_NODE) {
      const elem = container as HTMLElement;
      if (elem.innerHTML === '<br>' || elem.childNodes.length === 0) {
        // Find the block's position
        let blockOffset = 0;
        const blocks = documentRef.current.getBlocks();
        for (const block of blocks) {
          if (elem.getAttribute('data-block-id') === block.id) {
            return block.offset;
          }
        }
      }
    }
    
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            return NodeFilter.FILTER_ACCEPT;
          }
          if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR') {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    let currentOffset = 0;
    let node = walker.nextNode();
    
    while (node) {
      if (node === container) {
        return currentOffset + offset;
      }
      
      if (node.nodeType === Node.TEXT_NODE) {
        currentOffset += codeUnitLength(node.textContent || '');
      }
      
      node = walker.nextNode();
    }
    
    return currentOffset;
  }, []);

  /**
   * Get current selection in document coordinates
   */
  const getDocumentSelection = useCallback((): EditorSelection | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const start = domToOffset(range.startContainer, range.startOffset);
    const end = domToOffset(range.endContainer, range.endOffset);
    
    return {
      start,
      end,
      isCollapsed: start === end,
      text: documentRef.current.getText(start, end)
    };
  }, [domToOffset]);

  /**
   * Set selection in the editor
   */
  const setDocumentSelection = useCallback((start: number, end: number) => {
    const startPos = offsetToDOM(start);
    const endPos = offsetToDOM(end);
    
    if (!startPos || !endPos) return;
    
    const selection = window.getSelection();
    if (!selection) return;
    
    const range = document.createRange();
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);
    
    selection.removeAllRanges();
    selection.addRange(range);
  }, [offsetToDOM]);

  /**
   * Render content with formatting
   */
  const renderContent = useCallback(() => {
    if (!editorRef.current) return;
    
    const blocks = documentRef.current.getBlocks();
    const container = editorRef.current;
    
    // Save selection
    const selection = getDocumentSelection();
    
    // Clear and rebuild content
    container.innerHTML = '';
    
    // Handle empty document
    if (blocks.length === 0 || (blocks.length === 1 && blocks[0].length === 0)) {
      const blockEl = document.createElement('div');
      blockEl.className = 'editor-block editor-block-paragraph';
      blockEl.setAttribute('data-block-id', blocks[0]?.id || 'empty');
      blockEl.setAttribute('data-block-type', 'paragraph');
      blockEl.innerHTML = '<br>'; // Add BR to maintain height
      container.appendChild(blockEl);
      
      // Set cursor at start
      requestAnimationFrame(() => {
        if (editorRef.current) {
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStart(blockEl, 0);
          range.setEnd(blockEl, 0);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      });
      return;
    }
    
    let currentY = 0;
    let lineNumber = 1;
    
    for (const block of blocks) {
      const blockEl = document.createElement('div');
      blockEl.className = `editor-block editor-block-${block.type}`;
      blockEl.setAttribute('data-block-id', block.id);
      blockEl.setAttribute('data-block-type', block.type);
      
      // Apply block-specific styles
      if (block.type.startsWith('heading')) {
        const level = parseInt(block.type.replace('heading', ''));
        blockEl.style.fontSize = `${2.5 - (level - 1) * 0.3}rem`;
        blockEl.style.fontWeight = '600';
        blockEl.style.marginBottom = '0.5rem';
      }
      
      // Use DOM decorator to apply formatting
      if (decoratorRef.current) {
        decoratorRef.current.decorateBlock(block, blockEl);
      } else {
        // Fallback to simple rendering
        const formattedHTML = renderFormattedText(block);
        blockEl.innerHTML = formattedHTML || '<br>'; // Add BR for empty blocks
      }
      
      // Add block to DOM first
      container.appendChild(blockEl);
      
      // Observer will handle line measurements - no manual updates needed
    }
    
    // Restore selection
    if (selection) {
      requestAnimationFrame(() => {
        setDocumentSelection(selection.start, selection.end);
      });
    }
    
    // Release unused spans
    if (decoratorRef.current) {
      decoratorRef.current.releaseUnusedSpans();
    }
  }, [getDocumentSelection, setDocumentSelection]);

  /**
   * Render formatted text for a block
   */
  const renderFormattedText = useCallback((block: DocumentContent): string => {
    const formatting = documentRef.current.getFormattingInRange(
      block.offset,
      block.offset + block.length
    );
    
    if (formatting.length === 0) {
      return escapeHtml(block.text);
    }
    
    // Sort formatting by start position and priority
    const sorted = formatting.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      // Priority: minimize > highlight > bold
      const priority = { minimize: 3, highlight: 2, bold: 1 };
      return priority[b.type] - priority[a.type];
    });
    
    let html = '';
    let lastOffset = block.offset;
    
    for (const fmt of sorted) {
      // Add unformatted text before this formatting
      if (fmt.start > lastOffset) {
        html += escapeHtml(sliceByCodeUnits(block.text, lastOffset - block.offset, fmt.start - block.offset));
      }
      
      // Add formatted text
      const startInBlock = Math.max(0, fmt.start - block.offset);
      const endInBlock = Math.min(block.length, fmt.end - block.offset);
      const formattedText = sliceByCodeUnits(block.text, startInBlock, endInBlock);
      
      html += wrapWithFormatting(formattedText, fmt);
      lastOffset = block.offset + endInBlock;
    }
    
    // Add remaining unformatted text
    if (lastOffset < block.offset + block.length) {
      html += escapeHtml(sliceByCodeUnits(block.text, lastOffset - block.offset));
    }
    
    return html;
  }, []);

  /**
   * Wrap text with formatting span
   */
  const wrapWithFormatting = (text: string, formatting: TextFormatting): string => {
    const classes = [`fmt-${formatting.type}`];
    
    if (formatting.type === 'highlight' && formatting.color) {
      classes.push(`fmt-highlight-${formatting.color}`);
    }
    
    return `<span class="${classes.join(' ')}" data-fmt-id="${formatting.id}">${escapeHtml(text)}</span>`;
  };

  /**
   * Escape HTML characters
   */
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };


  /**
   * Handle beforeinput event - intercept all editing operations
   */
  const handleBeforeInput = useCallback((e: InputEvent) => {
    if (inputHandlerRef.current) {
      inputHandlerRef.current.handleBeforeInput(e);
    }
  }, []);

  /**
   * Handle input events (fallback for any missed beforeinput)
   */
  const handleInput = useCallback((e: Event) => {
    // This should rarely be called since beforeinput handles everything
    // Keep as fallback for edge cases
    console.warn('Input event fired - should be handled by beforeinput');
  }, []);

  /**
   * Handle selection change
   */
  const handleSelectionChange = useCallback(() => {
    const selection = getDocumentSelection();
    
    if (selection && (!editorState.lastSelection || 
        selection.start !== editorState.lastSelection.start ||
        selection.end !== editorState.lastSelection.end)) {
      setEditorState(prev => ({ ...prev, lastSelection: selection }));
      onSelectionChange?.(selection);
      
      // Update toolbar state
      if (toolbarStateRef.current) {
        toolbarStateRef.current.updateSelection({
          start: selection.start,
          end: selection.end,
          isCollapsed: selection.isCollapsed
        });
      }
    } else if (!selection && editorState.lastSelection) {
      // Selection was cleared
      setEditorState(prev => ({ ...prev, lastSelection: null }));
      onSelectionChange?.(null);
      
      // Clear toolbar state
      if (toolbarStateRef.current) {
        toolbarStateRef.current.updateSelection(null);
      }
    }
  }, [getDocumentSelection, editorState.lastSelection, onSelectionChange]);

  /**
   * Handle keydown events
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // The beforeinput event will handle most editing operations
    // We only need to handle special cases that don't trigger beforeinput
    
    // Handle formatting shortcuts
    if (e.metaKey || e.ctrlKey) {
      const selection = getDocumentSelection();
      if (!selection || selection.isCollapsed) return;
      
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          documentRef.current.applyFormatting({
            type: 'bold',
            start: selection.start,
            end: selection.end,
            id: `fmt-${Date.now()}`
          });
          renderContent();
          // Update toolbar state after formatting change
          if (toolbarStateRef.current) {
            toolbarStateRef.current.updateSelection({
              start: selection.start,
              end: selection.end,
              isCollapsed: selection.isCollapsed
            });
          }
          break;
          
        case 'h': {
          e.preventDefault();
          // Cycle through highlight colors
          const colors: TextFormatting['color'][] = ['yellow', 'blue', 'green', 'pink'];
          const currentHighlight = documentRef.current.getFormattingAt(selection.start)
            .find(f => f.type === 'highlight');
          const nextColor = currentHighlight?.color 
            ? colors[(colors.indexOf(currentHighlight.color) + 1) % colors.length]
            : colors[0];
          
          documentRef.current.applyFormatting({
            type: 'highlight',
            color: nextColor,
            start: selection.start,
            end: selection.end,
            id: `fmt-${Date.now()}`
          });
          renderContent();
          // Update toolbar state after formatting change
          if (toolbarStateRef.current) {
            toolbarStateRef.current.updateSelection({
              start: selection.start,
              end: selection.end,
              isCollapsed: selection.isCollapsed
            });
          }
          break;
        }
          
        case 'm':
          e.preventDefault();
          documentRef.current.applyFormatting({
            type: 'minimize',
            start: selection.start,
            end: selection.end,
            id: `fmt-${Date.now()}`
          });
          renderContent();
          // Update toolbar state after formatting change
          if (toolbarStateRef.current) {
            toolbarStateRef.current.updateSelection({
              start: selection.start,
              end: selection.end,
              isCollapsed: selection.isCollapsed
            });
          }
          break;
          
        case 'c':
          if (e.shiftKey) {
            e.preventDefault();
            documentRef.current.removeFormatting(selection.start, selection.end);
            renderContent();
          // Update toolbar state after formatting change
          if (toolbarStateRef.current) {
            toolbarStateRef.current.updateSelection({
              start: selection.start,
              end: selection.end,
              isCollapsed: selection.isCollapsed
            });
          }
          }
          break;
      }
    }
  }, [getDocumentSelection, renderContent]);

  /**
   * Handle composition events
   */
  const handleCompositionStart = useCallback((e: CompositionEvent) => {
    setEditorState(prev => ({ ...prev, isComposing: true }));
    if (inputHandlerRef.current) {
      inputHandlerRef.current.handleCompositionStart(e);
    }
  }, []);

  const handleCompositionUpdate = useCallback((e: CompositionEvent) => {
    if (inputHandlerRef.current) {
      inputHandlerRef.current.handleCompositionUpdate(e);
    }
  }, []);

  const handleCompositionEnd = useCallback((e: CompositionEvent) => {
    setEditorState(prev => ({ ...prev, isComposing: false }));
    if (inputHandlerRef.current) {
      inputHandlerRef.current.handleCompositionEnd(e);
    }
  }, []);

  // Initialize input handler and document model after renderContent is defined
  useEffect(() => {
    if (!inputHandlerRef.current) {
      inputHandlerRef.current = new InputHandlerService(documentRef.current, {
        getSelection: getDocumentSelection,
        setSelection: setDocumentSelection,
        renderContent,
        onChange,
        decorator: decoratorRef.current || undefined
      });
    }
    
    if (!toolbarStateRef.current) {
      toolbarStateRef.current = new ToolbarStateService(documentRef.current);
      
      // Subscribe to toolbar state changes
      if (onToolbarStateChange) {
        const unsubscribe = toolbarStateRef.current.subscribe(onToolbarStateChange);
        return unsubscribe;
      }
    }
    
    // Initialize DOM decorator
    if (!decoratorRef.current && editorRef.current) {
      // Check if we need shadow DOM for iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      decoratorRef.current = new DOMDecoratorService(documentRef.current, {
        container: editorRef.current,
        useShadowDOM: isIOS && (editorRef.current.getAttribute('data-plaintext-only') === 'true')
      });
    }
    
    if (!isInitialized) {
      if (initialContent && initialContent.length > 0) {
        // Insert initial content
        documentRef.current.insertText(0, initialContent);
        // Create blocks for newlines
        const lines = initialContent.split('\n');
        let offset = 0;
        for (let i = 0; i < lines.length; i++) {
          if (i > 0) {
            documentRef.current.createBlock(offset);
          }
          offset += codeUnitLength(lines[i]) + 1; // +1 for newline
        }
      }
      setIsInitialized(true);
      renderContent();
    }
  }, [initialContent, renderContent, isInitialized, getDocumentSelection, setDocumentSelection, onChange]);

  /**
   * Setup event listeners
   */
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    
    // Add beforeinput listener to intercept all editing
    editor.addEventListener('beforeinput', handleBeforeInput as any);
    editor.addEventListener('input', handleInput);
    document.addEventListener('selectionchange', handleSelectionChange);
    
    // Attach line update observer to editor
    lineObserverRef.current.attach(editor);
    
    return () => {
      editor.removeEventListener('beforeinput', handleBeforeInput as any);
      editor.removeEventListener('input', handleInput);
      document.removeEventListener('selectionchange', handleSelectionChange);
      lineObserverRef.current.detach();
    };
  }, [handleBeforeInput, handleInput, handleSelectionChange, renderContent]);

  /**
   * Subscribe to document changes
   */
  useEffect(() => {
    const unsubscribe = documentRef.current.onChange((change: DocumentChange) => {
      // Handle external changes if needed
    });
    
    return unsubscribe;
  }, []);

  return (
    <div className={`editor-container ${className}`}>
      <div className="editor-gutter">
        <LineNumbers 
          lineRegistry={lineRegistryRef.current}
          lineObserver={lineObserverRef.current}
          activeLineNumber={editorState.lastSelection ? 
            lineRegistryRef.current.getLineByOffset(editorState.lastSelection.start)?.lineNumber : 
            undefined
          }
        />
      </div>
      <div
        ref={editorRef}
        className="editor-content"
        contentEditable
        spellCheck={false}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionUpdate={handleCompositionUpdate}
        onCompositionEnd={handleCompositionEnd}
        role="textbox"
        aria-multiline="true"
        aria-placeholder={placeholder}
        style={{
          minHeight: '100%',
          outline: 'none',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'monospace',
          fontSize: '14px',
          lineHeight: '1.15rem',
          width: '100%',
          maxWidth: '600px',
          boxSizing: 'border-box'
        }}
      />
    </div>
  );
});

SingleContentEditableEditor.displayName = 'SingleContentEditableEditor';

/**
 * Line numbers component
 */
interface LineNumbersProps {
  lineRegistry: LineRegistry;
  lineObserver: LineUpdateObserver;
  activeLineNumber?: number;
}

function LineNumbers({ lineRegistry, lineObserver, activeLineNumber }: LineNumbersProps) {
  const [lines, setLines] = useState<VisualLine[]>([]);
  
  useEffect(() => {
    // Subscribe to line updates from observer
    const updateLines = () => {
      const allLines: VisualLine[] = [];
      for (let i = 1; i <= lineRegistry.getLineCount(); i++) {
        const line = lineRegistry.getLine(i);
        if (line) allLines.push(line);
      }
      setLines(allLines);
    };
    
    // Initial update
    updateLines();
    
    // Subscribe to observer updates (event-driven, no polling)
    const unsubscribe = lineObserver.subscribe(updateLines);
    
    return unsubscribe;
  }, [lineRegistry, lineObserver]);
  
  // Group lines by block to add margins between blocks
  const linesByBlock = lines.reduce((acc, line) => {
    if (!acc[line.blockId]) {
      acc[line.blockId] = [];
    }
    acc[line.blockId].push(line);
    return acc;
  }, {} as Record<string, VisualLine[]>);
  
  return (
    <div className="line-numbers" style={{ width: '50px' }}>
      {Object.entries(linesByBlock).map(([blockId, blockLines], blockIndex) => (
        <div key={blockId} style={{ marginBottom: blockIndex < Object.keys(linesByBlock).length - 1 ? '8px' : 0 }}>
          {blockLines.map(line => (
            <div
              key={line.lineNumber}
              className={`line-number ${line.lineNumber === activeLineNumber ? 'active' : ''}`}
              style={{
                height: `${line.height}px`,
                lineHeight: `${line.height}px`,
                color: line.lineNumber === activeLineNumber ? '#ffffff' : '#6a6a6a',
                textAlign: 'center',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}
            >
              {line.lineNumber}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}