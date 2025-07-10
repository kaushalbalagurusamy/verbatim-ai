/**
 * Simple test to verify DocumentModel basic functionality
 */

import { describe, it, expect } from 'vitest';
import { DocumentModel } from '../document-model';

describe('DocumentModel Simple Tests', () => {
  it('should create an empty document', () => {
    const doc = new DocumentModel();
    expect(doc.getLength()).toBe(0);
    expect(doc.getBlocks().length).toBe(0);
  });

  it('should insert text', () => {
    const doc = new DocumentModel();
    doc.insertText(0, 'Hello World');
    expect(doc.getLength()).toBe(11);
    expect(doc.getText()).toBe('Hello World');
  });

  it('should handle formatting', () => {
    const doc = new DocumentModel();
    doc.insertText(0, 'Hello World');
    doc.applyFormatting({ type: 'bold', start: 0, end: 5 });
    
    const formats = doc.getFormattingInRange(0, 11);
    expect(formats.length).toBe(1);
    expect(formats[0].type).toBe('bold');
    expect(formats[0].start).toBe(0);
    expect(formats[0].end).toBe(5);
  });
});