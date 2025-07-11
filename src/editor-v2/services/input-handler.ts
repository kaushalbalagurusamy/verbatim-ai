/**
 * Input Handler Service - Centralizes all input event processing for the editor
 * Intercepts native contentEditable behavior and maps to DocumentModel operations
 * Handles all inputTypes including composition events for IME support
 */

import { DocumentModel } from '../models/document-model';
import { codeUnitLength, sliceByCodeUnits } from '../utils/string-utils';

export interface InputHandlerConfig {
  getSelection: () => EditorSelection | null;
  setSelection: (start: number, end: number) => void;
  renderContent: () => void;
  onChange?: (content: string) => void;
}

export interface EditorSelection {
  start: number;
  end: number;
  isCollapsed: boolean;
  text: string;
}

interface CompositionState {
  isComposing: boolean;
  startOffset: number;
  data: string;
}

type InputHandler = (event: InputEvent, selection: EditorSelection) => void;

export class InputHandlerService {
  private document: DocumentModel;
  private config: InputHandlerConfig;
  private compositionState: CompositionState;
  private inputHandlers: Map<string, InputHandler>;

  constructor(document: DocumentModel, config: InputHandlerConfig) {
    this.document = document;
    this.config = config;
    this.compositionState = {
      isComposing: false,
      startOffset: 0,
      data: ''
    };
    
    // Initialize input type handlers
    this.inputHandlers = new Map([
      // Text insertion
      ['insertText', this.handleInsertText.bind(this)],
      ['insertCompositionText', this.handleInsertCompositionText.bind(this)],
      ['insertLineBreak', this.handleInsertLineBreak.bind(this)],
      ['insertParagraph', this.handleInsertParagraph.bind(this)],
      ['insertOrderedList', this.handleInsertText.bind(this)],
      ['insertUnorderedList', this.handleInsertText.bind(this)],
      ['insertHorizontalRule', this.handleInsertText.bind(this)],
      ['insertFromYank', this.handleInsertText.bind(this)],
      ['insertLink', this.handleInsertText.bind(this)],
      ['insertReplacementText', this.handleInsertText.bind(this)],
      
      // Deletion
      ['deleteContentBackward', this.handleDeleteBackward.bind(this)],
      ['deleteContentForward', this.handleDeleteForward.bind(this)],
      ['deleteWordBackward', this.handleDeleteWordBackward.bind(this)],
      ['deleteWordForward', this.handleDeleteWordForward.bind(this)],
      ['deleteSoftLineBackward', this.handleDeleteLineBackward.bind(this)],
      ['deleteSoftLineForward', this.handleDeleteLineForward.bind(this)],
      ['deleteHardLineBackward', this.handleDeleteLineBackward.bind(this)],
      ['deleteHardLineForward', this.handleDeleteLineForward.bind(this)],
      ['deleteEntireSoftLine', this.handleDeleteEntireLine.bind(this)],
      ['deleteByCut', this.handleDeleteByCut.bind(this)],
      ['deleteByDrag', this.handleDeleteByDrag.bind(this)],
      ['deleteContent', this.handleDeleteContent.bind(this)],
      
      // Paste and drop
      ['insertFromPaste', this.handleInsertFromPaste.bind(this)],
      ['insertFromDrop', this.handleInsertFromDrop.bind(this)],
      
      // Formatting
      ['formatBold', this.handleFormatBold.bind(this)],
      ['formatItalic', this.handleFormatItalic.bind(this)],
      ['formatUnderline', this.handleFormatUnderline.bind(this)],
      ['formatStrikeThrough', this.handleFormatStrikeThrough.bind(this)],
      ['formatSuperscript', this.handleFormatItalic.bind(this)],
      ['formatSubscript', this.handleFormatItalic.bind(this)],
      ['formatJustifyFull', this.handleFormatItalic.bind(this)],
      ['formatJustifyCenter', this.handleFormatItalic.bind(this)],
      ['formatJustifyRight', this.handleFormatItalic.bind(this)],
      ['formatJustifyLeft', this.handleFormatItalic.bind(this)],
      ['formatIndent', this.handleFormatItalic.bind(this)],
      ['formatOutdent', this.handleFormatItalic.bind(this)],
      ['formatRemove', this.handleFormatRemove.bind(this)],
      ['formatSetBlockTextDirection', this.handleFormatItalic.bind(this)],
      ['formatSetInlineTextDirection', this.handleFormatItalic.bind(this)],
      ['formatBackColor', this.handleFormatItalic.bind(this)],
      ['formatFontColor', this.handleFormatItalic.bind(this)],
      ['formatFontName', this.handleFormatItalic.bind(this)],
      
      // History
      ['historyUndo', this.handleUndo.bind(this)],
      ['historyRedo', this.handleRedo.bind(this)]
    ]);
  }

  /**
   * Handle beforeinput event
   */
  handleBeforeInput(event: InputEvent): void {
    // Always prevent default to control all editing
    event.preventDefault();
    
    // Skip if composing (handled separately)
    if (this.compositionState.isComposing && event.inputType !== 'insertCompositionText') {
      return;
    }
    
    const selection = this.config.getSelection();
    if (!selection) return;
    
    // Get the appropriate handler
    const handler = this.inputHandlers.get(event.inputType);
    if (handler) {
      try {
        handler(event, selection);
      } catch (error) {
        console.error(`Error handling input type ${event.inputType}:`, error);
        // Attempt recovery by re-rendering
        this.config.renderContent();
      }
    } else {
      console.warn(`Unhandled input type: ${event.inputType}`);
    }
  }

  /**
   * Handle composition start
   */
  handleCompositionStart(event: CompositionEvent): void {
    const selection = this.config.getSelection();
    if (!selection) return;
    
    this.compositionState = {
      isComposing: true,
      startOffset: selection.start,
      data: ''
    };
    
    // Delete selected text if any
    if (!selection.isCollapsed) {
      this.document.deleteText(selection.start, selection.end);
      this.config.setSelection(selection.start, selection.start);
    }
  }

  /**
   * Handle composition update
   */
  handleCompositionUpdate(event: CompositionEvent): void {
    // Store composition data but don't update document yet
    this.compositionState.data = event.data;
  }

  /**
   * Handle composition end
   */
  handleCompositionEnd(event: CompositionEvent): void {
    if (!this.compositionState.isComposing) return;
    
    const finalData = event.data;
    const startOffset = this.compositionState.startOffset;
    
    // Insert the final composition text
    if (finalData) {
      this.document.insertText(startOffset, finalData);
      const newOffset = startOffset + codeUnitLength(finalData);
      this.config.setSelection(newOffset, newOffset);
    }
    
    // Reset composition state
    this.compositionState = {
      isComposing: false,
      startOffset: 0,
      data: ''
    };
    
    // Trigger updates
    this.config.onChange?.(this.document.getText());
    this.config.renderContent();
  }

  /**
   * Insert text handler
   */
  private handleInsertText(event: InputEvent, selection: EditorSelection): void {
    const text = event.data || '';
    
    // Delete selected text first
    if (!selection.isCollapsed) {
      this.document.deleteText(selection.start, selection.end);
    }
    
    // Insert new text
    this.document.insertText(selection.start, text);
    
    // Update selection
    const newOffset = selection.start + codeUnitLength(text);
    this.config.setSelection(newOffset, newOffset);
    
    // Trigger updates
    this.config.onChange?.(this.document.getText());
    this.config.renderContent();
  }

  /**
   * Insert composition text handler
   */
  private handleInsertCompositionText(event: InputEvent, selection: EditorSelection): void {
    // Handled by composition events
    return;
  }

  /**
   * Delete backward handler
   */
  private handleDeleteBackward(event: InputEvent, selection: EditorSelection): void {
    if (!selection.isCollapsed) {
      // Delete selection
      this.document.deleteText(selection.start, selection.end);
      this.config.setSelection(selection.start, selection.start);
    } else if (selection.start > 0) {
      // Check if we're at the start of a block
      const blocks = this.document.getBlocks();
      const currentBlock = blocks.find(b => 
        selection.start === b.offset && b.offset > 0
      );
      
      if (currentBlock) {
        // At block boundary - merge with previous block
        const prevBlock = blocks[blocks.indexOf(currentBlock) - 1];
        if (prevBlock) {
          // Delete the newline character between blocks
          this.document.deleteText(selection.start - 1, selection.start);
          this.config.setSelection(selection.start - 1, selection.start - 1);
        }
      } else {
        // Delete single character before cursor
        const deleteStart = this.getPreviousCharacterOffset(selection.start);
        this.document.deleteText(deleteStart, selection.start);
        this.config.setSelection(deleteStart, deleteStart);
      }
    }
    
    this.config.onChange?.(this.document.getText());
    this.config.renderContent();
  }

  /**
   * Delete forward handler
   */
  private handleDeleteForward(event: InputEvent, selection: EditorSelection): void {
    if (!selection.isCollapsed) {
      // Delete selection
      this.document.deleteText(selection.start, selection.end);
      this.config.setSelection(selection.start, selection.start);
    } else if (selection.start < this.document.getLength()) {
      // Delete single character after cursor
      const deleteEnd = this.getNextCharacterOffset(selection.start);
      this.document.deleteText(selection.start, deleteEnd);
      this.config.setSelection(selection.start, selection.start);
    }
    
    this.config.onChange?.(this.document.getText());
    this.config.renderContent();
  }

  /**
   * Delete by cut handler
   */
  private handleDeleteByCut(event: InputEvent, selection: EditorSelection): void {
    if (!selection.isCollapsed) {
      this.document.deleteText(selection.start, selection.end);
      this.config.setSelection(selection.start, selection.start);
      this.config.onChange?.(this.document.getText());
      this.config.renderContent();
    }
  }

  /**
   * Delete by drag handler
   */
  private handleDeleteByDrag(event: InputEvent, selection: EditorSelection): void {
    // Similar to cut
    this.handleDeleteByCut(event, selection);
  }

  /**
   * Insert from paste handler
   */
  private handleInsertFromPaste(event: InputEvent, selection: EditorSelection): void {
    // Get paste data from event
    const pasteData = (event as any).dataTransfer?.getData('text/plain') || '';
    
    if (pasteData) {
      // Delete selection first
      if (!selection.isCollapsed) {
        this.document.deleteText(selection.start, selection.end);
      }
      
      // Insert pasted text
      this.document.insertText(selection.start, pasteData);
      
      // Update selection
      const newOffset = selection.start + codeUnitLength(pasteData);
      this.config.setSelection(newOffset, newOffset);
      
      this.config.onChange?.(this.document.getText());
      this.config.renderContent();
    }
  }

  /**
   * Insert from drop handler
   */
  private handleInsertFromDrop(event: InputEvent, selection: EditorSelection): void {
    // Similar to paste
    this.handleInsertFromPaste(event, selection);
  }

  /**
   * Insert line break handler
   */
  private handleInsertLineBreak(event: InputEvent, selection: EditorSelection): void {
    // For now, treat as paragraph break
    this.handleInsertParagraph(event, selection);
  }

  /**
   * Insert paragraph handler
   */
  private handleInsertParagraph(event: InputEvent, selection: EditorSelection): void {
    const blocks = this.document.getBlocks();
    const currentBlock = blocks.find(b => 
      selection.start >= b.offset && selection.start <= b.offset + b.length
    );
    
    if (currentBlock || blocks.length === 0) {
      // Delete any selected text first
      if (!selection.isCollapsed) {
        this.document.deleteText(selection.start, selection.end);
      }
      
      // Insert newline
      this.document.insertText(selection.start, '\n');
      
      // Create new block at the newline position
      this.document.createBlock(selection.start + 1);
      
      // Set cursor at start of new block
      const newOffset = selection.start + 1;
      this.config.setSelection(newOffset, newOffset);
      
      this.config.onChange?.(this.document.getText());
      this.config.renderContent();
    }
  }

  /**
   * Delete word backward handler
   */
  private handleDeleteWordBackward(event: InputEvent, selection: EditorSelection): void {
    if (!selection.isCollapsed) {
      this.handleDeleteBackward(event, selection);
      return;
    }
    
    const text = this.document.getText();
    let deleteStart = selection.start;
    
    // Find word boundary
    while (deleteStart > 0 && /\s/.test(text[deleteStart - 1])) {
      deleteStart--;
    }
    while (deleteStart > 0 && !/\s/.test(text[deleteStart - 1])) {
      deleteStart--;
    }
    
    if (deleteStart < selection.start) {
      this.document.deleteText(deleteStart, selection.start);
      this.config.setSelection(deleteStart, deleteStart);
      this.config.onChange?.(this.document.getText());
      this.config.renderContent();
    }
  }

  /**
   * Delete word forward handler
   */
  private handleDeleteWordForward(event: InputEvent, selection: EditorSelection): void {
    if (!selection.isCollapsed) {
      this.handleDeleteForward(event, selection);
      return;
    }
    
    const text = this.document.getText();
    let deleteEnd = selection.start;
    
    // Find word boundary
    while (deleteEnd < text.length && !/\s/.test(text[deleteEnd])) {
      deleteEnd++;
    }
    while (deleteEnd < text.length && /\s/.test(text[deleteEnd])) {
      deleteEnd++;
    }
    
    if (deleteEnd > selection.start) {
      this.document.deleteText(selection.start, deleteEnd);
      this.config.setSelection(selection.start, selection.start);
      this.config.onChange?.(this.document.getText());
      this.config.renderContent();
    }
  }

  /**
   * Delete line backward handler
   */
  private handleDeleteLineBackward(event: InputEvent, selection: EditorSelection): void {
    const line = this.document.getLineByOffset(selection.start);
    if (line) {
      const deleteStart = line.startOffset;
      if (deleteStart < selection.start) {
        this.document.deleteText(deleteStart, selection.start);
        this.config.setSelection(deleteStart, deleteStart);
        this.config.onChange?.(this.document.getText());
        this.config.renderContent();
      }
    }
  }

  /**
   * Delete line forward handler
   */
  private handleDeleteLineForward(event: InputEvent, selection: EditorSelection): void {
    const line = this.document.getLineByOffset(selection.start);
    if (line) {
      const deleteEnd = line.endOffset;
      if (deleteEnd > selection.start) {
        this.document.deleteText(selection.start, deleteEnd);
        this.config.setSelection(selection.start, selection.start);
        this.config.onChange?.(this.document.getText());
        this.config.renderContent();
      }
    }
  }

  /**
   * Format bold handler
   */
  private handleFormatBold(event: InputEvent, selection: EditorSelection): void {
    if (!selection.isCollapsed) {
      this.document.applyFormatting({
        type: 'bold',
        start: selection.start,
        end: selection.end,
        id: `fmt-${Date.now()}`
      });
      this.config.renderContent();
    }
  }

  /**
   * Format italic handler
   */
  private handleFormatItalic(event: InputEvent, selection: EditorSelection): void {
    // Not implemented yet
  }

  /**
   * Format underline handler
   */
  private handleFormatUnderline(event: InputEvent, selection: EditorSelection): void {
    // Not implemented yet
  }

  /**
   * Format strikethrough handler
   */
  private handleFormatStrikeThrough(event: InputEvent, selection: EditorSelection): void {
    // Not implemented yet
  }

  /**
   * Undo handler
   */
  private handleUndo(event: InputEvent, selection: EditorSelection): void {
    // Not implemented yet - would need undo/redo stack
  }

  /**
   * Redo handler
   */
  private handleRedo(event: InputEvent, selection: EditorSelection): void {
    // Not implemented yet - would need undo/redo stack
  }
  
  /**
   * Delete entire line handler
   */
  private handleDeleteEntireLine(event: InputEvent, selection: EditorSelection): void {
    const line = this.document.getLineByOffset(selection.start);
    if (line) {
      this.document.deleteText(line.startOffset, line.endOffset + 1); // +1 for newline
      this.config.setSelection(line.startOffset, line.startOffset);
      this.config.onChange?.(this.document.getText());
      this.config.renderContent();
    }
  }
  
  /**
   * Generic delete content handler
   */
  private handleDeleteContent(event: InputEvent, selection: EditorSelection): void {
    if (!selection.isCollapsed) {
      this.document.deleteText(selection.start, selection.end);
      this.config.setSelection(selection.start, selection.start);
      this.config.onChange?.(this.document.getText());
      this.config.renderContent();
    }
  }
  
  /**
   * Format remove handler - removes all formatting
   */
  private handleFormatRemove(event: InputEvent, selection: EditorSelection): void {
    if (!selection.isCollapsed) {
      this.document.removeFormatting(selection.start, selection.end);
      this.config.renderContent();
    }
  }

  /**
   * Get previous character offset (handles grapheme clusters)
   */
  private getPreviousCharacterOffset(offset: number): number {
    const text = this.document.getText(0, offset);
    if (text.length === 0) return 0;
    
    // Handle surrogate pairs and emoji
    let pos = offset;
    do {
      pos--;
      // Check if we're in the middle of a surrogate pair
      if (pos > 0 && text.charCodeAt(pos - 1) >= 0xD800 && text.charCodeAt(pos - 1) <= 0xDBFF &&
          text.charCodeAt(pos) >= 0xDC00 && text.charCodeAt(pos) <= 0xDFFF) {
        pos--; // Skip the high surrogate
      }
    } while (pos > 0 && this.isCombiningMark(text.charCodeAt(pos)));
    
    return Math.max(0, pos);
  }

  /**
   * Get next character offset (handles grapheme clusters)
   */
  private getNextCharacterOffset(offset: number): number {
    const totalLength = this.document.getLength();
    if (offset >= totalLength) return totalLength;
    
    const text = this.document.getText();
    let pos = offset;
    
    // Skip current character
    if (pos < totalLength && text.charCodeAt(pos) >= 0xD800 && text.charCodeAt(pos) <= 0xDBFF &&
        pos + 1 < totalLength && text.charCodeAt(pos + 1) >= 0xDC00 && text.charCodeAt(pos + 1) <= 0xDFFF) {
      pos += 2; // Skip surrogate pair
    } else {
      pos++;
    }
    
    // Skip combining marks
    while (pos < totalLength && this.isCombiningMark(text.charCodeAt(pos))) {
      pos++;
    }
    
    return Math.min(totalLength, pos);
  }
  
  /**
   * Check if character is a combining mark
   */
  private isCombiningMark(charCode: number): boolean {
    // Basic check for common combining marks
    return (charCode >= 0x0300 && charCode <= 0x036F) || // Combining Diacritical Marks
           (charCode >= 0x1AB0 && charCode <= 0x1AFF) || // Combining Diacritical Marks Extended
           (charCode >= 0x1DC0 && charCode <= 0x1DFF) || // Combining Diacritical Marks Supplement
           (charCode >= 0x20D0 && charCode <= 0x20FF) || // Combining Diacritical Marks for Symbols
           (charCode >= 0xFE20 && charCode <= 0xFE2F);   // Combining Half Marks
  }
}