/**
 * Regression test for renderContent temporal dead zone (TDZ) issue
 * Ensures that SingleContentEditableEditor doesn't throw ReferenceError on mount
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SingleContentEditableEditor } from '@/editor-v2/components/SingleContentEditableEditor';

describe('SingleContentEditableEditor TDZ Regression', () => {
  it('should mount without throwing ReferenceError', () => {
    // This test will fail if there's a TDZ issue with renderContent
    expect(() => {
      render(<SingleContentEditableEditor />);
    }).not.toThrow();
  });

  it('should render editor content area', () => {
    render(<SingleContentEditableEditor placeholder="Start typing..." />);
    
    // Check that the editor rendered
    const editor = screen.getByRole('textbox');
    expect(editor).toBeDefined();
    expect(editor).toHaveAttribute('aria-multiline', 'true');
    expect(editor).toHaveAttribute('aria-placeholder', 'Start typing...');
  });

  it('should handle imperative handle methods without errors', () => {
    const ref = React.createRef<any>();
    render(<SingleContentEditableEditor ref={ref} />);
    
    // Test that imperative methods are available and don't throw
    expect(ref.current).toBeDefined();
    expect(ref.current.getDocument).toBeDefined();
    expect(ref.current.renderContent).toBeDefined();
    expect(ref.current.applyFormatting).toBeDefined();
    
    // Call renderContent to ensure it doesn't throw
    expect(() => {
      ref.current.renderContent();
    }).not.toThrow();
  });

  it('should initialize with content', () => {
    const initialContent = 'Hello, World!';
    render(<SingleContentEditableEditor initialContent={initialContent} />);
    
    const editor = screen.getByRole('textbox');
    expect(editor.textContent).toContain(initialContent);
  });
});