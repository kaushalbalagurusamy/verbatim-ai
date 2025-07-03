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
    if (!applyFormatRef.current) {
      console.warn('Format ref not set');
      return;
    }
    applyFormatRef.current('bold');
  }, []);

  const applyHighlight = useCallback((color: HighlightColor = 'yellow') => {
    if (!applyFormatRef.current) {
      console.warn('Format ref not set');
      return;
    }
    
    // Get current selections to check for existing highlights
    const selections = selectionManager.getSelections();
    if (selections.length === 0 && selection && !selection.isCollapsed) {
      const textSelection = SelectionManager.fromDOMSelection(selection);
      if (textSelection) selections.push(textSelection);
    }
    
    // Check if any selection has existing highlight for color cycling
    let colorToApply = color;
    if (selections.length > 0 && document) {
      const firstSelection = selections[0];
      const block = document.content.blocks.find(b => b.id === firstSelection.blockId);
      if (block?.formatting) {
        const existingHighlight = block.formatting.find(fmt => 
          fmt.type === 'highlight' &&
          fmt.start >= firstSelection.start &&
          fmt.end <= firstSelection.end
        );
        if (existingHighlight) {
          colorToApply = FormattingEngine.getNextHighlightColor(existingHighlight.color);
        }
      }
    }
    
    applyFormatRef.current('highlight', colorToApply);
  }, [selection, document]);

  const applyMinimize = useCallback(() => {
    if (!applyFormatRef.current) {
      console.warn('Format ref not set');
      return;
    }
    
    // Check if selection has emphasis before applying minimize
    const selections = selectionManager.getSelections();
    if (selections.length === 0 && selection && !selection.isCollapsed) {
      const textSelection = SelectionManager.fromDOMSelection(selection);
      if (textSelection) selections.push(textSelection);
    }
    
    // Only apply minimize if no emphasis in selection
    if (selections.length > 0 && document) {
      const canMinimize = selections.every(sel => {
        const block = document.content.blocks.find(b => b.id === sel.blockId);
        if (!block?.formatting) return true;
        return !FormattingEngine.hasEmphasis(block.formatting, sel.start, sel.end);
      });
      
      if (canMinimize) {
        applyFormatRef.current('minimize');
      }
    }
  }, [selection, document]);

  const clearFormatting = useCallback(() => {
    if (!document || !applyFormatRef.current) return;
    
    // Get current selections
    const selections = selectionManager.getSelections();
    if (selections.length === 0 && selection && !selection.isCollapsed) {
      const textSelection = SelectionManager.fromDOMSelection(selection);
      if (textSelection) selections.push(textSelection);
    }
    
    if (selections.length === 0) return;
    
    // Clear formatting using the formatting engine
    const updatedBlocks = FormattingEngine.clearFormatting(
      document.content.blocks,
      selections
    );
    
    const updatedDocument: Document = {
      ...document,
      content: {
        ...document.content,
        blocks: updatedBlocks
      },
      updatedAt: new Date().toISOString(),
      isModified: true,
      version: document.version + 1
    };
    
    onDocumentChange?.(updatedDocument);
    
    // Clear selections
    selectionManager.clearSelections();
  }, [document, selection, onDocumentChange]);

  const setHeading = useCallback((level: 1 | 2 | 3 | 4 | 5 | 6) => {
    if (!document || !selection) return;
    
    // Get the block containing the selection
    const range = selection.getRangeAt(0);
    const blockElement = range.commonAncestorContainer.parentElement?.closest('[data-block-id]') as HTMLElement;
    if (!blockElement) return;
    
    const blockId = blockElement.dataset.blockId;
    const blockIndex = document.content.blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return;
    
    // Update block type
    const updatedBlocks = [...document.content.blocks];
    updatedBlocks[blockIndex] = {
      ...updatedBlocks[blockIndex],
      type: `heading${level}` as any
    };
    
    const updatedDocument: Document = {
      ...document,
      content: {
        ...document.content,
        blocks: updatedBlocks
      },
      updatedAt: new Date().toISOString(),
      isModified: true,
      version: document.version + 1
    };
    
    onDocumentChange?.(updatedDocument);
  }, [document, selection, onDocumentChange]);

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