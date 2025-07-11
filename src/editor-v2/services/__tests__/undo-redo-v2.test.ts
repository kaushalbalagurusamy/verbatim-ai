/**
 * Tests for simplified UndoRedoManagerV2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentModel } from '../../models/document-model';
import { UndoRedoManagerV2 } from '../undo-redo-manager-v2';

describe('UndoRedoManagerV2', () => {
  let document: DocumentModel;
  let undoRedoManager: UndoRedoManagerV2;

  beforeEach(() => {
    document = new DocumentModel();
    undoRedoManager = new UndoRedoManagerV2(document);
  });

  it('should undo and redo text insertion', () => {
    // Record initial state
    undoRedoManager.recordActionImmediate();
    
    // Insert text
    document.insertText(0, 'Hello World');
    undoRedoManager.recordActionImmediate();
    
    expect(document.getText()).toBe('Hello World');
    
    // Undo
    const undoResult = undoRedoManager.undo();
    expect(undoResult).toBe(true);
    expect(document.getText()).toBe('');
    
    // Redo
    const redoResult = undoRedoManager.redo();
    expect(redoResult).toBe(true);
    expect(document.getText()).toBe('Hello World');
  });

  it('should handle multiple operations', () => {
    // Record initial state
    undoRedoManager.recordActionImmediate();
    
    // Operation 1
    document.insertText(0, 'First');
    undoRedoManager.recordActionImmediate();
    
    // Operation 2
    document.insertText(5, ' Second');
    undoRedoManager.recordActionImmediate();
    
    // Operation 3
    document.insertText(12, ' Third');
    undoRedoManager.recordActionImmediate();
    
    expect(document.getText()).toBe('First Second Third');
    
    // Undo all
    undoRedoManager.undo();
    expect(document.getText()).toBe('First Second');
    
    undoRedoManager.undo();
    expect(document.getText()).toBe('First');
    
    undoRedoManager.undo();
    expect(document.getText()).toBe('');
    
    // Redo all
    undoRedoManager.redo();
    expect(document.getText()).toBe('First');
    
    undoRedoManager.redo();
    expect(document.getText()).toBe('First Second');
    
    undoRedoManager.redo();
    expect(document.getText()).toBe('First Second Third');
  });

  it('should preserve formatting', () => {
    // Record initial state
    undoRedoManager.recordActionImmediate();
    
    // Insert and format
    document.insertText(0, 'Bold text');
    document.applyFormatting({
      type: 'bold',
      start: 0,
      end: 4,
      id: 'fmt-1'
    });
    undoRedoManager.recordActionImmediate();
    
    // Check formatting
    let formatting = document.getFormattingInRange(0, 9);
    expect(formatting).toHaveLength(1);
    expect(formatting[0].type).toBe('bold');
    
    // Undo
    undoRedoManager.undo();
    expect(document.getText()).toBe('');
    formatting = document.getFormattingInRange(0, 10);
    expect(formatting).toHaveLength(0);
    
    // Redo
    undoRedoManager.redo();
    expect(document.getText()).toBe('Bold text');
    formatting = document.getFormattingInRange(0, 9);
    expect(formatting).toHaveLength(1);
    expect(formatting[0].type).toBe('bold');
  });

  it('should handle keyboard shortcuts', () => {
    undoRedoManager.recordActionImmediate();
    document.insertText(0, 'Test');
    undoRedoManager.recordActionImmediate();
    
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      metaKey: false,
      shiftKey: false
    });
    
    let defaultPrevented = false;
    event.preventDefault = () => { defaultPrevented = true; };
    
    const handled = undoRedoManager.handleKeyboardShortcut(event);
    expect(handled).toBe(true);
    expect(defaultPrevented).toBe(true);
    expect(document.getText()).toBe('');
  });
});