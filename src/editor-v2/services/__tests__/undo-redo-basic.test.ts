/**
 * Basic tests for UndoRedoManager service
 * Simplified tests that properly handle DocumentModel's block behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentModel } from '../../models/document-model';
import { UndoRedoManager } from '../undo-redo-manager';

describe('UndoRedoManager Basic Tests', () => {
  let document: DocumentModel;
  let undoRedoManager: UndoRedoManager;

  beforeEach(() => {
    document = new DocumentModel();
    undoRedoManager = new UndoRedoManager(document);
  });

  describe('Simple Undo/Redo', () => {
    it('should undo and redo text insertion in first block', () => {
      // Insert text in the existing first block
      document.insertText(0, 'Hello World');
      undoRedoManager.recordActionImmediate();
      
      expect(document.getText()).toBe('Hello World');
      expect(undoRedoManager.canUndo()).toBe(true);
      
      // Undo
      const undoResult = undoRedoManager.undo();
      expect(undoResult).toBe(true);
      expect(document.getText()).toBe('');
      expect(undoRedoManager.canUndo()).toBe(false);
      expect(undoRedoManager.canRedo()).toBe(true);
      
      // Redo
      const redoResult = undoRedoManager.redo();
      expect(redoResult).toBe(true);
      expect(document.getText()).toBe('Hello World');
      expect(undoRedoManager.canUndo()).toBe(true);
      expect(undoRedoManager.canRedo()).toBe(false);
    });

    it('should handle multiple sequential edits', () => {
      // Edit 1
      document.insertText(0, 'First');
      undoRedoManager.recordActionImmediate();
      
      // Edit 2 - append to same block
      document.insertText(5, ' Second');
      undoRedoManager.recordActionImmediate();
      
      // Edit 3 - append more
      document.insertText(12, ' Third');
      undoRedoManager.recordActionImmediate();
      
      expect(document.getText()).toBe('First Second Third');
      
      // Undo one by one
      undoRedoManager.undo();
      expect(document.getText()).toBe('First Second');
      
      undoRedoManager.undo();
      expect(document.getText()).toBe('First');
      
      undoRedoManager.undo();
      expect(document.getText()).toBe('');
      
      // Redo one by one
      undoRedoManager.redo();
      expect(document.getText()).toBe('First');
      
      undoRedoManager.redo();
      expect(document.getText()).toBe('First Second');
      
      undoRedoManager.redo();
      expect(document.getText()).toBe('First Second Third');
    });

    it('should preserve formatting', () => {
      // Insert and format text
      document.insertText(0, 'Bold text here');
      document.applyFormatting({
        type: 'bold',
        start: 0,
        end: 4,
        id: 'fmt-1'
      });
      undoRedoManager.recordActionImmediate();
      
      // Check formatting exists
      let formatting = document.getFormattingInRange(0, 14);
      expect(formatting).toHaveLength(1);
      expect(formatting[0].type).toBe('bold');
      
      // Undo
      undoRedoManager.undo();
      expect(document.getText()).toBe('');
      formatting = document.getFormattingInRange(0, 10);
      expect(formatting).toHaveLength(0);
      
      // Redo
      undoRedoManager.redo();
      expect(document.getText()).toBe('Bold text here');
      formatting = document.getFormattingInRange(0, 14);
      expect(formatting).toHaveLength(1);
      expect(formatting[0].type).toBe('bold');
      expect(formatting[0].start).toBe(0);
      expect(formatting[0].end).toBe(4);
    });

    it('should handle text deletion', () => {
      // Insert text
      document.insertText(0, 'Delete this text');
      undoRedoManager.recordActionImmediate();
      
      // Delete part of it
      document.deleteText(7, 12);
      undoRedoManager.recordActionImmediate();
      
      expect(document.getText()).toBe('Delete  text');
      
      // Undo deletion
      undoRedoManager.undo();
      expect(document.getText()).toBe('Delete this text');
      
      // Redo deletion
      undoRedoManager.redo();
      expect(document.getText()).toBe('Delete  text');
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      // Add content to test undo
      document.insertText(0, 'Test content');
      undoRedoManager.recordActionImmediate();
    });

    it('should handle Ctrl+Z for undo', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        metaKey: false,
        shiftKey: false
      });
      
      // Mock preventDefault
      let defaultPrevented = false;
      event.preventDefault = () => { defaultPrevented = true; };
      
      const handled = undoRedoManager.handleKeyboardShortcut(event);
      expect(handled).toBe(true);
      expect(defaultPrevented).toBe(true);
      expect(document.getText()).toBe('');
    });

    it('should handle Cmd+Z for undo on Mac', () => {
      // Mock Mac platform
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true
      });
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: false,
        metaKey: true,
        shiftKey: false
      });
      
      // Mock preventDefault
      let defaultPrevented = false;
      event.preventDefault = () => { defaultPrevented = true; };
      
      const handled = undoRedoManager.handleKeyboardShortcut(event);
      expect(handled).toBe(true);
      expect(defaultPrevented).toBe(true);
      expect(document.getText()).toBe('');
    });

    it('should handle redo shortcuts', () => {
      // First undo
      undoRedoManager.undo();
      expect(document.getText()).toBe('');
      
      // Test Ctrl+Shift+Z
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        metaKey: false,
        shiftKey: true
      });
      
      // Mock preventDefault
      let defaultPrevented = false;
      event.preventDefault = () => { defaultPrevented = true; };
      
      const handled = undoRedoManager.handleKeyboardShortcut(event);
      expect(handled).toBe(true);
      expect(defaultPrevented).toBe(true);
      expect(document.getText()).toBe('Test content');
    });
  });

  describe('Memory Management', () => {
    it('should respect action limit', () => {
      const manager = new UndoRedoManager(document, {
        maxActions: 5,
        maxMemoryMB: 10
      });
      
      // Add 10 actions
      for (let i = 0; i < 10; i++) {
        document.insertText(0, `${i}`);
        manager.recordActionImmediate();
      }
      
      // Should only keep last 5
      expect(manager.getUndoCount()).toBe(5);
      
      // Undo all available
      let undoCount = 0;
      while (manager.canUndo()) {
        manager.undo();
        undoCount++;
      }
      
      expect(undoCount).toBe(5);
      // Should have text from actions 0-4 (5,6,7,8,9 were kept and undone)
      const remainingText = document.getText();
      expect(remainingText).toContain('0');
      expect(remainingText).toContain('4');
      expect(remainingText).not.toContain('5');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty undo/redo stacks', () => {
      expect(undoRedoManager.undo()).toBe(false);
      expect(undoRedoManager.redo()).toBe(false);
    });

    it('should clear redo stack on new action', () => {
      document.insertText(0, 'First');
      undoRedoManager.recordActionImmediate();
      
      undoRedoManager.undo();
      expect(undoRedoManager.canRedo()).toBe(true);
      
      // New action
      document.insertText(0, 'New');
      undoRedoManager.recordActionImmediate();
      
      expect(undoRedoManager.canRedo()).toBe(false);
    });

    it('should debounce rapid changes', async () => {
      // Make rapid changes
      for (let i = 0; i < 5; i++) {
        document.insertText(0, `${i}`);
        undoRedoManager.recordAction(); // Not immediate
      }
      
      // Should not be recorded yet
      expect(undoRedoManager.getUndoCount()).toBe(0);
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should now have one batched action
      expect(undoRedoManager.getUndoCount()).toBe(1);
      
      // Undo should restore to empty
      undoRedoManager.undo();
      expect(document.getText()).toBe('');
    });
  });
});