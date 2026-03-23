/**
 * Virtual Scroll Editor - Enhanced editor with virtual scrolling for line numbers and content
 * Implements viewport culling to handle large documents efficiently
 * Maintains 60 FPS scrolling performance on mid-tier hardware
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { DocumentModel, DocumentChange } from '../models/document-model';
import { LineRegistry, VisualLine } from '../models/line-registry';
import { TextFormatting } from '../data-structures/interval-tree';
import { DocumentContent } from '../data-structures/btree';
import { codeUnitLength, sliceByCodeUnits, getGraphemeAt } from '../utils/string-utils';
import { textMeasurementService } from '../utils/text-measurement';
import { LineUpdateObserver } from '../observers/line-update-observer';
import { VirtualRenderer, RenderOptions, RenderedBlock } from '../rendering/virtual-renderer';

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
  viewportHeight: number;
  scrollTop: number;
  visibleLines: VisualLine[];
  totalHeight: number;
}

interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  isScrolling: boolean;
  scrollDirection: 'up' | 'down' | 'none';
  lastScrollTime: number;
}

const BUFFER_SIZE = 20; // Lines to render above/below viewport
const SCROLL_THROTTLE = 16; // ~60 FPS
const LINE_HEIGHT = 18.4; // Default line height in pixels

export function VirtualScrollEditor({
  initialContent = '',
  onChange,
  onSelectionChange,
  placeholder = 'Start typing...',
  className = ''
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<DocumentModel>(new DocumentModel());
  const lineRegistryRef = useRef<LineRegistry>(new LineRegistry());
  const lineObserverRef = useRef<LineUpdateObserver>(
    new LineUpdateObserver(lineRegistryRef.current, documentRef.current)
  );
  const virtualRendererRef = useRef<VirtualRenderer>(
    new VirtualRenderer(documentRef.current, lineRegistryRef.current)
  );
  
  const [editorState, setEditorState] = useState<EditorState>({
    isComposing: false,
    lastSelection: null,
    viewportTop: 0,
    viewportHeight: 600,
    scrollTop: 0,
    visibleLines: [],
    totalHeight: 0
  });
  
  const scrollMetricsRef = useRef<ScrollMetrics>({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
    isScrolling: false,
    scrollDirection: 'none',
    lastScrollTime: 0
  });
  
  const scrollRAFRef = useRef<number | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  
  // Initialize document model
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Calculate viewport bounds and visible lines
   */
  const calculateViewport = useCallback((scrollTop: number, containerHeight: number) => {
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerHeight;
    
    // Get lines in viewport with buffer
    const bufferTop = Math.max(0, viewportTop - BUFFER_SIZE * LINE_HEIGHT);
    const bufferBottom = viewportBottom + BUFFER_SIZE * LINE_HEIGHT;
    
    const visibleLines = lineRegistryRef.current.getLinesInViewport(bufferTop, bufferBottom);
    const totalHeight = lineRegistryRef.current.getTotalHeight();
    
    return {
      viewportTop,
      viewportHeight: containerHeight,
      visibleLines,
      totalHeight,
      bufferTop,
      bufferBottom
    };
  }, []);

  /**
   * Handle scroll events with throttling and RAF
   */
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    const currentScrollTop = target.scrollTop;
    const currentTime = performance.now();
    
    // Update scroll metrics
    const prevScrollTop = scrollMetricsRef.current.scrollTop;
    scrollMetricsRef.current = {
      scrollTop: currentScrollTop,
      scrollHeight: target.scrollHeight,
      clientHeight: target.clientHeight,
      isScrolling: true,
      scrollDirection: currentScrollTop > prevScrollTop ? 'down' : 'up',
      lastScrollTime: currentTime
    };
    
    // Cancel previous RAF if exists
    if (scrollRAFRef.current !== null) {
      cancelAnimationFrame(scrollRAFRef.current);
    }
    
    // Schedule update with RAF
    scrollRAFRef.current = requestAnimationFrame(() => {
      const viewport = calculateViewport(currentScrollTop, target.clientHeight);
      
      setEditorState(prev => ({
        ...prev,
        scrollTop: currentScrollTop,
        viewportTop: viewport.viewportTop,
        viewportHeight: viewport.viewportHeight,
        visibleLines: viewport.visibleLines,
        totalHeight: viewport.totalHeight
      }));
      
      // Mark scrolling as finished after a delay
      setTimeout(() => {
        scrollMetricsRef.current.isScrolling = false;
      }, 150);
      
      scrollRAFRef.current = null;
    });
  }, [calculateViewport]);

  /**
   * Render content with virtual scrolling
   */
  const renderVirtualContent = useCallback(() => {
    if (!editorRef.current || !scrollContainerRef.current) return;
    
    const renderer = virtualRendererRef.current;
    const container = editorRef.current;
    const scrollContainer = scrollContainerRef.current;
    
    // Get current selection
    const selection = getDocumentSelection();
    
    // Render with virtual renderer
    const renderResult = renderer.render({
      viewportTop: editorState.scrollTop,
      viewportHeight: editorState.viewportHeight || scrollContainer.clientHeight,
      bufferSize: BUFFER_SIZE,
      lineHeight: LINE_HEIGHT
    });
    
    // Update DOM efficiently
    requestAnimationFrame(() => {
      // Use transform3d for GPU acceleration
      container.style.transform = 'transform3d(0, 0, 0)';
      container.innerHTML = renderResult.html;
      
      // Update scroll container height
      const totalHeight = renderResult.totalHeight || LINE_HEIGHT;
      const heightSpacer = scrollContainer.querySelector('.editor-height-spacer') as HTMLElement;
      if (heightSpacer) {
        heightSpacer.style.height = `${totalHeight}px`;
      }
      
      // Restore selection
      if (selection) {
        setTimeout(() => {
          setDocumentSelection(selection.start, selection.end);
        }, 0);
      }
    });
  }, [editorState.scrollTop, editorState.viewportHeight]);

  /**
   * Setup intersection observer for visible blocks
   */
  const setupIntersectionObserver = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    // Clean up existing observer
    if (intersectionObserverRef.current) {
      intersectionObserverRef.current.disconnect();
    }
    
    // Create new observer
    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const block = entry.target as HTMLElement;
          const blockId = block.getAttribute('data-block-id');
          
          if (blockId) {
            // Use display: none for far off-screen blocks
            if (!entry.isIntersecting && 
                (entry.boundingClientRect.top > window.innerHeight * 2 ||
                 entry.boundingClientRect.bottom < -window.innerHeight)) {
              block.style.display = 'none';
            } else {
              block.style.display = '';
            }
          }
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: `${BUFFER_SIZE * LINE_HEIGHT * 2}px 0px`,
        threshold: 0
      }
    );
  }, []);

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
   * Handle input events
   */
  const handleInput = useCallback((e: Event) => {
    if (editorState.isComposing) return;
    
    const selection = getDocumentSelection();
    if (!selection) return;
    
    const currentText = editorRef.current?.textContent || '';
    const modelText = documentRef.current.getText();
    
    if (currentText !== modelText) {
      // Update document model based on changes
      if (codeUnitLength(currentText) > codeUnitLength(modelText) && selection.isCollapsed) {
        const insertedText = sliceByCodeUnits(
          currentText, 
          selection.start, 
          selection.start + (codeUnitLength(currentText) - codeUnitLength(modelText))
        );
        documentRef.current.insertText(selection.start, insertedText);
      } else if (codeUnitLength(currentText) < codeUnitLength(modelText)) {
        const deletedLength = codeUnitLength(modelText) - codeUnitLength(currentText);
        documentRef.current.deleteText(selection.start, selection.start + deletedLength);
      }
      
      onChange?.(documentRef.current.getText());
      
      // Re-render with virtual scrolling
      renderVirtualContent();
    }
  }, [editorState.isComposing, getDocumentSelection, onChange, renderVirtualContent]);

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
      
      // Ensure cursor remains visible
      if (selection.isCollapsed) {
        const line = lineRegistryRef.current.getLineByOffset(selection.start);
        if (line && scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const lineTop = line.y;
          const lineBottom = line.y + line.height;
          
          if (lineTop < container.scrollTop) {
            container.scrollTop = lineTop - LINE_HEIGHT;
          } else if (lineBottom > container.scrollTop + container.clientHeight) {
            container.scrollTop = lineBottom - container.clientHeight + LINE_HEIGHT;
          }
        }
      }
    }
  }, [getDocumentSelection, editorState.lastSelection, onSelectionChange]);

  /**
   * Handle keydown events
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const selection = getDocumentSelection();
      if (selection) {
        documentRef.current.insertText(selection.start, '\n');
        documentRef.current.createBlock(selection.start + 1);
        onChange?.(documentRef.current.getText());
        renderVirtualContent();
        
        setTimeout(() => {
          setDocumentSelection(selection.start + 1, selection.start + 1);
        }, 10);
      }
    }
  }, [getDocumentSelection, setDocumentSelection, onChange, renderVirtualContent]);

  // Initialize document model
  useEffect(() => {
    if (!isInitialized && initialContent && documentRef.current.getLength() === 0) {
      documentRef.current.insertText(0, initialContent);
      const lines = initialContent.split('\n');
      let offset = 0;
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          documentRef.current.createBlock(offset);
        }
        offset += codeUnitLength(lines[i]) + 1;
      }
      setIsInitialized(true);
      renderVirtualContent();
    }
  }, [initialContent, renderVirtualContent, isInitialized]);

  // Setup event listeners
  useEffect(() => {
    const editor = editorRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!editor || !scrollContainer) return;
    
    editor.addEventListener('input', handleInput);
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('selectionchange', handleSelectionChange);
    
    // Attach line update observer
    lineObserverRef.current.attach(editor);
    
    // Setup intersection observer
    setupIntersectionObserver();
    
    // Initial viewport calculation
    const viewport = calculateViewport(0, scrollContainer.clientHeight);
    setEditorState(prev => ({
      ...prev,
      viewportHeight: viewport.viewportHeight,
      visibleLines: viewport.visibleLines,
      totalHeight: viewport.totalHeight
    }));
    
    return () => {
      editor.removeEventListener('input', handleInput);
      scrollContainer.removeEventListener('scroll', handleScroll);
      document.removeEventListener('selectionchange', handleSelectionChange);
      lineObserverRef.current.detach();
      
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
      
      if (scrollRAFRef.current !== null) {
        cancelAnimationFrame(scrollRAFRef.current);
      }
    };
  }, [handleInput, handleScroll, handleSelectionChange, setupIntersectionObserver, calculateViewport]);

  // Subscribe to document changes
  useEffect(() => {
    const unsubscribe = documentRef.current.onChange((change: DocumentChange) => {
      // Re-render on external changes
      renderVirtualContent();
    });
    
    return unsubscribe;
  }, [renderVirtualContent]);

  // Render virtual content on state changes
  useEffect(() => {
    renderVirtualContent();
  }, [editorState.visibleLines, renderVirtualContent]);

  return (
    <div className={`editor-container ${className}`}>
      <div className="editor-gutter">
        <VirtualLineNumbers 
          visibleLines={editorState.visibleLines}
          totalHeight={editorState.totalHeight}
          scrollTop={editorState.scrollTop}
          activeLineNumber={editorState.lastSelection ? 
            lineRegistryRef.current.getLineByOffset(editorState.lastSelection.start)?.lineNumber : 
            undefined
          }
        />
      </div>
      <div 
        ref={scrollContainerRef}
        className="editor-scroll-container"
        style={{
          position: 'relative',
          overflow: 'auto',
          height: '100%',
          width: '100%'
        }}
      >
        <div className="editor-height-spacer" style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1px',
          height: `${editorState.totalHeight}px`,
          pointerEvents: 'none'
        }} />
        <div
          ref={editorRef}
          className="editor-content"
          contentEditable
          spellCheck={false}
          onKeyDown={handleKeyDown}
          role="textbox"
          aria-multiline="true"
          aria-placeholder={placeholder}
          style={{
            position: 'relative',
            minHeight: '100%',
            outline: 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: `${LINE_HEIGHT}px`,
            width: '100%',
            maxWidth: '600px',
            boxSizing: 'border-box',
            padding: '10px 20px'
          }}
        />
      </div>
    </div>
  );
}

/**
 * Virtual line numbers component with viewport culling
 */
interface VirtualLineNumbersProps {
  visibleLines: VisualLine[];
  totalHeight: number;
  scrollTop: number;
  activeLineNumber?: number;
}

function VirtualLineNumbers({ 
  visibleLines, 
  totalHeight, 
  scrollTop, 
  activeLineNumber 
}: VirtualLineNumbersProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Group lines by block for proper spacing
  const linesByBlock = useMemo(() => {
    return visibleLines.reduce((acc, line) => {
      if (!acc[line.blockId]) {
        acc[line.blockId] = [];
      }
      acc[line.blockId].push(line);
      return acc;
    }, {} as Record<string, VisualLine[]>);
  }, [visibleLines]);
  
  // Calculate top spacer height
  const topSpacerHeight = useMemo(() => {
    if (visibleLines.length === 0) return 0;
    return Math.max(0, visibleLines[0].y);
  }, [visibleLines]);
  
  // Calculate bottom spacer height
  const bottomSpacerHeight = useMemo(() => {
    if (visibleLines.length === 0) return totalHeight;
    const lastLine = visibleLines[visibleLines.length - 1];
    return Math.max(0, totalHeight - (lastLine.y + lastLine.height));
  }, [visibleLines, totalHeight]);
  
  useEffect(() => {
    // Sync scroll position with editor
    if (containerRef.current) {
      containerRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop]);
  
  return (
    <div 
      ref={containerRef}
      className="line-numbers-container"
      style={{ 
        height: '100%',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div style={{ 
        transform: `translateY(${-scrollTop}px)`,
        position: 'relative'
      }}>
        {/* Top spacer for off-screen content */}
        {topSpacerHeight > 0 && (
          <div style={{ height: `${topSpacerHeight}px` }} />
        )}
        
        {/* Render visible line numbers */}
        {Object.entries(linesByBlock).map(([blockId, blockLines], blockIndex) => (
          <div 
            key={blockId} 
            style={{ 
              marginBottom: blockIndex < Object.keys(linesByBlock).length - 1 ? '8px' : 0 
            }}
          >
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
                  fontFamily: 'monospace',
                  transform: 'translateZ(0)', // Force GPU layer
                  willChange: 'transform'
                }}
              >
                {line.lineNumber}
              </div>
            ))}
          </div>
        ))}
        
        {/* Bottom spacer for off-screen content */}
        {bottomSpacerHeight > 0 && (
          <div style={{ height: `${bottomSpacerHeight}px` }} />
        )}
      </div>
    </div>
  );
}