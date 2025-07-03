
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
import { validateDocumentContent } from '@/utils/content-validation';
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
    try {
      const doc = createNewDocument(initialTitle);
      
      // Validate and sanitize initial content
      if (initialContent) {
        doc.content = validateDocumentContent(initialContent);
      }
      
      return doc;
    } catch (error) {
      console.error('Error initializing document:', error);
      // Return a safe default document
      return createNewDocument(initialTitle);
    }
  });
  const createDocument = useCreateDocument();
  
  // Update content when it changes
  useEffect(() => {
    if (onContentChange && document) {
      onContentChange(document.content);
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
    setHeading,
    setApplyFormatRef
  } = useEditor({
    document,
    onDocumentChange: setDocument,
    autoSave: true
  });
  
  // Wrap content change to notify parent - simplified to avoid double updates
  const handleContentChange = useCallback((newContent: ContentBlock[]) => {
    try {
      // Validate content blocks before passing them on
      if (!Array.isArray(newContent)) {
        console.error('Invalid content: expected array of blocks');
        return;
      }
      editorContentChange(newContent);
    } catch (error) {
      console.error('Error handling content change:', error);
    }
  }, [editorContentChange]);

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
        setApplyFormatRef={setApplyFormatRef}
        autoFocus={true}
      />
      
      {/* Save Status Indicator - Bottom Right */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <div 
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            isSaving 
              ? 'bg-[#4fc3f7] animate-pulse' 
              : isModified 
                ? 'bg-transparent border border-[#4caf50]' 
                : document?.id 
                  ? 'bg-[#4caf50]' 
                  : ''
          }`}
          title={
            isSaving 
              ? 'Saving...' 
              : isModified 
                ? 'Changes pending save' 
                : document?.id 
                  ? 'All changes saved' 
                  : ''
          }
        />
      </div>
    </div>
  );
}
