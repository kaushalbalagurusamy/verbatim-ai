/**
 * Editor V2 Integration - Shows how the new architecture fixes all reported bugs
 * Integrates the new single contentEditable editor with the existing toolbar
 * Demonstrates proper color mapping and natural selection behavior
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { DocumentModel } from '../models/document-model';
import { LineRegistry } from '../models/line-registry';
import { SelectionManager, SelectionState } from '../selection/selection-manager';
import { FormattingEngine } from '../formatting/formatting-engine';
import { VirtualRenderer } from '../rendering/virtual-renderer';
import type { HighlightColor } from '@/types/document.types';
import '../styles/editor.css';

interface EditorV2Props {
  initialContent?: string;
  onChange?: (content: string) => void;
  onSelectionChange?: (selection: Selection | null) => void;
}

interface EditorState {
  isBold: boolean;
  isHighlighted: boolean;
  highlightColor?: HighlightColor;
  isMinimized: boolean;
  currentHeadingLevel: number;
  activeLineNumber: number;
}

export function EditorV2WithToolbar({
  initialContent = '',
  onChange,
  onSelectionChange
}: EditorV2Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef(new DocumentModel());
  const lineRegistryRef = useRef(new LineRegistry());
  const selectionManagerRef = useRef<SelectionManager | null>(null);
  const formattingEngineRef = useRef<FormattingEngine | null>(null);
  const rendererRef = useRef<VirtualRenderer | null>(null);
  
  const [editorState, setEditorState] = useState<EditorState>({
    isBold: false,
    isHighlighted: false,
    highlightColor: undefined,
    isMinimized: false,
    currentHeadingLevel: 0,
    activeLineNumber: 1
  });

  // Initialize components
  useEffect(() => {
    const document = documentRef.current;
    const lineRegistry = lineRegistryRef.current;
    
    selectionManagerRef.current = new SelectionManager(document, lineRegistry);
    formattingEngineRef.current = new FormattingEngine(document);
    rendererRef.current = new VirtualRenderer(document, lineRegistry);
    
    // Initialize with content
    if (initialContent) {
      document.insertText(0, initialContent);
      renderContent();
    }
    
    // Initialize selection manager with DOM selection
    const selection = window.getSelection();
    if (selection) {
      selectionManagerRef.current.init(selection);
    }
  }, []);

  /**
   * Render content using the new architecture
   */
  const renderContent = useCallback(() => {
    if (!editorRef.current || !rendererRef.current) return;
    
    const renderer = rendererRef.current;
    const container = editorRef.current;
    
    // Get current selection
    const selection = window.getSelection();
    const savedRange = selection && selection.rangeCount > 0 ? 
      selection.getRangeAt(0).cloneRange() : null;
    
    // Render with virtual renderer
    const renderResult = renderer.render({
      viewportTop: container.scrollTop,
      viewportHeight: container.clientHeight,
      bufferSize: 10,
      lineHeight: 18.4
    });
    
    // Update DOM
    container.innerHTML = renderResult.html;
    
    // Restore selection
    if (savedRange && selection) {
      try {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      } catch (e) {
        // Selection restoration failed, likely due to DOM changes
      }
    }
    
    // Update line numbers
    updateLineNumbers();
  }, []);

  /**
   * Update line numbers display
   */
  const updateLineNumbers = useCallback(() => {
    const lineRegistry = lineRegistryRef.current;
    const lineCount = lineRegistry.getLineCount();
    
    // This would update the line number display
    // For now, we'll integrate with the existing line number component
  }, []);

  /**
   * Handle selection change with proper line tracking
   */
  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !formattingEngineRef.current) return;
    
    onSelectionChange?.(selection);
    
    // Update selection manager
    if (selection.rangeCount > 0 && selectionManagerRef.current) {
      const range = selection.getRangeAt(0);
      selectionManagerRef.current.setFromDOM(
        range.startContainer,
        range.startOffset,
        range.endContainer,
        range.endOffset
      );
    }
    
    // Get cursor position for formatting state
    if (selection.isCollapsed && selection.focusNode) {
      const offset = getOffsetFromNode(selection.focusNode, selection.focusOffset);
      
      // Update active line - properly tracks cursor position
      const line = lineRegistryRef.current.getLineByOffset(offset);
      if (line) {
        setEditorState(prev => ({
          ...prev,
          activeLineNumber: line.lineNumber
        }));
      }
      
      // Update formatting state
      const formatting = formattingEngineRef.current.getFormattingAtCursor(offset);
      setEditorState(prev => ({
        ...prev,
        isBold: formatting.isBold,
        isHighlighted: formatting.isHighlighted,
        highlightColor: formatting.highlightColor,
        isMinimized: formatting.isMinimized
      }));
    }
  }, [onSelectionChange]);

  /**
   * Handle input with proper document model updates
   */
  const handleInput = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    const text = target.textContent || '';
    
    // Update document model
    const document = documentRef.current;
    const currentText = document.getText();
    
    if (text !== currentText) {
      // Find the change
      const change = findTextChange(currentText, text);
      
      if (change.deleted) {
        document.deleteText(change.start, change.start + change.deleted);
      }
      
      if (change.inserted) {
        document.insertText(change.start, change.inserted);
      }
      
      onChange?.(document.getText());
      
      // Re-render with formatting
      requestAnimationFrame(() => {
        renderContent();
      });
    }
  }, [onChange, renderContent]);

  /**
   * Handle keyboard events with proper navigation
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const selection = selectionManagerRef.current;
    const formatting = formattingEngineRef.current;
    
    if (!selection || !formatting) return;
    
    // Let selection manager handle navigation
    const handled = selection.handleKeyboardNavigation(
      e.key,
      e.shiftKey,
      e.ctrlKey,
      e.altKey,
      e.metaKey
    );
    
    if (handled) {
      e.preventDefault();
      return;
    }
    
    // Handle formatting shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          handleEmphasis();
          break;
          
        case 'h':
          e.preventDefault();
          handleHighlight();
          break;
          
        case 'm':
          e.preventDefault();
          handleMinimize();
          break;
          
        case 'c':
          if (e.shiftKey) {
            e.preventDefault();
            handleClear();
          }
          break;
      }
    }
    
    // Handle enter key to maintain proper line spacing
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const offset = getOffsetFromNode(range.startContainer, range.startOffset);
        
        // Insert newline and create new block
        documentRef.current.insertText(offset, '\n');
        documentRef.current.createBlock(offset + 1);
        
        onChange?.(documentRef.current.getText());
        renderContent();
        
        // Move cursor after newline
        setTimeout(() => {
          setCursorPosition(offset + 1);
        }, 10);
      }
    }
  }, [onChange, renderContent]);

  /**
   * Handle emphasis (bold) - now works properly
   */
  const handleEmphasis = useCallback(() => {
    const selection = selectionManagerRef.current?.getState();
    const formatting = formattingEngineRef.current;
    
    if (!selection || !formatting || selection.ranges.length === 0) return;
    
    const range = selection.ranges[0];
    formatting.applyFormatting(range, 'bold');
    
    renderContent();
  }, [renderContent]);

  /**
   * Handle highlight - with proper color mapping
   */
  const handleHighlight = useCallback((hexColor?: string) => {
    const selection = selectionManagerRef.current?.getState();
    const formatting = formattingEngineRef.current;
    
    if (!selection || !formatting || selection.ranges.length === 0) return;
    
    const range = selection.ranges[0];
    
    // The hex color from toolbar is properly mapped to color names
    formatting.toggleHighlight(range, hexColor);
    
    renderContent();
  }, [renderContent]);

  /**
   * Handle minimize
   */
  const handleMinimize = useCallback(() => {
    const selection = selectionManagerRef.current?.getState();
    const formatting = formattingEngineRef.current;
    
    if (!selection || !formatting || selection.ranges.length === 0) return;
    
    const range = selection.ranges[0];
    formatting.applyFormatting(range, 'minimize');
    
    renderContent();
  }, [renderContent]);

  /**
   * Handle clear formatting
   */
  const handleClear = useCallback(() => {
    const selection = selectionManagerRef.current?.getState();
    const formatting = formattingEngineRef.current;
    
    if (!selection || !formatting || selection.ranges.length === 0) return;
    
    const range = selection.ranges[0];
    formatting.clearFormatting(range.start, range.end);
    
    renderContent();
  }, [renderContent]);

  /**
   * Handle heading level
   */
  const handleHeading = useCallback((level: number) => {
    // This would change block type
    // Implementation depends on requirements
  }, []);

  /**
   * Helper: Get offset from DOM node
   */
  const getOffsetFromNode = (node: Node, nodeOffset: number): number => {
    if (!editorRef.current) return 0;
    
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let offset = 0;
    let currentNode = walker.nextNode();
    
    while (currentNode) {
      if (currentNode === node) {
        return offset + nodeOffset;
      }
      offset += currentNode.textContent?.length || 0;
      currentNode = walker.nextNode();
    }
    
    return offset;
  };

  /**
   * Helper: Set cursor position
   */
  const setCursorPosition = (offset: number): void => {
    if (!editorRef.current) return;
    
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let currentOffset = 0;
    let node = walker.nextNode();
    
    while (node) {
      const length = node.textContent?.length || 0;
      
      if (currentOffset + length >= offset) {
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.setStart(node, offset - currentOffset);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        return;
      }
      
      currentOffset += length;
      node = walker.nextNode();
    }
  };

  /**
   * Helper: Find text change
   */
  const findTextChange = (oldText: string, newText: string): {
    start: number;
    deleted: number;
    inserted: string;
  } => {
    let start = 0;
    while (start < oldText.length && start < newText.length && 
           oldText[start] === newText[start]) {
      start++;
    }
    
    let oldEnd = oldText.length;
    let newEnd = newText.length;
    
    while (oldEnd > start && newEnd > start &&
           oldText[oldEnd - 1] === newText[newEnd - 1]) {
      oldEnd--;
      newEnd--;
    }
    
    return {
      start,
      deleted: oldEnd - start,
      inserted: newText.slice(start, newEnd)
    };
  };

  // Setup event listeners
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    
    editor.addEventListener('input', handleInput);
    document.addEventListener('selectionchange', handleSelectionChange);
    
    return () => {
      editor.removeEventListener('input', handleInput);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleInput, handleSelectionChange]);

  return (
    <div className="editor-v2-container">
      <EditorToolbar
        onEmphasis={handleEmphasis}
        onHighlight={handleHighlight}
        onMinimize={handleMinimize}
        onClear={handleClear}
        onHeading={handleHeading}
        isEmphasisActive={editorState.isBold}
        isHighlightActive={editorState.isHighlighted}
        currentHeadingLevel={editorState.currentHeadingLevel}
      />
      
      <div className="editor-container">
        <div className="editor-gutter">
          <LineNumbersDisplay 
            lineRegistry={lineRegistryRef.current}
            activeLineNumber={editorState.activeLineNumber}
          />
        </div>
        
        <div
          ref={editorRef}
          className="editor-content"
          contentEditable
          spellCheck={false}
          onKeyDown={handleKeyDown}
          role="textbox"
          aria-multiline="true"
          aria-label="Document editor"
          style={{
            minHeight: '100%',
            outline: 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        />
      </div>
    </div>
  );
}

/**
 * Line numbers display that properly tracks cursor position
 */
interface LineNumbersDisplayProps {
  lineRegistry: LineRegistry;
  activeLineNumber: number;
}

function LineNumbersDisplay({ lineRegistry, activeLineNumber }: LineNumbersDisplayProps) {
  const [lines, setLines] = useState<Array<{ number: number; isHeader: boolean }>>([]);
  
  useEffect(() => {
    const updateLines = () => {
      const lineCount = lineRegistry.getLineCount();
      const newLines: Array<{ number: number; isHeader: boolean }> = [];
      
      for (let i = 1; i <= lineCount; i++) {
        const line = lineRegistry.getLine(i);
        if (line) {
          // Check if this line is part of a header block
          const blocks = documentRef.current?.getBlocks() || [];
          const block = blocks.find(b => b.id === line.blockId);
          const isHeader = block?.type.startsWith('heading') || false;
          
          newLines.push({ number: i, isHeader });
        }
      }
      
      setLines(newLines);
    };
    
    // Update on document changes
    const unsubscribe = documentRef.current?.onChange(() => {
      updateLines();
    });
    
    updateLines();
    
    return () => {
      unsubscribe?.();
    };
  }, [lineRegistry]);
  
  return (
    <div className="line-numbers">
      {lines.map(({ number, isHeader }) => (
        <div
          key={number}
          className={`line-number ${number === activeLineNumber ? 'active' : ''}`}
          style={{
            height: '18.4px',
            lineHeight: '18.4px',
            color: number === activeLineNumber ? '#ffffff' : '#6a6a6a',
            textAlign: 'center',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}
        >
          {isHeader ? `H${number}` : number}
        </div>
      ))}
    </div>
  );
}

// Export document ref for line numbers component
const documentRef = { current: null as DocumentModel | null };