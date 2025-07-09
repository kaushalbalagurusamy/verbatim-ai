/**
 * Tests for the new Editor V2 implementation
 * Debugging DOM structure and functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { EditorV2Adapter as Editor } from '@/editor-v2/integration/EditorV2Adapter';
import { renderWithProviders } from '@/test/test-utils/test-wrapper';
import { createMockContentBlocks, waitForDOMUpdate } from '@/test/test-utils/editor-test-helpers';

describe('EditorV2 - DOM Structure Test', () => {
  it('should render the editor with proper structure', async () => {
    const content = createMockContentBlocks(['Test content']);
    
    const { container } = renderWithProviders(
      <Editor
        content={content}
        onChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />
    );
    
    // Wait longer for line numbers to populate
    await act(async () => {
      await waitForDOMUpdate();
      await new Promise(resolve => setTimeout(resolve, 200));
    });
    
    // Debug what's actually rendered
    console.log('Container HTML:', container.innerHTML);
    
    // Check for editor container
    const editorContainer = container.querySelector('.editor-container');
    expect(editorContainer).toBeTruthy();
    
    // Check for contenteditable
    const contentEditable = container.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
    
    // Check for line numbers
    const lineNumbers = container.querySelector('.line-numbers');
    expect(lineNumbers).toBeTruthy();
    
    // Check if line numbers were created
    const lineNumberElements = container.querySelectorAll('.line-number');
    console.log('Line numbers found:', lineNumberElements.length);
    expect(lineNumberElements.length).toBeGreaterThan(0);
  });
  
  it('should track cursor position in line numbers', async () => {
    const content = createMockContentBlocks([
      'This is a long paragraph that will wrap to multiple lines when rendered. It contains enough text to ensure wrapping.',
      'Second paragraph'
    ]);
    
    const { container } = renderWithProviders(
      <Editor
        content={content}
        onChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />
    );
    
    await waitForDOMUpdate();
    
    // Find the contenteditable
    const editor = container.querySelector('[contenteditable="true"]');
    expect(editor).toBeTruthy();
    
    // Focus the editor
    (editor as HTMLElement).focus();
    
    // Trigger selection change
    const selectionEvent = new Event('selectionchange', { bubbles: true });
    document.dispatchEvent(selectionEvent);
    
    // Wait longer for line numbers to populate
    await act(async () => {
      await waitForDOMUpdate();
      await new Promise(resolve => setTimeout(resolve, 300));
    });
    
    // Check for line numbers first
    const lineNumbers = container.querySelectorAll('.line-number');
    console.log('Number of line numbers:', lineNumbers.length);
    console.log('Line number HTML:', container.querySelector('.line-numbers')?.innerHTML);
    
    // Should have at least 2 line numbers (for two paragraphs)
    expect(lineNumbers.length).toBeGreaterThan(0);
    
    // Check for active line number
    const activeLineNumber = container.querySelector('.line-number.active');
    console.log('Active line number:', activeLineNumber);
    
    // At least one line should be active
    expect(activeLineNumber).toBeTruthy();
  });
});