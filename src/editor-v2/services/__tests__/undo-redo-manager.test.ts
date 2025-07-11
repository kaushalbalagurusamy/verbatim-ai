/**
 * Comprehensive tests for UndoRedoManager service
 * Verifies undo/redo functionality with exact content and formatting preservation
 * Tests rapid operations, memory limits, and keyboard shortcuts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentModel } from '../../models/document-model';
import { UndoRedoManager } from '../undo-redo-manager';

describe('UndoRedoManager', () => {
  let document: DocumentModel;
  let undoRedoManager: UndoRedoManager;
  let onChangeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document = new DocumentModel();
    onChangeMock = vi.fn();
    undoRedoManager = new UndoRedoManager(document, {
      maxActions: 100,
      maxMemoryMB: 10,
      onChange: onChangeMock
    });
  });

  describe('Basic Undo/Redo', () => {
    it('should undo text insertion', () => {
      // Initial state
      const initialText = document.getText();
      
      // Insert text
      document.insertText(0, 'Hello World');
      undoRedoManager.recordAction();
      
      expect(document.getText()).toBe('Hello World');
      
      // Undo
      const result = undoRedoManager.undo();
      expect(result).toBe(true);
      expect(document.getText()).toBe(initialText);
      expect(undoRedoManager.canUndo()).toBe(false);
      expect(undoRedoManager.canRedo()).toBe(true);
    });

    it('should redo after undo', () => {
      // Insert text
      document.insertText(0, 'Hello World');
      undoRedoManager.recordAction();
      
      // Undo
      undoRedoManager.undo();
      
      // Redo
      const result = undoRedoManager.redo();
      expect(result).toBe(true);
      expect(document.getText()).toBe('Hello World');
      expect(undoRedoManager.canUndo()).toBe(true);
      expect(undoRedoManager.canRedo()).toBe(false);
    });

    it('should handle multiple undo/redo operations', () => {
      // Make multiple edits
      document.insertText(0, 'First');
      undoRedoManager.recordAction();
      
      document.insertText(5, ' Second');
      undoRedoManager.recordAction();
      
      document.insertText(12, ' Third');
      undoRedoManager.recordAction();
      
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

    it('should clear redo stack when new action is recorded', () => {
      // Insert and undo
      document.insertText(0, 'Hello');
      undoRedoManager.recordAction();
      undoRedoManager.undo();
      
      expect(undoRedoManager.canRedo()).toBe(true);
      
      // New action
      document.insertText(0, 'New');
      undoRedoManager.recordAction();
      
      expect(undoRedoManager.canRedo()).toBe(false);
    });
  });

  describe('Complex Content Preservation', () => {
    it('should preserve formatting across undo/redo', () => {
      // Insert text with formatting
      document.insertText(0, 'Bold text here');
      document.applyFormatting({
        type: 'bold',
        start: 0,
        end: 4,
        id: 'fmt-1'
      });
      undoRedoManager.recordAction();
      
      // Verify formatting
      const formatting = document.getFormattingInRange(0, 14);
      expect(formatting).toHaveLength(1);
      expect(formatting[0].type).toBe('bold');
      
      // Undo
      undoRedoManager.undo();
      expect(document.getText()).toBe('');
      expect(document.getFormattingInRange(0, 10)).toHaveLength(0);
      
      // Redo
      undoRedoManager.redo();
      expect(document.getText()).toBe('Bold text here');
      const restoredFormatting = document.getFormattingInRange(0, 14);
      expect(restoredFormatting).toHaveLength(1);
      expect(restoredFormatting[0].type).toBe('bold');
      expect(restoredFormatting[0].start).toBe(0);
      expect(restoredFormatting[0].end).toBe(4);
    });

    it('should preserve multiple blocks', () => {
      // Create multiple blocks
      document.insertText(0, 'First paragraph');
      document.insertText(15, '\n');
      document.createBlock(16, 'paragraph');
      document.insertText(16, 'Second paragraph');
      document.insertText(32, '\n');
      document.createBlock(33, 'heading');
      document.insertText(33, 'Heading');
      undoRedoManager.recordAction();
      
      const blocks = document.getBlocks();
      expect(blocks).toHaveLength(3);
      expect(blocks[2].type).toBe('heading');
      
      // Undo
      undoRedoManager.undo();
      expect(document.getText()).toBe('');
      expect(document.getBlocks()).toHaveLength(1);
      
      // Redo
      undoRedoManager.redo();
      const restoredBlocks = document.getBlocks();
      expect(restoredBlocks).toHaveLength(3);
      expect(restoredBlocks[0].text).toBe('First paragraph');
      expect(restoredBlocks[1].text).toBe('Second paragraph');
      expect(restoredBlocks[2].text).toBe('Heading');
      expect(restoredBlocks[2].type).toBe('heading');
    });

    it('should handle emoji and special characters', () => {
      // Insert emoji and special characters
      const specialText = '👋 Hello 🌍! Special: €£¥ End 🎉';
      document.insertText(0, specialText);
      undoRedoManager.recordAction();
      
      expect(document.getText()).toBe(specialText);
      
      // Undo and redo
      undoRedoManager.undo();
      expect(document.getText()).toBe('');
      
      undoRedoManager.redo();
      expect(document.getText()).toBe(specialText);
    });
  });

  describe('Rapid Operations (100 undos/redos)', () => {
    it('should handle 100 rapid text insertions with undo/redo', () => {
      const operations: string[] = [];
      
      // Perform 100 insertions
      for (let i = 0; i < 100; i++) {
        const text = `Text${i} `;
        document.insertText(document.getLength(), text);
        undoRedoManager.recordActionImmediate(); // Force immediate recording
        operations.push(text);
      }
      
      const fullText = operations.join('');
      expect(document.getText()).toBe(fullText);
      expect(undoRedoManager.getUndoCount()).toBe(100);
      
      // Undo all 100 operations
      for (let i = 99; i >= 0; i--) {
        const result = undoRedoManager.undo();
        expect(result).toBe(true);
        const expectedText = operations.slice(0, i).join('');
        expect(document.getText()).toBe(expectedText);
      }
      
      expect(document.getText()).toBe('');
      expect(undoRedoManager.getUndoCount()).toBe(0);
      expect(undoRedoManager.getRedoCount()).toBe(100);
      
      // Redo all 100 operations
      for (let i = 0; i < 100; i++) {
        const result = undoRedoManager.redo();
        expect(result).toBe(true);
        const expectedText = operations.slice(0, i + 1).join('');
        expect(document.getText()).toBe(expectedText);
      }
      
      expect(document.getText()).toBe(fullText);
      expect(undoRedoManager.getRedoCount()).toBe(0);
    });

    it('should handle rapid mixed operations', () => {
      // Perform various operations rapidly
      for (let i = 0; i < 50; i++) {
        const currentLength = document.getLength();
        
        if (i % 3 === 0) {
          // Insert at end
          document.insertText(currentLength, `${i}`);
        } else if (i % 3 === 1 && currentLength > 0) {
          // Delete from end
          document.deleteText(currentLength - 1, currentLength);
        } else if (currentLength >= 5) {
          // Apply formatting to first 5 characters
          document.applyFormatting({
            type: 'bold',
            start: 0,
            end: Math.min(5, currentLength),
            id: `fmt-${i}`
          });
        }
        undoRedoManager.recordActionImmediate();
      }
      
      const finalText = document.getText();
      const finalFormatting = document.getFormattingInRange(0, document.getLength());
      
      // Undo all
      for (let i = 0; i < 50; i++) {
        undoRedoManager.undo();
      }
      
      expect(document.getText()).toBe('');
      
      // Redo all
      for (let i = 0; i < 50; i++) {
        undoRedoManager.redo();
      }
      
      expect(document.getText()).toBe(finalText);
      expect(document.getFormattingInRange(0, document.getLength())).toEqual(finalFormatting);
    });
  });

  describe('Memory Management', () => {
    it('should enforce max actions limit', () => {
      const manager = new UndoRedoManager(document, {
        maxActions: 10,
        maxMemoryMB: 10
      });
      
      // Add 15 actions
      for (let i = 0; i < 15; i++) {
        document.insertText(document.getLength(), `Action${i} `);
        manager.recordActionImmediate();
      }
      
      // Should only keep last 10
      expect(manager.getUndoCount()).toBe(10);
      
      // Oldest actions should be gone
      for (let i = 0; i < 10; i++) {
        manager.undo();
      }
      
      // Should not contain first 5 actions
      const text = document.getText();
      expect(text).not.toContain('Action0');
      expect(text).not.toContain('Action4');
      expect(text).toContain('Action5');
    });

    it('should enforce memory limit', () => {
      const manager = new UndoRedoManager(document, {
        maxActions: 1000,
        maxMemoryMB: 0.001 // Very small limit
      });
      
      // Add large text until memory limit
      let actionCount = 0;
      const largeText = 'A'.repeat(1000); // 1KB per action
      
      for (let i = 0; i < 20; i++) {
        document.insertText(0, largeText);
        manager.recordActionImmediate();
        actionCount++;
      }
      
      // Should have removed old actions due to memory limit
      expect(manager.getUndoCount()).toBeLessThan(actionCount);
      expect(manager.getMemoryUsage()).toBeLessThanOrEqual(0.001 * 1024 * 1024);
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      // Mock navigator.platform
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true
      });
    });

    it('should handle Cmd+Z for undo on Mac', () => {
      document.insertText(0, 'Test');
      undoRedoManager.recordAction();
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
        ctrlKey: false,
        shiftKey: false
      });
      vi.spyOn(event, 'preventDefault');
      
      const handled = undoRedoManager.handleKeyboardShortcut(event);
      expect(handled).toBe(true);
      expect(document.getText()).toBe('');
    });

    it('should handle Cmd+Shift+Z for redo on Mac', () => {
      document.insertText(0, 'Test');
      undoRedoManager.recordAction();
      undoRedoManager.undo();
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
        ctrlKey: false,
        shiftKey: true
      });
      vi.spyOn(event, 'preventDefault');
      
      const handled = undoRedoManager.handleKeyboardShortcut(event);
      expect(handled).toBe(true);
      expect(document.getText()).toBe('Test');
    });

    it('should handle Ctrl+Z for undo on Windows/Linux', () => {
      // Mock Windows platform
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        configurable: true
      });
      
      document.insertText(0, 'Test');
      undoRedoManager.recordAction();
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: false,
        ctrlKey: true,
        shiftKey: false
      });
      vi.spyOn(event, 'preventDefault');
      
      const handled = undoRedoManager.handleKeyboardShortcut(event);
      expect(handled).toBe(true);
      expect(document.getText()).toBe('');
    });

    it('should handle Ctrl+Y for redo on Windows/Linux', () => {
      // Mock Windows platform
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        configurable: true
      });
      
      document.insertText(0, 'Test');
      undoRedoManager.recordAction();
      undoRedoManager.undo();
      
      const event = new KeyboardEvent('keydown', {
        key: 'y',
        metaKey: false,
        ctrlKey: true,
        shiftKey: false
      });
      vi.spyOn(event, 'preventDefault');
      
      const handled = undoRedoManager.handleKeyboardShortcut(event);
      expect(handled).toBe(true);
      expect(document.getText()).toBe('Test');
    });

    it('should not handle unrelated keyboard events', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'a',
        metaKey: true,
        ctrlKey: false,
        shiftKey: false
      });
      
      const handled = undoRedoManager.handleKeyboardShortcut(event);
      expect(handled).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undo when stack is empty', () => {
      const result = undoRedoManager.undo();
      expect(result).toBe(false);
      expect(document.getText()).toBe('');
    });

    it('should handle redo when stack is empty', () => {
      const result = undoRedoManager.redo();
      expect(result).toBe(false);
      expect(document.getText()).toBe('');
    });

    it('should debounce rapid recordAction calls', async () => {
      // Make rapid changes
      for (let i = 0; i < 10; i++) {
        document.insertText(0, `${i}`);
        undoRedoManager.recordAction();
      }
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should have been batched into one action
      expect(undoRedoManager.getUndoCount()).toBe(1);
      
      // Undo should restore to initial state
      undoRedoManager.undo();
      expect(document.getText()).toBe('');
    });

    it('should handle clearHistory', () => {
      // Add some history
      document.insertText(0, 'Test');
      undoRedoManager.recordAction();
      undoRedoManager.undo();
      
      expect(undoRedoManager.canUndo()).toBe(false);
      expect(undoRedoManager.canRedo()).toBe(true);
      
      // Clear
      undoRedoManager.clearHistory();
      
      expect(undoRedoManager.canUndo()).toBe(false);
      expect(undoRedoManager.canRedo()).toBe(false);
      expect(undoRedoManager.getMemoryUsage()).toBe(0);
    });

    it('should notify onChange callback', () => {
      // onChange was called in constructor, verify it was called
      expect(onChangeMock).not.toHaveBeenCalled(); // We cleared it after constructor
      
      // Add action
      document.insertText(0, 'Test');
      undoRedoManager.recordActionImmediate();
      expect(onChangeMock).toHaveBeenCalledWith(true, false);
      
      // Undo
      undoRedoManager.undo();
      expect(onChangeMock).toHaveBeenCalledWith(false, true);
      
      // Redo
      undoRedoManager.redo();
      expect(onChangeMock).toHaveBeenCalledWith(true, false);
    });
  });
});