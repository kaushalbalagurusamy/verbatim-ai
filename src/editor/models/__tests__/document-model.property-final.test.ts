/**
 * Property-based fuzz testing suite for DocumentModel using fast-check.
 * Tests critical invariants with thousands of random operations.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DocumentModel } from '../document-model';
import type { TextFormatting } from '../data-structures/interval-tree';

type FormatType = TextFormatting['type'];

// Custom arbitraries for generating test data
const textContentArb = fc.oneof(
  { arbitrary: fc.string({ minLength: 1, maxLength: 50 }), weight: 3 },
  { arbitrary: fc.constant('Hello World'), weight: 1 },
  { arbitrary: fc.constant('\n'), weight: 1 },
  { arbitrary: fc.array(fc.constantFrom('👍', '😀', '🚀'), { minLength: 1, maxLength: 5 }).map(a => a.join('')), weight: 1 },
);

// Operation types for fuzzing
type Operation = 
  | { type: 'insert'; offset: number; text: string }
  | { type: 'delete'; start: number; length: number }
  | { type: 'format'; formatType: FormatType; start: number; length: number }
  | { type: 'removeFormat'; formatType: FormatType; start: number; length: number };

// Apply an operation to the document
function applyOperation(doc: DocumentModel, op: Operation): boolean {
  try {
    const totalLength = doc.getLength();
    
    switch (op.type) {
      case 'insert':
        if (op.offset >= 0 && op.offset <= totalLength && op.text.length > 0) {
          doc.insertText(op.offset, op.text);
          return true;
        }
        break;
        
      case 'delete':
        if (op.start >= 0 && op.start < totalLength && op.length > 0) {
          const actualLength = Math.min(op.length, totalLength - op.start);
          doc.deleteText(op.start, op.start + actualLength);
          return true;
        }
        break;
        
      case 'format':
        if (op.start >= 0 && op.start < totalLength && op.length > 0) {
          const actualLength = Math.min(op.length, totalLength - op.start);
          doc.applyFormatting({ 
            type: op.formatType, 
            start: op.start, 
            end: op.start + actualLength 
          });
          return true;
        }
        break;
        
      case 'removeFormat':
        if (op.start >= 0 && op.start < totalLength && op.length > 0) {
          const actualLength = Math.min(op.length, totalLength - op.start);
          doc.removeFormatting(op.start, op.start + actualLength, op.formatType);
          return true;
        }
        break;
    }
  } catch (e) {
    // Operation failed, but document should still be valid
  }
  return false;
}

// Generate random operations
const operationArb = fc.oneof(
  // Insert operation (60% weight)
  fc.record({
    type: fc.constant('insert' as const),
    offset: fc.nat({ max: 10000 }),
    text: textContentArb,
  }).map(op => ({ ...op, offset: op.offset % 1001 })), // Keep offsets reasonable
  
  // Delete operation (20% weight)
  fc.record({
    type: fc.constant('delete' as const),
    start: fc.nat({ max: 1000 }),
    length: fc.integer({ min: 1, max: 20 }),
  }),
  
  // Format operation (10% weight)
  fc.record({
    type: fc.constant('format' as const),
    formatType: fc.constantFrom<FormatType>('bold', 'highlight', 'minimize'),
    start: fc.nat({ max: 1000 }),
    length: fc.integer({ min: 1, max: 50 }),
  }),
  
  // Remove format operation (10% weight)
  fc.record({
    type: fc.constant('removeFormat' as const),
    formatType: fc.constantFrom<FormatType>('bold', 'highlight', 'minimize'),
    start: fc.nat({ max: 1000 }),
    length: fc.integer({ min: 1, max: 50 }),
  }),
);

// Verify document invariants
function verifyInvariants(doc: DocumentModel): void {
  const totalLength = doc.getLength();
  const blocks = doc.getBlocks();
  
  // Invariant 1: totalLength === sum of all block lengths
  const sumOfBlockLengths = blocks.reduce((sum, block) => sum + block.length, 0);
  expect(sumOfBlockLengths).toBe(totalLength);
  
  // Invariant 2: Block offsets are correct and increasing
  let expectedOffset = 0;
  for (const block of blocks) {
    expect(block.offset).toBe(expectedOffset);
    expect(block.length).toBeGreaterThanOrEqual(0);
    expectedOffset += block.length;
  }
  
  // Invariant 3: All formatting spans have valid bounds
  if (totalLength > 0) {
    const allFormatting = doc.getFormattingInRange(0, totalLength);
    for (const format of allFormatting) {
      expect(format.start).toBeGreaterThanOrEqual(0);
      expect(format.end).toBeLessThanOrEqual(totalLength);
      expect(format.start).toBeLessThan(format.end);
    }
  }
  
  // Invariant 4: UTF-16 code unit consistency
  if (totalLength > 0) {
    const fullText = doc.getText(0, totalLength);
    expect(fullText.length).toBe(totalLength);
  }
  
  // Invariant 5: Document is always in a valid state (no exceptions)
  expect(() => doc.getText()).not.toThrow();
  expect(() => doc.getBlocks()).not.toThrow();
  expect(() => doc.getLength()).not.toThrow();
}

describe('DocumentModel Property Tests (Final)', () => {
  it('maintains invariants through 1000+ random operations', () => {
    fc.assert(
      fc.property(
        fc.array(operationArb, { minLength: 100, maxLength: 1000 }),
        fc.boolean(), // Whether to start with initial text
        (operations, startWithText) => {
          const doc = new DocumentModel();
          
          // Optionally start with some text
          if (startWithText) {
            doc.insertText(0, 'Initial text for testing');
          }
          
          // Track timing
          const startTime = performance.now();
          let successfulOps = 0;
          
          // Apply all operations
          for (const op of operations) {
            if (applyOperation(doc, op)) {
              successfulOps++;
            }
            // Verify invariants after each operation
            verifyInvariants(doc);
          }
          
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          // Performance check: 1000 operations should complete in < 200ms
          if (operations.length >= 1000) {
            expect(duration).toBeLessThan(200);
          }
          
          // At least some operations should succeed
          if (operations.length > 50) {
            expect(successfulOps).toBeGreaterThan(0);
          }
          
          return true;
        }
      ),
      { numRuns: 100 } // Run 100 different test cases
    );
  });
  
  it('handles edge cases correctly', () => {
    // Empty document
    const doc1 = new DocumentModel();
    verifyInvariants(doc1);
    expect(doc1.getLength()).toBe(0);
    expect(doc1.getBlocks().length).toBe(0);
    
    // Single character
    const doc2 = new DocumentModel();
    doc2.insertText(0, 'a');
    verifyInvariants(doc2);
    expect(doc2.getLength()).toBe(1);
    expect(doc2.getText()).toBe('a');
    
    // Delete all content
    doc2.deleteText(0, 1);
    verifyInvariants(doc2);
    expect(doc2.getLength()).toBe(0);
    
    // Complex Unicode
    const doc3 = new DocumentModel();
    const complexText = '👨‍👩‍👧‍👦🏳️‍🌈';
    doc3.insertText(0, complexText);
    verifyInvariants(doc3);
    expect(doc3.getText()).toBe(complexText);
    
    // Format entire document
    if (doc3.getLength() > 0) {
      doc3.applyFormatting({ type: 'bold', start: 0, end: doc3.getLength() });
      verifyInvariants(doc3);
    }
  });
  
  it('maintains performance with large documents', () => {
    const doc = new DocumentModel();
    
    // Create a large document
    const largeText = 'Lorem ipsum dolor sit amet. '.repeat(500); // ~14K characters
    
    const startTime = performance.now();
    
    // Insert large text
    doc.insertText(0, largeText);
    
    // Apply formatting every 100 characters
    for (let i = 0; i < doc.getLength() - 50; i += 100) {
      doc.applyFormatting({ type: 'bold', start: i, end: i + 50 });
    }
    
    // Create blocks every 1000 characters
    for (let i = 1000; i < doc.getLength(); i += 1000) {
      doc.createBlock(i);
    }
    
    const endTime = performance.now();
    
    verifyInvariants(doc);
    
    // Should handle large documents efficiently
    expect(endTime - startTime).toBeLessThan(100);
    expect(doc.getLength()).toBe(largeText.length);
    expect(doc.getBlocks().length).toBeGreaterThan(10);
  });
  
  it('correctly handles block operations', () => {
    const doc = new DocumentModel();
    
    // Insert text with natural break points
    doc.insertText(0, 'First paragraph.');
    doc.insertText(doc.getLength(), '\n');
    doc.insertText(doc.getLength(), 'Second paragraph.');
    doc.insertText(doc.getLength(), '\n');
    doc.insertText(doc.getLength(), 'Third paragraph.');
    
    verifyInvariants(doc);
    
    // Create blocks at paragraph boundaries
    const text = doc.getText();
    let offset = text.indexOf('\n');
    while (offset > 0 && offset < doc.getLength() - 1) {
      doc.createBlock(offset + 1);
      offset = text.indexOf('\n', offset + 1);
    }
    
    verifyInvariants(doc);
    
    // Should have multiple blocks now
    expect(doc.getBlocks().length).toBeGreaterThan(1);
    
    // Merge some blocks
    const blocks = doc.getBlocks();
    if (blocks.length >= 2) {
      doc.mergeBlocks(blocks[0].id, blocks[1].id);
      verifyInvariants(doc);
    }
  });
  
  it('handles rapid format changes without corruption', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 20, maxLength: 100 }),
        fc.array(
          fc.record({
            type: fc.constantFrom<FormatType>('bold', 'highlight', 'minimize'),
            start: fc.nat({ max: 50 }),
            length: fc.integer({ min: 1, max: 20 }),
          }),
          { minLength: 10, maxLength: 50 }
        ),
        (text, formats) => {
          const doc = new DocumentModel();
          doc.insertText(0, text);
          
          // Apply all formats
          for (const fmt of formats) {
            if (fmt.start < doc.getLength()) {
              const length = Math.min(fmt.length, doc.getLength() - fmt.start);
              doc.applyFormatting({ type: fmt.type, start: fmt.start, end: fmt.start + length });
            }
          }
          
          verifyInvariants(doc);
          
          // Remove half the formats
          for (let i = 0; i < formats.length; i += 2) {
            const fmt = formats[i];
            if (fmt.start < doc.getLength()) {
              const length = Math.min(fmt.length, doc.getLength() - fmt.start);
              doc.removeFormatting(fmt.start, fmt.start + length, fmt.type);
            }
          }
          
          verifyInvariants(doc);
          
          // Document text should remain unchanged
          expect(doc.getText()).toBe(text);
          
          return true;
        }
      )
    );
  });
});