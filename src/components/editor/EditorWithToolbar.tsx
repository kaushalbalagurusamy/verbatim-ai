
/**
 * Complete text editor component with toolbar
 * Integrates EditorToolbar with a text editing area
 * Handles all formatting state and actions
 */
import React, { useState, useEffect, useCallback } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { Editor } from '../Editor';
import { useEditor } from '@/hooks/useEditor';
import { useCreateDocument } from '@/hooks/useDocuments';
import { createNewDocument } from '@/utils/document.utils';
import type { HighlightColor, Document as DocumentType } from '@/types/document.types';

interface EditorState {
  isEmphasisActive: boolean;
  isHighlightActive: boolean;
  currentHeadingLevel: number;
}

interface EditorWithToolbarProps {
  documentId?: string;
  initialTitle?: string;
  onTitleChange?: (title: string) => void;
  onTitleChangeHandlerReady?: (handler: (title: string) => void) => void;
}

export function EditorWithToolbar({ documentId, initialTitle = 'New Document', onTitleChange, onTitleChangeHandlerReady }: EditorWithToolbarProps) {
  // Only create a document if one doesn't exist, don't auto-create on every render
  const [document, setDocument] = useState<DocumentType | null>(null);
  const createDocument = useCreateDocument();
  
  // Initialize document only once when component mounts
  useEffect(() => {
    if (!document) {
      setDocument(createNewDocument(initialTitle));
    }
  }, [initialTitle, document]);
  
  // Handle document title changes
  const handleDocumentTitleChange = useCallback((newTitle: string) => {
    if (!document) return;
    
    const updatedDocument = {
      ...document,
      title: newTitle,
      updatedAt: new Date().toISOString(),
      isModified: true,
      version: document.version + 1
    };
    setDocument(updatedDocument);
    onTitleChange?.(newTitle);
  }, [document, onTitleChange]);

  // Provide the title change handler to parent
  useEffect(() => {
    onTitleChangeHandlerReady?.(handleDocumentTitleChange);
  }, [onTitleChangeHandlerReady, handleDocumentTitleChange]);

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

  // Don't render anything until document is initialized
  if (!document) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[#6a6a6a]">Loading...</div>
        </div>
      </div>
    );
  }

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
