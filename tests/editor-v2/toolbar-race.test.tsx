/**
 * Regression test for toolbar service race condition
 * Ensures that EditorV2Adapter properly initializes toolbar service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { EditorV2Adapter } from '@/editor-v2/integration/EditorV2Adapter';
import type { ContentBlock } from '@/types/document.types';

describe('EditorV2Adapter Race Condition Tests', () => {
  const mockContent: ContentBlock[] = [
    {
      id: 'block-1',
      type: 'paragraph',
      content: 'Test content',
      formatting: []
    }
  ];

  const mockOnChange = vi.fn();
  const mockSetApplyFormatRef = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize toolbar service after editor is ready', async () => {
    const ref = React.createRef<any>();
    
    render(
      <EditorV2Adapter
        ref={ref}
        content={mockContent}
        onChange={mockOnChange}
        setApplyFormatRef={mockSetApplyFormatRef}
      />
    );

    // Wait for component to mount and initialize
    await waitFor(() => {
      expect(ref.current).toBeDefined();
      expect(ref.current.applyFormat).toBeDefined();
    });

    // The applyFormat function should be registered
    expect(mockSetApplyFormatRef).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should handle early format calls gracefully', async () => {
    const ref = React.createRef<any>();
    
    render(
      <EditorV2Adapter
        ref={ref}
        content={mockContent}
        onChange={mockOnChange}
      />
    );

    // Try to apply format immediately (before toolbar service is ready)
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // This should not throw, just warn
    expect(() => {
      ref.current?.applyFormat('bold');
    }).not.toThrow();

    // Should have warned about no selection
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cannot apply formatting')
    );

    consoleWarnSpy.mockRestore();
  });

  it('should properly handle selection changes', async () => {
    const mockOnSelectionChange = vi.fn();
    
    render(
      <EditorV2Adapter
        content={mockContent}
        onChange={mockOnChange}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    // Find the editor element
    const editor = screen.getByRole('textbox');
    expect(editor).toBeDefined();

    // Simulate a selection change
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Trigger selection change event
      document.dispatchEvent(new Event('selectionchange'));
      
      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalled();
      });
    }
  });

  it('should convert content blocks to text correctly', () => {
    const multiBlockContent: ContentBlock[] = [
      { id: '1', type: 'paragraph', content: 'Line 1', formatting: [] },
      { id: '2', type: 'paragraph', content: 'Line 2', formatting: [] },
      { id: '3', type: 'paragraph', content: 'Line 3', formatting: [] }
    ];

    render(
      <EditorV2Adapter
        content={multiBlockContent}
        onChange={mockOnChange}
      />
    );

    const editor = screen.getByRole('textbox');
    expect(editor.textContent).toContain('Line 1');
    expect(editor.textContent).toContain('Line 2');
    expect(editor.textContent).toContain('Line 3');
  });
});