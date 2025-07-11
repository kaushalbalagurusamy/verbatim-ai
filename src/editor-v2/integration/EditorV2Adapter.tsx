/**
 * EditorV2 Adapter - Bridges the new editor with the existing application
 * Converts between ContentBlock[] format and the new editor's text-based approach
 * Maintains compatibility with existing toolbar and document management
 */

import React, { useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { SingleContentEditableEditor } from '../components/SingleContentEditableEditor';
import type { ContentBlock, FormattingType, HighlightColor } from '@/types/document.types';
import type { TextFormatting } from '../data-structures/interval-tree';
import { ToolbarIntegrationService } from '../services/toolbar-integration';
import '../styles/editor.css';

interface EditorV2AdapterProps {
  content: ContentBlock[];
  onChange: (content: ContentBlock[]) => void;
  onSelectionChange?: () => void;
  setApplyFormatRef?: (fn: (type: FormattingType, color?: HighlightColor) => void) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export interface EditorV2AdapterRef {
  applyFormat: (type: FormattingType, color?: HighlightColor) => void;
  getSelection: () => { start: number; end: number } | null;
}

export const EditorV2Adapter = forwardRef<EditorV2AdapterRef, EditorV2AdapterProps>(({
  content,
  onChange,
  onSelectionChange,
  setApplyFormatRef,
  placeholder,
  autoFocus
}: EditorV2AdapterProps, ref) => {
  const editorRef = useRef<any>(null);
  const applyFormatRef = useRef<(type: FormattingType, color?: HighlightColor) => void>(() => {});
  const lastSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const toolbarServiceRef = useRef<ToolbarIntegrationService | null>(null);
  
  /**
   * Convert ContentBlock[] to plain text for the new editor
   */
  const contentBlocksToText = useCallback((blocks: ContentBlock[]): string => {
    return blocks.map(block => block.content).join('\n');
  }, []);
  
  /**
   * Convert plain text back to ContentBlock[] for compatibility
   */
  const textToContentBlocks = useCallback((text: string): ContentBlock[] => {
    const lines = text.split('\n');
    return lines.map((line, index) => ({
      id: `block-${Date.now()}-${index}`,
      type: 'paragraph' as const,
      content: line,
      formatting: []
    }));
  }, []);
  
  /**
   * Handle content changes from the new editor
   */
  const handleChange = useCallback((text: string) => {
    // Convert text back to ContentBlock format
    const blocks = textToContentBlocks(text);
    onChange(blocks);
  }, [onChange, textToContentBlocks]);
  
  /**
   * Handle selection changes
   */
  const handleSelectionChange = useCallback((selection: Selection | null) => {
    // Store selection for formatting operations
    if (selection && !selection.isCollapsed && editorRef.current?.getSelectionOffsets) {
      const offsets = editorRef.current.getSelectionOffsets();
      if (offsets) {
        lastSelectionRef.current = offsets;
        
        // Update toolbar service with selection
        if (toolbarServiceRef.current) {
          toolbarServiceRef.current.updateSelection({
            start: offsets.start,
            end: offsets.end,
            isCollapsed: false
          });
        }
      }
    } else if (selection?.isCollapsed) {
      lastSelectionRef.current = null;
      
      // Clear toolbar state for collapsed selection
      if (toolbarServiceRef.current) {
        toolbarServiceRef.current.updateSelection(null);
      }
    }
    onSelectionChange?.();
  }, [onSelectionChange]);
  
  /**
   * Initialize toolbar service when editor is ready
   */
  useEffect(() => {
    if (editorRef.current?.getDocument) {
      const document = editorRef.current.getDocument();
      toolbarServiceRef.current = new ToolbarIntegrationService(document);
    }
  }, []);

  /**
   * Apply formatting based on current selection
   */
  const applyFormat = useCallback((type: FormattingType, color?: HighlightColor) => {
    if (!toolbarServiceRef.current || !lastSelectionRef.current) {
      console.warn('Cannot apply formatting: no toolbar service or selection');
      return;
    }

    // Use toolbar service for all formatting operations
    if (type === 'clear') {
      toolbarServiceRef.current.executeAction({ type: 'clear' });
    } else if (type === 'bold') {
      toolbarServiceRef.current.executeAction({ type: 'bold' });
    } else if (type === 'highlight') {
      toolbarServiceRef.current.executeAction({ 
        type: 'highlight', 
        color: color as 'yellow' | 'blue' | 'green' | 'pink' 
      });
    } else if (type === 'minimize') {
      toolbarServiceRef.current.executeAction({ type: 'minimize' });
    } else if (type === 'heading') {
      // Handle heading - extract level from type if provided
      const level = parseInt(type.replace('heading', '')) || 1;
      toolbarServiceRef.current.executeAction({ 
        type: 'heading', 
        headingLevel: level as 1 | 2 | 3 | 4 | 5 | 6 
      });
    }
    
    // Re-render the content
    if (editorRef.current?.renderContent) {
      editorRef.current.renderContent();
    }
  }, []);

  /**
   * Set up formatting function reference
   */
  useEffect(() => {
    applyFormatRef.current = applyFormat;
    if (setApplyFormatRef) {
      setApplyFormatRef(applyFormat);
    }
  }, [applyFormat, setApplyFormatRef]);

  /**
   * Expose methods to parent components
   */
  useImperativeHandle(ref, () => ({
    applyFormat,
    getSelection: () => lastSelectionRef.current
  }), [applyFormat]);
  
  // Convert initial content
  const initialText = contentBlocksToText(content);
  
  return (
    <div>
      <SingleContentEditableEditor
        ref={editorRef}
        initialContent={initialText}
        onChange={handleChange}
        onSelectionChange={handleSelectionChange}
        placeholder={placeholder}
        className=""
      />
    </div>
  );
});

// Set display name for debugging
EditorV2Adapter.displayName = 'EditorV2Adapter';

// Export as default to make it a drop-in replacement for the old Editor
export default EditorV2Adapter;