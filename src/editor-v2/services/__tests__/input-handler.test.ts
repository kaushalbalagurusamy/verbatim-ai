/**
 * Unit tests for InputHandlerService
 * Tests all inputType mappings and composition event handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InputHandlerService } from '../input-handler';
import { DocumentModel } from '../../models/document-model';

describe('InputHandlerService', () => {
  let document: DocumentModel;
  let inputHandler: InputHandlerService;
  let mockConfig: any;
  let mockSelection: any;

  beforeEach(() => {
    document = new DocumentModel();
    mockSelection = { start: 0, end: 0, isCollapsed: true, text: '' };
    
    mockConfig = {
      getSelection: vi.fn(() => mockSelection),
      setSelection: vi.fn(),
      renderContent: vi.fn(),
      onChange: vi.fn()
    };
    
    inputHandler = new InputHandlerService(document, mockConfig);
  });

  describe('Text insertion', () => {
    it('should handle insertText inputType', () => {
      mockSelection = { start: 0, end: 0, isCollapsed: true, text: '' };
      const event = new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: 'Hello'
      });
      
      inputHandler.handleBeforeInput(event);
      
      expect(document.getText()).toBe('Hello');
      expect(mockConfig.setSelection).toHaveBeenCalledWith(5, 5);
      expect(mockConfig.onChange).toHaveBeenCalledWith('Hello');
      expect(mockConfig.renderContent).toHaveBeenCalled();
    });

    it('should replace selected text when inserting', () => {
      document.insertText(0, 'Hello World');
      mockSelection = { start: 0, end: 5, isCollapsed: false, text: 'Hello' };
      
      const event = new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: 'Hi'
      });
      
      inputHandler.handleBeforeInput(event);
      
      expect(document.getText()).toBe('Hi World');
      expect(mockConfig.setSelection).toHaveBeenCalledWith(2, 2);
    });
  });

  describe('Deletion operations', () => {
    beforeEach(() => {
      document.insertText(0, 'Hello World');
    });

    it('should handle deleteContentBackward', () => {
      mockSelection = { start: 5, end: 5, isCollapsed: true, text: '' };
      
      const event = new InputEvent('beforeinput', {
        inputType: 'deleteContentBackward'
      });
      
      inputHandler.handleBeforeInput(event);
      
      expect(document.getText()).toBe('Hell World');
      expect(mockConfig.setSelection).toHaveBeenCalledWith(4, 4);
    });

    it('should handle deleteContentForward', () => {
      mockSelection = { start: 5, end: 5, isCollapsed: true, text: '' };
      
      const event = new InputEvent('beforeinput', {
        inputType: 'deleteContentForward'
      });
      
      inputHandler.handleBeforeInput(event);
      
      expect(document.getText()).toBe('Hello orld');
      expect(mockConfig.setSelection).toHaveBeenCalledWith(5, 5);
    });

    it('should delete selection when not collapsed', () => {
      mockSelection = { start: 0, end: 5, isCollapsed: false, text: 'Hello' };
      
      const event = new InputEvent('beforeinput', {
        inputType: 'deleteContentBackward'
      });
      
      inputHandler.handleBeforeInput(event);
      
      expect(document.getText()).toBe(' World');
      expect(mockConfig.setSelection).toHaveBeenCalledWith(0, 0);
    });

    it('should handle deleteWordBackward', () => {
      mockSelection = { start: 11, end: 11, isCollapsed: true, text: '' };
      
      const event = new InputEvent('beforeinput', {
        inputType: 'deleteWordBackward'
      });
      
      inputHandler.handleBeforeInput(event);
      
      expect(document.getText()).toBe('Hello ');
      expect(mockConfig.setSelection).toHaveBeenCalledWith(6, 6);
    });

    it('should handle deleteWordForward', () => {
      mockSelection = { start: 0, end: 0, isCollapsed: true, text: '' };
      
      const event = new InputEvent('beforeinput', {
        inputType: 'deleteWordForward'
      });
      
      inputHandler.handleBeforeInput(event);
      
      expect(document.getText()).toBe(' World');
      expect(mockConfig.setSelection).toHaveBeenCalledWith(0, 0);
    });
  });

  describe('Line operations', () => {
    beforeEach(() => {
      document.insertText(0, 'Line 1\nLine 2\nLine 3');
      document.createBlock(7);
      document.createBlock(14);
    });

    it('should handle insertParagraph', () => {
      mockSelection = { start: 6, end: 6, isCollapsed: true, text: '' };
      
      const event = new InputEvent('beforeinput', {
        inputType: 'insertParagraph'
      });
      
      inputHandler.handleBeforeInput(event);
      
      expect(document.getText()).toBe('Line 1\n\nLine 2\nLine 3');
      expect(mockConfig.setSelection).toHaveBeenCalledWith(7, 7);
    });

    it('should handle deleteSoftLineBackward', () => {
      mockSelection = { start: 13, end: 13, isCollapsed: true, text: '' };
      
      const event = new InputEvent('beforeinput', {
        inputType: 'deleteSoftLineBackward'
      });
      
      inputHandler.handleBeforeInput(event);
      
      expect(document.getText()).toBe('Line 1\n\nLine 3');
    });

    it('should handle deleteSoftLineForward', () => {
      mockSelection = { start: 7, end: 7, isCollapsed: true, text: '' };
      
      const event = new InputEvent('beforeinput', {
        inputType: 'deleteSoftLineForward'
      });
      
      inputHandler.handleBeforeInput(event);
      
      expect(document.getText()).toBe('Line 1\n\nLine 3');
    });
  });

  describe('Composition events', () => {
    it('should handle composition lifecycle', () => {
      // Start composition
      mockSelection = { start: 0, end: 0, isCollapsed: true, text: '' };
      const startEvent = new CompositionEvent('compositionstart', {
        data: ''
      });
      
      inputHandler.handleCompositionStart(startEvent);
      
      // Update composition (should not modify document)
      const updateEvent = new CompositionEvent('compositionupdate', {
        data: 'こんに'
      });
      
      inputHandler.handleCompositionUpdate(updateEvent);
      expect(document.getText()).toBe(''); // No change yet
      
      // End composition
      const endEvent = new CompositionEvent('compositionend', {
        data: 'こんにちは'
      });
      
      inputHandler.handleCompositionEnd(endEvent);
      expect(document.getText()).toBe('こんにちは');
      expect(mockConfig.setSelection).toHaveBeenCalledWith(5, 5);
    });

    it('should handle composition with selection', () => {
      document.insertText(0, 'Hello World');
      mockSelection = { start: 0, end: 5, isCollapsed: false, text: 'Hello' };
      
      const startEvent = new CompositionEvent('compositionstart', {
        data: ''
      });
      
      inputHandler.handleCompositionStart(startEvent);
      expect(document.getText()).toBe(' World'); // Selection deleted
      
      const endEvent = new CompositionEvent('compositionend', {
        data: '你好'
      });
      
      inputHandler.handleCompositionEnd(endEvent);
      expect(document.getText()).toBe('你好 World');
    });
  });

  describe('Clipboard operations', () => {
    it('should handle insertFromPaste', () => {
      mockSelection = { start: 0, end: 0, isCollapsed: true, text: '' };
      
      // Create a mock event with dataTransfer
      const event: any = new InputEvent('beforeinput', {
        inputType: 'insertFromPaste'
      });
      event.dataTransfer = {
        getData: (type: string) => type === 'text/plain' ? 'Pasted text' : ''
      };
      
      inputHandler.handleBeforeInput(event);
      
      expect(document.getText()).toBe('Pasted text');
      expect(mockConfig.setSelection).toHaveBeenCalledWith(11, 11);
    });

    it('should handle deleteByCut', () => {
      document.insertText(0, 'Hello World');
      mockSelection = { start: 0, end: 5, isCollapsed: false, text: 'Hello' };
      
      const event = new InputEvent('beforeinput', {
        inputType: 'deleteByCut'
      });
      
      inputHandler.handleBeforeInput(event);
      
      expect(document.getText()).toBe(' World');
      expect(mockConfig.setSelection).toHaveBeenCalledWith(0, 0);
    });
  });

  describe('Formatting operations', () => {
    beforeEach(() => {
      document.insertText(0, 'Hello World');
    });

    it('should handle formatBold', () => {
      mockSelection = { start: 0, end: 5, isCollapsed: false, text: 'Hello' };
      
      const event = new InputEvent('beforeinput', {
        inputType: 'formatBold'
      });
      
      inputHandler.handleBeforeInput(event);
      
      const formatting = document.getFormattingInRange(0, 5);
      expect(formatting).toHaveLength(1);
      expect(formatting[0].type).toBe('bold');
      expect(formatting[0].start).toBe(0);
      expect(formatting[0].end).toBe(5);
      expect(mockConfig.renderContent).toHaveBeenCalled();
    });

    it('should not format when selection is collapsed', () => {
      mockSelection = { start: 0, end: 0, isCollapsed: true, text: '' };
      
      const event = new InputEvent('beforeinput', {
        inputType: 'formatBold'
      });
      
      inputHandler.handleBeforeInput(event);
      
      const formatting = document.getFormattingInRange(0, 11);
      expect(formatting).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle unknown inputType gracefully', () => {
      mockSelection = { start: 0, end: 0, isCollapsed: true, text: '' };
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const event = new InputEvent('beforeinput', {
        inputType: 'unknownInputType' as any
      });
      
      inputHandler.handleBeforeInput(event);
      
      expect(consoleSpy).toHaveBeenCalledWith('Unhandled input type: unknownInputType');
      consoleSpy.mockRestore();
    });

    it('should skip input when no selection', () => {
      mockConfig.getSelection = vi.fn(() => null);
      
      const event = new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: 'Hello'
      });
      
      inputHandler.handleBeforeInput(event);
      
      expect(document.getText()).toBe('');
      expect(mockConfig.renderContent).not.toHaveBeenCalled();
    });

    it('should prevent default for all input events', () => {
      mockSelection = { start: 0, end: 0, isCollapsed: true, text: '' };
      
      const event = new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: 'Hello'
      });
      
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      
      inputHandler.handleBeforeInput(event);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });
});