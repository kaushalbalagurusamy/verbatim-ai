
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
import type { HighlightColor, Document as DocumentType, ContentBlock } from '@/types/document.types';

interface EditorState {
  isEmphasisActive: boolean;
  isHighlightActive: boolean;
  currentHeadingLevel: number;
}

interface EditorWithToolbarProps {
  documentId?: string;
  initialTitle?: string;
  initialContent?: any;
  onTitleChange?: (title: string) => void;
  onContentChange?: (content: any) => void;
  onTitleChangeHandlerReady?: (handler: (title: string) => void) => void;
}

export function EditorWithToolbar({ documentId, initialTitle = 'New Document', initialContent, onTitleChange, onContentChange, onTitleChangeHandlerReady }: EditorWithToolbarProps) {
  // Initialize document with provided content or create new
  const [document, setDocument] = useState<DocumentType | null>(() => {
    const doc = createNewDocument(initialTitle);
    if (initialContent && initialContent.text !== undefined) {
      doc.content = initialContent.text || '';
    }
    return doc;
  });
  const createDocument = useCreateDocument();
  
  // Update content when it changes
  useEffect(() => {
    if (onContentChange && document) {
      onContentChange({ text: document.content });
    }
  }, [document?.content, onContentChange]);
  
  // Update title when it changes from props
  useEffect(() => {
    if (initialTitle && document && document.title !== initialTitle) {
      setDocument(prev => prev ? { ...prev, title: initialTitle } : null);
    }
  }, [initialTitle]);
  
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
    onContentChange: editorContentChange,
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
  
  // Wrap content change to notify parent
  const handleContentChange = useCallback((newContent: ContentBlock[]) => {
    editorContentChange(newContent);
    if (document) {
      setDocument(prev => prev ? { 
        ...prev, 
        content: { ...prev.content, blocks: newContent } 
      } : null);
    }
  }, [editorContentChange, document]);

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
        onChange={handleContentChange}
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
