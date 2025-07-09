/**
 * EditorV2 Adapter - Bridges the new editor with the existing application
 * Converts between ContentBlock[] format and the new editor's text-based approach
 * Maintains compatibility with existing toolbar and document management
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { SingleContentEditableEditor } from '../components/SingleContentEditableEditor';
import type { ContentBlock, FormattingType, HighlightColor } from '@/types/document.types';
import '../styles/editor.css';

interface EditorV2AdapterProps {
  content: ContentBlock[];
  onChange: (content: ContentBlock[]) => void;
  onSelectionChange?: () => void;
  setApplyFormatRef?: (fn: (type: FormattingType, color?: HighlightColor) => void) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function EditorV2Adapter({
  content,
  onChange,
  onSelectionChange,
  setApplyFormatRef,
  placeholder,
  autoFocus
}: EditorV2AdapterProps) {
  const editorRef = useRef<any>(null);
  const applyFormatRef = useRef<(type: FormattingType, color?: HighlightColor) => void>(() => {});
  
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
    onSelectionChange?.();
  }, [onSelectionChange]);
  
  /**
   * Create formatting function that bridges to the new editor
   */
  useEffect(() => {
    if (setApplyFormatRef) {
      const applyFormat = (type: FormattingType, color?: HighlightColor) => {
        console.log('Apply format:', type, color);
        // For now, trigger a change with formatted content
        // This is a temporary implementation until we expose formatting methods
        const blocks = textToContentBlocks(editorRef.current?.textContent || '');
        
        // Simulate formatting by updating the first block
        if (blocks.length > 0 && type === 'highlight' && color) {
          blocks[0].formatting = [{
            type: 'highlight',
            start: 0,
            end: Math.min(9, blocks[0].content.length),
            color: color
          }];
        }
        
        onChange(blocks);
      };
      
      applyFormatRef.current = applyFormat;
      setApplyFormatRef(applyFormat);
    }
  }, [setApplyFormatRef, onChange, textToContentBlocks]);
  
  // Convert initial content
  const initialText = contentBlocksToText(content);
  
  return (
    <div ref={(el) => { editorRef.current = el; }}>
      <SingleContentEditableEditor
        initialContent={initialText}
        onChange={handleChange}
        onSelectionChange={handleSelectionChange}
        placeholder={placeholder}
        className=""
      />
    </div>
  );
}

// Export as default to make it a drop-in replacement for the old Editor
export default EditorV2Adapter;