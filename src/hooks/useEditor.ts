import { useState, useCallback, useRef, useEffect } from 'react';
import { useAutoSaveDocument } from './useDocuments';
import type { Document, ContentBlock, FormattingType, HighlightColor } from '@/types/document.types';
import { FormattingEngine } from '@/utils/formatting-engine';
import { selectionManager, SelectionManager } from '@/utils/selection-manager';

interface UseEditorOptions {
  document?: Document;
  onDocumentChange?: (document: Document) => void;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export function useEditor({
  document,
  onDocumentChange,
  autoSave = true,
  autoSaveDelay = 2000 // Increased to 2 seconds for better performance
}: UseEditorOptions = {}) {
  const [isModified, setIsModified] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const applyFormatRef = useRef<(type: FormattingType, color?: HighlightColor) => void>();

  // Auto-save functionality using React Query
  const { saveDocument, isSaving } = useAutoSaveDocument(
    document?.id || '',
    autoSaveDelay
  );

  const handleContentChange = useCallback((newContent: ContentBlock[]) => {
    if (!document) return;

    // Check if content actually changed to avoid unnecessary updates
    const contentChanged = JSON.stringify(newContent) !== JSON.stringify(document.content.blocks);
    if (!contentChanged) return;

    const updatedDocument: Document = {
      ...document,
      content: {
        ...document.content,
        blocks: newContent
      },
      updatedAt: new Date().toISOString(),
      isModified: true,
      version: document.version + 1
    };

    setIsModified(true);
    onDocumentChange?.(updatedDocument);

    // Auto-save with debounce
    if (autoSave && document.id) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        saveDocument({
          content: updatedDocument.content,
          title: updatedDocument.title
        });
        setIsModified(false);
      }, autoSaveDelay);
    }
  }, [document, onDocumentChange, autoSave, autoSaveDelay, saveDocument]);

  // Clear auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleSelectionChange = useCallback((newSelection: Selection | null) => {
    setSelection(newSelection);
  }, []);

  // Formatting functions that can be called by toolbar
  const applyBold = useCallback(() => {
    applyFormatRef.current?.('bold');
  }, []);

  const applyHighlight = useCallback((color: HighlightColor = 'yellow') => {
    applyFormatRef.current?.('highlight', color);
  }, []);

  const applyMinimize = useCallback(() => {
    applyFormatRef.current?.('minimize');
  }, []);

  const clearFormatting = useCallback(() => {
    applyFormatRef.current?.('clear');
  }, []);

  const setHeading = useCallback((level: 1 | 2 | 3 | 4 | 5 | 6) => {
    // TODO: Implement heading conversion
    console.log(`Set heading ${level} not yet implemented`);
  }, []);

  const insertMention = useCallback((fileId: string, fileName: string) => {
    // TODO: Implement mention insertion
    console.log(`Insert mention ${fileName} not yet implemented`);
  }, []);

  const insertCommand = useCallback((command: string) => {
    // TODO: Implement command insertion
    console.log(`Insert command ${command} not yet implemented`);
  }, []);

  const hasSelection = selection && !selection.isCollapsed;
  const selectedText = hasSelection ? selection.toString() : '';

  return {
    // Content
    content: document?.content.blocks || [],
    isModified,
    isSaving,
    
    // Handlers
    onContentChange: handleContentChange,
    onSelectionChange: handleSelectionChange,
    
    // Selection state
    selection,
    hasSelection,
    selectedText,
    
    // Formatting actions
    applyBold,
    applyHighlight,
    applyMinimize,
    clearFormatting,
    setHeading,
    insertMention,
    insertCommand,
    
    // Internal ref for editor component
    setApplyFormatRef: (fn: (type: FormattingType, color?: HighlightColor) => void) => {
      applyFormatRef.current = fn;
    }
  };
}