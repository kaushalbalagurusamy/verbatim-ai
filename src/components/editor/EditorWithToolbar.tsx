
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
    <div className="flex flex-col h-full">
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
      
      {/* Editor Content Area */}
      <div className="flex-1 bg-[#1e1e1e] p-6">
        <div className="max-w-4xl">
          <div className="text-sm text-[#6a6a6a] mb-4">
            Text editor with formatting toolbar - ready for debate preparation
          </div>
          
          {/* Placeholder for actual text editor implementation */}
          <div className="min-h-[400px] p-4 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-[#cccccc] font-serif">
            <p className="mb-4">
              This is where your debate evidence and arguments will be formatted. 
              Use the toolbar above to apply emphasis, highlighting, and heading levels.
            </p>
            <p className="mb-4">
              The text editor uses Times New Roman for academic content styling, 
              maintaining professional standards for competitive debate preparation.
            </p>
            <p>
              Select text and use the formatting buttons to prepare your evidence cards 
              and argument structure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
