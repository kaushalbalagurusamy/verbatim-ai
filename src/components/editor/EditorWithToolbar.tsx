
/**
 * Complete text editor component with toolbar
 * Integrates EditorToolbar with a text editing area
 * Handles all formatting state and actions
 */
import React, { useState } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { Editor } from '../Editor';
import { useEditor } from '@/hooks/useEditor';
import { useCreateDocument } from '@/hooks/useDocuments';
import { createNewDocument } from '@/utils/document.utils';
import type { HighlightColor } from '@/types/document.types';

interface EditorState {
  isEmphasisActive: boolean;
  isHighlightActive: boolean;
  currentHeadingLevel: number;
}

interface EditorWithToolbarProps {
  documentId?: string;
  initialTitle?: string;
}

export function EditorWithToolbar({ documentId, initialTitle = 'New Document' }: EditorWithToolbarProps) {
  // Create a document (either new or loaded)
  const [document, setDocument] = useState(() => createNewDocument(initialTitle));
  const createDocument = useCreateDocument();
  
  const {
    content,
    isModified,
    isSaving,
    onContentChange,
    onSelectionChange,
    hasSelection,
    applyBold,
    applyHighlight,
    applyMinimize,
    clearFormatting,
    setHeading
  } = useEditor({
    document,
    onDocumentChange: setDocument,
    autoSave: true
  });

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
    applyBold();
  };

  const handleHighlight = (color: string) => {
    setEditorState(prev => ({
      ...prev,
      isHighlightActive: !prev.isHighlightActive
    }));
    applyHighlight(color as HighlightColor);
  };

  const handleMinimize = () => {
    applyMinimize();
  };

  const handleClear = () => {
    setEditorState(prev => ({
      ...prev,
      isEmphasisActive: false,
      isHighlightActive: false
    }));
    clearFormatting();
  };

  const handleHeading = (level: number) => {
    setEditorState(prev => ({
      ...prev,
      currentHeadingLevel: level
    }));
    setHeading(level as 1 | 2 | 3 | 4 | 5 | 6);
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
      
      <Editor
        content={content}
        onChange={onContentChange}
        onSelectionChange={onSelectionChange}
        autoFocus={true}
      />
      
      {(isModified || isSaving) && (
        <div className="absolute top-2 right-2 text-xs">
          {isSaving ? (
            <span className="text-[#4fc3f7]">Saving...</span>
          ) : isModified ? (
            <span className="text-[#ffa726]">Modified</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
