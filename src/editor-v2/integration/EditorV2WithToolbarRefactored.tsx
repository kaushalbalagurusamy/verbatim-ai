/**
 * Editor V2 with Refactored Toolbar - Stage 4.1 Implementation
 * Toolbar now queries DocumentModel state instead of inspecting DOM
 * Ensures toolbar state is always consistent with document model
 */

import React, { useState, useCallback } from 'react';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { SingleContentEditableEditor } from '../components/SingleContentEditableEditor';
import type { HighlightColor } from '@/types/document.types';
import '../styles/editor.css';

interface EditorState {
  isBold: boolean;
  isHighlighted: boolean;
  highlightColor?: HighlightColor;
  isMinimized: boolean;
  currentHeadingLevel: number;
}

export function EditorV2WithToolbarRefactored() {
  const [content, setContent] = useState('');
  const [toolbarState, setToolbarState] = useState<EditorState>({
    isBold: false,
    isHighlighted: false,
    highlightColor: undefined,
    isMinimized: false,
    currentHeadingLevel: 0
  });
  
  // Keep reference to the editor's document model through the editor component
  const editorRef = React.useRef<any>(null);

  /**
   * Handle toolbar state updates from the editor
   * This is called whenever selection changes or formatting is applied
   */
  const handleToolbarStateChange = useCallback((state: any) => {
    setToolbarState({
      isBold: state.isBold,
      isHighlighted: state.isHighlighted,
      highlightColor: state.highlightColor,
      isMinimized: state.isMinimized,
      currentHeadingLevel: 0 // TODO: Add block type detection
    });
  }, []);

  /**
   * Handle emphasis (bold) from toolbar
   */
  const handleEmphasis = useCallback(() => {
    if (!editorRef.current) return;
    
    // Toggle bold formatting
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    
    // Send command to editor to apply formatting
    editorRef.current.applyFormatting('bold');
  }, []);

  /**
   * Handle highlight from toolbar
   */
  const handleHighlight = useCallback((hexColor?: string) => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    
    // Map hex color to color name
    const colorMap: Record<string, string> = {
      '#fef08a': 'yellow',
      '#bfdbfe': 'blue',
      '#bbf7d0': 'green',
      '#fecaca': 'pink'
    };
    
    const colorName = hexColor ? (colorMap[hexColor] || 'yellow') : 'yellow';
    editorRef.current.applyFormatting('highlight', colorName);
  }, []);

  /**
   * Handle minimize from toolbar
   */
  const handleMinimize = useCallback(() => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    
    editorRef.current.applyFormatting('minimize');
  }, []);

  /**
   * Handle clear formatting from toolbar
   */
  const handleClear = useCallback(() => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    
    editorRef.current.clearFormatting();
  }, []);

  /**
   * Handle heading level change from toolbar
   */
  const handleHeading = useCallback((level: number) => {
    if (!editorRef.current) return;
    
    editorRef.current.setBlockType(`heading${level}`);
  }, []);

  return (
    <div className="editor-v2-container">
      <EditorToolbar
        onEmphasis={handleEmphasis}
        onHighlight={handleHighlight}
        onMinimize={handleMinimize}
        onClear={handleClear}
        onHeading={handleHeading}
        isEmphasisActive={toolbarState.isBold}
        isHighlightActive={toolbarState.isHighlighted}
        currentHeadingLevel={toolbarState.currentHeadingLevel}
      />
      
      <div className="editor-wrapper">
        <SingleContentEditableEditor
          ref={editorRef}
          initialContent={content}
          onChange={setContent}
          onToolbarStateChange={handleToolbarStateChange}
          className="editor-v2-refactored"
        />
      </div>
      
      <style jsx>{`
        .editor-v2-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #1e1e1e;
        }
        
        .editor-wrapper {
          flex: 1;
          overflow: auto;
          padding: 20px;
        }
        
        .editor-v2-refactored {
          max-width: 800px;
          margin: 0 auto;
        }
        
        /* Formatting styles that match the document model */
        :global(.fmt-bold) {
          font-weight: bold;
          text-decoration: underline;
        }
        
        :global(.fmt-highlight-yellow) {
          background-color: #fef08a;
          color: #000;
        }
        
        :global(.fmt-highlight-blue) {
          background-color: #bfdbfe;
          color: #000;
        }
        
        :global(.fmt-highlight-green) {
          background-color: #bbf7d0;
          color: #000;
        }
        
        :global(.fmt-highlight-pink) {
          background-color: #fecaca;
          color: #000;
        }
        
        :global(.fmt-minimize) {
          font-size: 0.8em;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}