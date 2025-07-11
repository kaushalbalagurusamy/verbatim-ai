/**
 * EditorV2 Adapter - Bridges the new editor with the existing application
 * Converts between ContentBlock[] format and the new editor's text-based approach
 * Maintains compatibility with existing toolbar and document management
 */

import React, { useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { SingleContentEditableEditor } from '../components/SingleContentEditableEditor';
import type { ContentBlock, FormattingType, HighlightColor } from '@/types/document.types';
import type { TextFormatting } from '../data-structures/interval-tree';
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
      }
    }
    onSelectionChange?.();
  }, [onSelectionChange]);
  
  /**
   * Apply formatting based on current selection
   */
  const applyFormat = useCallback((type: FormattingType, color?: HighlightColor) => {
    if (!editorRef.current?.applyFormatting || !lastSelectionRef.current) {
      console.warn('Cannot apply formatting: no editor ref or selection');
      return;
    }

    const { start, end } = lastSelectionRef.current;
    
    if (type === 'clear') {
      // Clear all formatting in the selection
      editorRef.current.clearFormatting(start, end);
    } else if (type === 'bold' || type === 'highlight' || type === 'minimize') {
      // Map FormattingType to TextFormatting type
      const formattingType = type === 'bold' ? 'bold' : 
                            type === 'highlight' ? 'highlight' : 
                            'minimize';
      
      // Check if formatting already exists
      const existingFormats = editorRef.current.getFormattingAt(start, end);
      const hasFormat = existingFormats.some((f: TextFormatting) => 
        f.type === formattingType && 
        (formattingType !== 'highlight' || f.color === color)
      );
      
      if (hasFormat) {
        // Remove formatting
        editorRef.current.removeFormatting(start, end, formattingType);
      } else {
        // Apply formatting
        const formatting: TextFormatting = {
          type: formattingType,
          start,
          end,
          id: `fmt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        
        if (formattingType === 'highlight' && color) {
          formatting.color = color as 'yellow' | 'blue' | 'green' | 'pink';
        }
        
        editorRef.current.applyFormatting(formatting);
      }
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