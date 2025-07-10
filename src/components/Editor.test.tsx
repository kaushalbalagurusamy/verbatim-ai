/**
 * Comprehensive integration tests for the Editor component
 * Tests all reported bugs and core functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Test the actual Editor being used in the app (EditorV2Adapter)
import { EditorV2Adapter as Editor } from '@/editor-v2/integration/EditorV2Adapter';
import { renderWithProviders } from '@/test/test-utils/test-wrapper';
import {
  setupContentEditable,
  setCursorPosition,
  setSelection,
  getSelectionInfo,
  typeText,
  waitForDOMUpdate,
  createMockContentBlocks
} from '@/test/test-utils/editor-test-helpers';
import {
  setupMockSelection,
  isLineNumberActive,
  getLineNumberElement,
  simulateKeyboardShortcut
} from '@/test/test-utils/selection-test-helpers';
import {
  hasFormatting,
  getHighlightColor,
  assertFormatting
} from '@/test/test-utils/formatting-test-helpers';

describe('Editor Component - Bug Tests', () => {
  let container: HTMLElement;
  let mockSelection: ReturnType<typeof setupMockSelection>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockSelection = setupMockSelection();
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  describe('Bug 1: Line Number Cursor Tracking', () => {
    it('should highlight only the line where cursor is positioned, not entire paragraph', async () => {
      const content = createMockContentBlocks([
        'This is a long paragraph that will wrap to multiple lines when rendered in the editor. It contains enough text to ensure wrapping occurs.',
        'Second paragraph'
      ]);

      const { container: editorContainer } = renderWithProviders(
        <Editor
          content={content}
          onChange={vi.fn()}
          onSelectionChange={vi.fn()}
        />
      );

      await waitForDOMUpdate();

      // Find the editor content
      const editor = editorContainer.querySelector('[contenteditable="true"]');
      expect(editor).toBeTruthy();

      // Set cursor at beginning of first paragraph
      const firstBlock = editor!.querySelector('[data-block-id]');
      expect(firstBlock).toBeTruthy();
      
      setCursorPosition(firstBlock as HTMLElement, 0);
      
      // Trigger selection change
      fireEvent.focusIn(editor!);
      const selectionEvent = new Event('selectionchange', { bubbles: true });
      document.dispatchEvent(selectionEvent);

      await waitForDOMUpdate();
      
      // Wait for line numbers to be created
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
      });

      // Check line numbers
      const lineNumbers = editorContainer.querySelectorAll('.line-number');
      expect(lineNumbers.length).toBeGreaterThan(1); // Should have multiple lines

      // Only the first line should be active
      expect(isLineNumberActive(lineNumbers[0] as HTMLElement)).toBe(true);
      expect(isLineNumberActive(lineNumbers[1] as HTMLElement)).toBe(false);

      // Move cursor to middle of paragraph (which should be on a different visual line)
      setCursorPosition(firstBlock as HTMLElement, 80);
      document.dispatchEvent(selectionEvent);

      await waitForDOMUpdate();

      // Now a different line should be active
      expect(isLineNumberActive(lineNumbers[0] as HTMLElement)).toBe(false);
      // The line containing position 80 should be active
      // (exact line depends on wrapping, but it shouldn't be the first)
    });

    it('should update active line when navigating with arrow keys', async () => {
      const content = createMockContentBlocks([
        'First line of text',
        'Second line of text',
        'Third line of text'
      ]);

      const { container: editorContainer } = renderWithProviders(
        <Editor
          content={content}
          onChange={vi.fn()}
          onSelectionChange={vi.fn()}
        />
      );

      await waitForDOMUpdate();

      const editor = editorContainer.querySelector('[contenteditable="true"]');
      const firstBlock = editor!.querySelector('[data-block-id]');
      
      // Start at first line
      setCursorPosition(firstBlock as HTMLElement, 0);
      editor!.focus();

      // Press down arrow
      fireEvent.keyDown(editor!, { key: 'ArrowDown' });
      await waitForDOMUpdate();

      const lineNumbers = editorContainer.querySelectorAll('.line-number');
      
      // Second line should now be active
      expect(isLineNumberActive(lineNumbers[0] as HTMLElement)).toBe(false);
      expect(isLineNumberActive(lineNumbers[1] as HTMLElement)).toBe(true);
    });
  });

  describe('Bug 2: Selection Navigation (Alt/Cmd+Shift)', () => {
    it('should select from cursor to document start with Cmd+Shift+Up', async () => {
      const content = createMockContentBlocks([
        'First paragraph',
        'Second paragraph',
        'Third paragraph'
      ]);

      const { container: editorContainer } = renderWithProviders(
        <Editor
          content={content}
          onChange={vi.fn()}
          onSelectionChange={vi.fn()}
        />
      );

      await waitForDOMUpdate();

      const editor = editorContainer.querySelector('[contenteditable="true"]');
      const blocks = editor!.querySelectorAll('[data-block-id]');
      
      // Set cursor in middle of second paragraph
      setCursorPosition(blocks[1] as HTMLElement, 8);

      // Simulate Cmd+Shift+Up
      simulateKeyboardShortcut(editor as HTMLElement, 'ArrowUp', {
        metaKey: true,
        shiftKey: true
      });

      await waitForDOMUpdate();

      // Check selection
      const selection = window.getSelection();
      expect(selection?.isCollapsed).toBe(false);
      
      // Selection should span from start of document to cursor position
      const selectedText = selection?.toString();
      expect(selectedText).toContain('First paragraph');
      expect(selectedText).toContain('Second p'); // Partial second paragraph
    });

    it('should select from cursor to document end with Cmd+Shift+Down', async () => {
      const content = createMockContentBlocks([
        'First paragraph',
        'Second paragraph',
        'Third paragraph'
      ]);

      const { container: editorContainer } = renderWithProviders(
        <Editor
          content={content}
          onChange={vi.fn()}
          onSelectionChange={vi.fn()}
        />
      );

      await waitForDOMUpdate();

      const editor = editorContainer.querySelector('[contenteditable="true"]');
      const blocks = editor!.querySelectorAll('[data-block-id]');
      
      // Set cursor in middle of second paragraph
      setCursorPosition(blocks[1] as HTMLElement, 8);

      // Simulate Cmd+Shift+Down
      simulateKeyboardShortcut(editor as HTMLElement, 'ArrowDown', {
        metaKey: true,
        shiftKey: true
      });

      await waitForDOMUpdate();

      // Check selection
      const selection = window.getSelection();
      expect(selection?.isCollapsed).toBe(false);
      
      // Selection should span from cursor to end of document
      const selectedText = selection?.toString();
      expect(selectedText).toContain('paragraph'); // End of second
      expect(selectedText).toContain('Third paragraph');
    });

    it('should select paragraph with Alt+Shift+Up/Down', async () => {
      const content = createMockContentBlocks([
        'First paragraph',
        'Second paragraph is longer',
        'Third paragraph'
      ]);

      const { container: editorContainer } = renderWithProviders(
        <Editor
          content={content}
          onChange={vi.fn()}
          onSelectionChange={vi.fn()}
        />
      );

      await waitForDOMUpdate();

      const editor = editorContainer.querySelector('[contenteditable="true"]');
      const blocks = editor!.querySelectorAll('[data-block-id]');
      
      // Set cursor in second paragraph
      setCursorPosition(blocks[1] as HTMLElement, 10);

      // Simulate Alt+Shift+Down
      simulateKeyboardShortcut(editor as HTMLElement, 'ArrowDown', {
        altKey: true,
        shiftKey: true
      });

      await waitForDOMUpdate();

      // Should select from cursor through end of third paragraph
      const selection = window.getSelection();
      const selectedText = selection?.toString();
      expect(selectedText).toContain('is longer'); // Rest of second
      expect(selectedText).toContain('Third paragraph');
    });

    it('should select words with Alt+Shift+Left/Right', async () => {
      const content = createMockContentBlocks([
        'The quick brown fox jumps'
      ]);

      const { container: editorContainer } = renderWithProviders(
        <Editor
          content={content}
          onChange={vi.fn()}
          onSelectionChange={vi.fn()}
        />
      );

      await waitForDOMUpdate();

      const editor = editorContainer.querySelector('[contenteditable="true"]');
      const block = editor!.querySelector('[data-block-id]');
      
      // Set cursor after "quick"
      setCursorPosition(block as HTMLElement, 9);

      // Simulate Alt+Shift+Right
      simulateKeyboardShortcut(editor as HTMLElement, 'ArrowRight', {
        altKey: true,
        shiftKey: true
      });

      await waitForDOMUpdate();

      // Should select "brown"
      const selection = window.getSelection();
      expect(selection?.toString().trim()).toBe('brown');
    });
  });

  describe('Bug 3: Line Spacing Alignment', () => {
    it('should maintain line number alignment when pressing Enter', async () => {
      const content = createMockContentBlocks([
        'First line',
        'Second line'
      ]);

      const onChange = vi.fn();
      const { container: editorContainer } = renderWithProviders(
        <Editor
          content={content}
          onChange={onChange}
          onSelectionChange={vi.fn()}
        />
      );

      await waitForDOMUpdate();

      const editor = editorContainer.querySelector('[contenteditable="true"]');
      const firstBlock = editor!.querySelector('[data-block-id]');
      
      // Set cursor at end of first line
      setCursorPosition(firstBlock as HTMLElement, 10);

      // Press Enter
      fireEvent.keyDown(editor!, { key: 'Enter' });
      await waitForDOMUpdate();

      // Check that new block was created
      expect(onChange).toHaveBeenCalled();
      const newContent = onChange.mock.calls[0][0];
      expect(newContent).toHaveLength(3); // Now 3 blocks

      // Re-render with new content
      const { container: newContainer } = renderWithProviders(
        <Editor
          content={newContent}
          onChange={vi.fn()}
          onSelectionChange={vi.fn()}
        />
      );

      await waitForDOMUpdate();
      
      // Wait for line numbers to be created
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Check line numbers
      const lineNumbers = newContainer.querySelectorAll('.line-number');
      const contentBlocks = newContainer.querySelectorAll('[data-block-id]');
      
      expect(lineNumbers).toHaveLength(contentBlocks.length);
      
      // Check alignment - each line number should align with its content block
      lineNumbers.forEach((lineNum, index) => {
        const lineNumRect = (lineNum as HTMLElement).getBoundingClientRect();
        const blockRect = (contentBlocks[index] as HTMLElement).getBoundingClientRect();
        
        // Top positions should be very close (within a few pixels)
        expect(Math.abs(lineNumRect.top - blockRect.top)).toBeLessThan(5);
      });
    });

    it('should maintain alignment with mixed block types (headings)', async () => {
      const content = [
        {
          id: 'block-1',
          type: 'heading1' as const,
          content: 'Large Heading',
          formatting: []
        },
        {
          id: 'block-2',
          type: 'paragraph' as const,
          content: 'Regular paragraph',
          formatting: []
        }
      ];

      const { container: editorContainer } = renderWithProviders(
        <Editor
          content={content}
          onChange={vi.fn()}
          onSelectionChange={vi.fn()}
        />
      );

      await waitForDOMUpdate();

      const lineNumbers = editorContainer.querySelectorAll('.line-number');
      const contentBlocks = editorContainer.querySelectorAll('[data-block-id]');
      
      // Despite different heights, line numbers should align with their blocks
      lineNumbers.forEach((lineNum, index) => {
        const lineNumRect = (lineNum as HTMLElement).getBoundingClientRect();
        const blockRect = (contentBlocks[index] as HTMLElement).getBoundingClientRect();
        
        // Top alignment should be maintained
        expect(Math.abs(lineNumRect.top - blockRect.top)).toBeLessThan(5);
      });
    });
  });

  describe('Bug 4: Multi-line Mouse Selection', () => {
    it('should allow selection across multiple paragraphs with mouse', async () => {
      const content = createMockContentBlocks([
        'First paragraph with some text',
        'Second paragraph with more text',
        'Third paragraph with even more text'
      ]);

      const { container: editorContainer } = renderWithProviders(
        <Editor
          content={content}
          onChange={vi.fn()}
          onSelectionChange={vi.fn()}
        />
      );

      await waitForDOMUpdate();

      const editor = editorContainer.querySelector('[contenteditable="true"]');
      const blocks = editor!.querySelectorAll('[data-block-id]');
      
      // Create selection from middle of first to middle of third paragraph
      const firstBlock = blocks[0] as HTMLElement;
      const thirdBlock = blocks[2] as HTMLElement;
      
      setSelection(editor as HTMLElement, 15, 50); // Approximate positions
      
      await waitForDOMUpdate();

      const selection = window.getSelection();
      expect(selection?.isCollapsed).toBe(false);
      
      // Selection should include parts of all three paragraphs
      const selectedText = selection?.toString();
      expect(selectedText).toContain('with some text'); // End of first
      expect(selectedText).toContain('Second paragraph'); // All of second
      expect(selectedText).toContain('Third paragraph'); // Start of third
    });

    it('should support multi-selection with Cmd/Ctrl+click', async () => {
      const content = createMockContentBlocks([
        'First paragraph',
        'Second paragraph',
        'Third paragraph'
      ]);

      const { container: editorContainer } = renderWithProviders(
        <Editor
          content={content}
          onChange={vi.fn()}
          onSelectionChange={vi.fn()}
        />
      );

      await waitForDOMUpdate();

      const editor = editorContainer.querySelector('[contenteditable="true"]');
      const blocks = editor!.querySelectorAll('[data-block-id]');
      
      // First selection
      setSelection(blocks[0] as HTMLElement, 0, 5); // "First"
      
      // Cmd+click for second selection
      const secondBlock = blocks[2] as HTMLElement;
      fireEvent.mouseDown(secondBlock, {
        metaKey: true,
        clientX: 100,
        clientY: 100
      });
      
      await waitForDOMUpdate();

      // Check that multiple selections exist (this depends on implementation)
      // The new editor should handle this properly
    });
  });

  describe('Bug 5: Highlight Color Functionality', () => {
    it('should apply highlight with correct color mapping', async () => {
      const content = createMockContentBlocks(['Test text for highlighting']);
      const onChange = vi.fn();

      const { container: editorContainer } = renderWithProviders(
        <Editor
          content={content}
          onChange={onChange}
          onSelectionChange={vi.fn()}
          setApplyFormatRef={(fn) => {
            // Simulate toolbar calling format function
            setTimeout(() => {
              fn('highlight', 'yellow');
            }, 100);
          }}
        />
      );

      await waitForDOMUpdate();

      const editor = editorContainer.querySelector('[contenteditable="true"]');
      const block = editor!.querySelector('[data-block-id]');
      
      // Select "Test text"
      setSelection(block as HTMLElement, 0, 9);

      // Wait for format to be applied
      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
      });

      // Check that formatting was applied
      const updatedContent = onChange.mock.calls[0][0];
      expect(updatedContent[0].formatting).toHaveLength(1);
      expect(updatedContent[0].formatting[0]).toMatchObject({
        type: 'highlight',
        start: 0,
        end: 9,
        color: 'yellow'
      });
    });

    it('should remove highlight when clicking on already highlighted text', async () => {
      const content = createMockContentBlocks(['Test text for highlighting']);
      content[0].formatting = [{
        type: 'highlight',
        start: 0,
        end: 9,
        color: 'yellow'
      }];

      const onChange = vi.fn();
      let applyFormatFn: ((type: string, value?: string) => void) | undefined;

      const { container: editorContainer } = renderWithProviders(
        <Editor
          content={content}
          onChange={onChange}
          onSelectionChange={vi.fn()}
          setApplyFormatRef={(fn) => {
            applyFormatFn = fn;
          }}
        />
      );

      await waitForDOMUpdate();

      const editor = editorContainer.querySelector('[contenteditable="true"]');
      const block = editor!.querySelector('[data-block-id]');
      
      // Select the highlighted text
      setSelection(block as HTMLElement, 0, 9);
      
      // Apply highlight again (should remove it)
      applyFormatFn('highlight', 'yellow');

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
      });

      // Check that formatting was removed
      const updatedContent = onChange.mock.calls[0][0];
      expect(updatedContent[0].formatting).toHaveLength(0);
    });

    it('should cycle through highlight colors', async () => {
      const content = createMockContentBlocks(['Text to highlight']);
      content[0].formatting = [{
        type: 'highlight',
        start: 0,
        end: 4,
        color: 'yellow'
      }];

      const onChange = vi.fn();
      let applyFormatFn: ((type: string, value?: string) => void) | undefined;

      const { container: editorContainer } = renderWithProviders(
        <Editor
          content={content}
          onChange={onChange}
          onSelectionChange={vi.fn()}
          setApplyFormatRef={(fn) => {
            applyFormatFn = fn;
          }}
        />
      );

      await waitForDOMUpdate();

      const editor = editorContainer.querySelector('[contenteditable="true"]');
      const block = editor!.querySelector('[data-block-id]');
      
      // Select the highlighted text
      setSelection(block as HTMLElement, 0, 4);
      
      // Apply highlight with different color (should change color)
      applyFormatFn('highlight', 'blue');

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
      });

      // Check that color changed
      const updatedContent = onChange.mock.calls[0][0];
      expect(updatedContent[0].formatting[0]).toMatchObject({
        type: 'highlight',
        color: 'blue'
      });
    });

    it('should handle hex color to name conversion', async () => {
      const content = createMockContentBlocks(['Text']);
      const onChange = vi.fn();
      let applyFormatFn: ((type: string, value?: string) => void) | undefined;

      const { container: editorContainer } = renderWithProviders(
        <Editor
          content={content}
          onChange={onChange}
          onSelectionChange={vi.fn()}
          setApplyFormatRef={(fn) => {
            applyFormatFn = fn;
          }}
        />
      );

      await waitForDOMUpdate();

      const editor = editorContainer.querySelector('[contenteditable="true"]');
      const block = editor!.querySelector('[data-block-id]');
      
      // Select text
      setSelection(block as HTMLElement, 0, 4);
      
      // Apply highlight with hex color (as toolbar would send)
      applyFormatFn('highlight', '#fef08a'); // Yellow hex

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
      });

      // Should be converted to color name
      const updatedContent = onChange.mock.calls[0][0];
      expect(updatedContent[0].formatting[0]).toMatchObject({
        type: 'highlight',
        color: 'yellow' // Converted from hex
      });
    });
  });
});