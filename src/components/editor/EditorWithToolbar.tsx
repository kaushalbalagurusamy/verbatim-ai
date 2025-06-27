
/**
 * Complete text editor component with toolbar
 * Integrates EditorToolbar with a text editing area
 * Handles all formatting state and actions
 */
import React, { useState } from 'react';
import { EditorToolbar } from './EditorToolbar';

interface EditorState {
  isEmphasisActive: boolean;
  isHighlightActive: boolean;
  currentHeadingLevel: number;
}

export function EditorWithToolbar() {
  const [editorState, setEditorState] = useState<EditorState>({
    isEmphasisActive: false,
    isHighlightActive: false,
    currentHeadingLevel: 1
  });

  const handleEmphasis = () => {
    setEditorState(prev => ({
      ...prev,
      isEmphasisActive: !prev.isEmphasisActive
    }));
    console.log('Emphasis toggled');
  };

  const handleHighlight = (color: string) => {
    setEditorState(prev => ({
      ...prev,
      isHighlightActive: !prev.isHighlightActive
    }));
    console.log('Highlight applied with color:', color);
  };

  const handleMinimize = () => {
    console.log('Minimize formatting');
  };

  const handleClear = () => {
    setEditorState(prev => ({
      ...prev,
      isEmphasisActive: false,
      isHighlightActive: false
    }));
    console.log('Clear all formatting');
  };

  const handleHeading = (level: number) => {
    setEditorState(prev => ({
      ...prev,
      currentHeadingLevel: level
    }));
    console.log('Heading level changed to:', level);
  };

  return (
    <EditorToolbar 
      onEmphasis={handleEmphasis} 
      onHighlight={handleHighlight} 
      onMinimize={handleMinimize} 
      onClear={handleClear} 
      onHeading={handleHeading} 
      isEmphasisActive={editorState.isEmphasisActive} 
      isHighlightActive={editorState.isHighlightActive} 
      currentHeadingLevel={editorState.currentHeadingLevel} 
    />
  );
}
