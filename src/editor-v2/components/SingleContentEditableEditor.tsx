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

interface EditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  onSelectionChange?: (selection: EditorSelection | null) => void;
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

export function SingleContentEditableEditor({
  initialContent = '',
  onChange,
  onSelectionChange,
  placeholder = 'Start typing...',
  className = ''
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<DocumentModel>(new DocumentModel());
  const lineRegistryRef = useRef<LineRegistry>(new LineRegistry());
  const [editorState, setEditorState] = useState<EditorState>({
    isComposing: false,
    lastSelection: null,
    viewportTop: 0,
    viewportBottom: 600
  });
  
  // Initialize document model - moved after renderContent definition
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Convert document offset to DOM position
   */
  const offsetToDOM = useCallback((offset: number): { node: Node; offset: number } | null => {
    if (!editorRef.current) return null;
    
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let currentOffset = 0;
    let node = walker.nextNode();
    
    while (node) {
      const textLength = codeUnitLength(node.textContent || '');
      
      if (currentOffset + textLength >= offset) {
        return {
          node,
          offset: offset - currentOffset
        };
      }
      
      currentOffset += textLength;
      node = walker.nextNode();
    }
    
    // If offset is at end, return last position
    const lastChild = editorRef.current.lastChild;
    if (lastChild) {
      return {
        node: lastChild,
        offset: codeUnitLength(lastChild.textContent || '')
      };
    }
    
    return null;
  }, []);

  /**
   * Convert DOM position to document offset
   */
  const domToOffset = useCallback((container: Node, offset: number): number => {
    if (!editorRef.current) return 0;
    
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let currentOffset = 0;
    let node = walker.nextNode();
    
    while (node) {
      if (node === container) {
        return currentOffset + offset;
      }
      
      currentOffset += codeUnitLength(node.textContent || '');
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
      
      // Render text with formatting
      const formattedHTML = renderFormattedText(block);
      blockEl.innerHTML = formattedHTML;
      
      // Add block to DOM first
      container.appendChild(blockEl);
      
      // Now calculate visual lines for this block
      const blockHeight = calculateBlockHeight(blockEl, block);
      const linesInBlock = Math.max(1, Math.ceil(blockHeight / 18.4)); // At least 1 line
      
      // Update line registry
      for (let i = 0; i < linesInBlock; i++) {
        const lineHeight = 18.4;
        const line: VisualLine = {
          lineNumber: lineNumber++,
          startOffset: block.offset + (i * Math.floor(block.length / linesInBlock)),
          endOffset: block.offset + ((i + 1) * Math.floor(block.length / linesInBlock)),
          y: currentY,
          height: lineHeight,
          blockId: block.id,
          indexInBlock: i
        };
        
        lineRegistryRef.current.setLine(line);
        currentY += lineHeight;
      }
      
      currentY += 8; // Block margin
    }
    
    // Restore selection
    if (selection) {
      requestAnimationFrame(() => {
        setDocumentSelection(selection.start, selection.end);
      });
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
   * Calculate block height for line calculations
   */
  const calculateBlockHeight = (element: HTMLElement, block: DocumentContent): number => {
    // Temporarily make visible if needed
    const wasHidden = element.style.display === 'none';
    if (wasHidden) element.style.display = 'block';
    
    const rect = element.getBoundingClientRect();
    let height = rect.height;
    
    // In test environment, estimate height based on text length and container width
    if (height === 0 || rect.width === 0) {
      const containerWidth = editorRef.current?.clientWidth || 600; // Default width
      const charWidth = 8; // Approximate monospace character width
      const charsPerLine = Math.floor(containerWidth / charWidth);
      const estimatedLines = Math.ceil(block.length / charsPerLine);
      height = estimatedLines * 18.4;
    }
    
    if (wasHidden) element.style.display = 'none';
    
    return height || 18.4; // Default line height
  };

  /**
   * Handle input events
   */
  const handleInput = useCallback((e: Event) => {
    if (editorState.isComposing) return;
    
    const selection = getDocumentSelection();
    if (!selection) return;
    
    // Get the current text content
    const currentText = editorRef.current?.textContent || '';
    const modelText = documentRef.current.getText();
    
    // Find the difference
    if (currentText !== modelText) {
      // Simple case: insertion at cursor
      if (codeUnitLength(currentText) > codeUnitLength(modelText) && selection.isCollapsed) {
        const insertedText = sliceByCodeUnits(currentText, selection.start, selection.start + (codeUnitLength(currentText) - codeUnitLength(modelText)));
        documentRef.current.insertText(selection.start, insertedText);
      }
      // Simple case: deletion
      else if (codeUnitLength(currentText) < codeUnitLength(modelText)) {
        const deletedLength = codeUnitLength(modelText) - codeUnitLength(currentText);
        documentRef.current.deleteText(selection.start, selection.start + deletedLength);
      }
      // Complex case: replacement
      else {
        // Find common prefix and suffix to isolate the change
        let prefixLen = 0;
        while (prefixLen < codeUnitLength(currentText) && prefixLen < codeUnitLength(modelText) &&
               currentText[prefixLen] === modelText[prefixLen]) {
          prefixLen++;
        }
        
        let suffixLen = 0;
        while (suffixLen < codeUnitLength(currentText) - prefixLen && 
               suffixLen < codeUnitLength(modelText) - prefixLen &&
               currentText[codeUnitLength(currentText) - 1 - suffixLen] === 
               modelText[codeUnitLength(modelText) - 1 - suffixLen]) {
          suffixLen++;
        }
        
        const replaceStart = prefixLen;
        const replaceEnd = codeUnitLength(modelText) - suffixLen;
        const newText = sliceByCodeUnits(currentText, prefixLen, codeUnitLength(currentText) - suffixLen);
        
        documentRef.current.replaceText(replaceStart, replaceEnd, newText);
      }
      
      // Trigger onChange
      onChange?.(documentRef.current.getText());
      
      // Re-render with formatting
      renderContent();
    }
  }, [editorState.isComposing, getDocumentSelection, onChange, renderContent]);

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
    }
  }, [getDocumentSelection, editorState.lastSelection, onSelectionChange]);

  /**
   * Handle keydown events
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle special keys
    if (e.key === 'Enter') {
      e.preventDefault();
      const selection = getDocumentSelection();
      if (selection) {
        const blocks = documentRef.current.getBlocks();
        const currentBlock = blocks.find(b => 
          selection.start >= b.offset && selection.start <= b.offset + b.length
        );
        
        if (currentBlock) {
          // Delete any selected text first
          if (!selection.isCollapsed) {
            documentRef.current.deleteText(selection.start, selection.end);
          }
          
          // Calculate position within the block
          const positionInBlock = selection.start - currentBlock.offset;
          
          // Split the text at cursor position
          const beforeCursor = sliceByCodeUnits(currentBlock.text, 0, positionInBlock);
          const afterCursor = sliceByCodeUnits(currentBlock.text, positionInBlock);
          
          // Update current block with text before cursor
          const lengthDiff = currentBlock.length - codeUnitLength(beforeCursor);
          if (lengthDiff > 0) {
            documentRef.current.deleteText(selection.start, selection.start + lengthDiff);
          }
          
          // Insert newline and text after cursor
          documentRef.current.insertText(selection.start, '\n' + afterCursor);
          
          // Create new block at the newline position
          documentRef.current.createBlock(selection.start + 1);
          
          onChange?.(documentRef.current.getText());
          renderContent();
          
          // Set cursor at start of new block
          setTimeout(() => {
            setDocumentSelection(selection.start + 1, selection.start + 1);
          }, 10);
        }
      }
    }
    
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
          break;
          
        case 'c':
          if (e.shiftKey) {
            e.preventDefault();
            documentRef.current.removeFormatting(selection.start, selection.end);
            renderContent();
          }
          break;
      }
    }
  }, [getDocumentSelection, setDocumentSelection, onChange, renderContent]);

  /**
   * Handle composition events
   */
  const handleCompositionStart = useCallback(() => {
    setEditorState(prev => ({ ...prev, isComposing: true }));
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setEditorState(prev => ({ ...prev, isComposing: false }));
    handleInput(new Event('input'));
  }, [handleInput]);

  // Initialize document model after renderContent is defined
  useEffect(() => {
    if (!isInitialized && initialContent && documentRef.current.getLength() === 0) {
      documentRef.current.insertText(0, initialContent);
      // Create initial block if content has newlines
      const lines = initialContent.split('\n');
      let offset = 0;
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          documentRef.current.createBlock(offset);
        }
        offset += codeUnitLength(lines[i]) + 1; // +1 for newline
      }
      setIsInitialized(true);
      renderContent();
    }
  }, [initialContent, renderContent, isInitialized]);

  /**
   * Setup event listeners
   */
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
}

/**
 * Line numbers component
 */
interface LineNumbersProps {
  lineRegistry: LineRegistry;
  activeLineNumber?: number;
}

function LineNumbers({ lineRegistry, activeLineNumber }: LineNumbersProps) {
  const [lines, setLines] = useState<VisualLine[]>([]);
  const [updateCounter, setUpdateCounter] = useState(0);
  
  useEffect(() => {
    // Subscribe to line registry changes
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
    
    // Poll for changes
    const interval = setInterval(updateLines, 100);
    
    return () => clearInterval(interval);
  }, [lineRegistry]);
  
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