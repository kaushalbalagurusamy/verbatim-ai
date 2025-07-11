/**
 * Debug test to understand undo/redo behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentModel } from '../../models/document-model';
import { UndoRedoManager } from '../undo-redo-manager';

describe('UndoRedoManager Debug', () => {
  let document: DocumentModel;
  let undoRedoManager: UndoRedoManager;

  beforeEach(() => {
    document = new DocumentModel();
    undoRedoManager = new UndoRedoManager(document);
  });

  it('should debug simple undo/redo', () => {
    console.log('Initial state:', {
      text: document.getText(),
      blocks: document.getBlocks().length,
      length: document.getLength()
    });
    
    // Insert text
    document.insertText(0, 'Hello');
    console.log('After insert:', {
      text: document.getText(),
      blocks: document.getBlocks().map(b => ({ id: b.id, text: b.text, offset: b.offset })),
      length: document.getLength()
    });
    
    // Record action
    undoRedoManager.recordActionImmediate();
    console.log('Undo stack count:', undoRedoManager.getUndoCount());
    
    // Undo
    const undoResult = undoRedoManager.undo();
    console.log('After undo:', {
      result: undoResult,
      text: document.getText(),
      blocks: document.getBlocks().map(b => ({ id: b.id, text: b.text, offset: b.offset })),
      length: document.getLength(),
      redoCount: undoRedoManager.getRedoCount()
    });
    
    // Redo
    const redoResult = undoRedoManager.redo();
    console.log('After redo:', {
      result: redoResult,
      text: document.getText(),
      blocks: document.getBlocks().map(b => ({ id: b.id, text: b.text, offset: b.offset })),
      length: document.getLength()
    });
    
    expect(document.getText()).toBe('Hello');
  });
});