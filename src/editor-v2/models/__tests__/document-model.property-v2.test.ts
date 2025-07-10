/**
 * Property-based fuzz testing suite for DocumentModel using fast-check.
 * Tests critical invariants and edge cases with random operations.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DocumentModel } from '../document-model';
import type { TextFormatting } from '../data-structures/interval-tree';

type FormatType = TextFormatting['type'];

// Custom arbitraries for generating test data
const textContentArb = fc.oneof(
  fc.string({ maxLength: 50 }), // Basic ASCII strings
  fc.constantFrom('', ' ', '\n', '\t'), // Edge cases
  fc.array(fc.constantFrom('👍', '😀', '🚀', '❤️', '🔥'), { maxLength: 10 }).map(arr => arr.join('')), // Emojis
  fc.array(fc.constantFrom('中', '文', '测', '试'), { maxLength: 10 }).map(arr => arr.join('')), // Chinese
);

const formatTypeArb = fc.constantFrom<FormatType>('bold', 'highlight', 'minimize');

// Operation types for fuzzing
type Operation = 
  | { type: 'insert'; offset: number; text: string }
  | { type: 'delete'; start: number; end: number }
  | { type: 'format'; formatType: FormatType; start: number; end: number }
  | { type: 'createBlock'; offset: number };

// Generate valid operations based on document state
const operationArb = (doc: DocumentModel): fc.Arbitrary<Operation> => {
  const totalLength = doc.getLength();
  
  if (totalLength === 0) {
    // Only insert operations are valid on empty document
    return fc.record({
      type: fc.constant('insert' as const),
      offset: fc.constant(0),
      text: textContentArb.filter(t => t.length > 0),
    });
  }
  
  return fc.oneof(
    // Insert operation
    fc.record({
      type: fc.constant('insert' as const),
      offset: fc.integer({ min: 0, max: totalLength }),
      text: textContentArb,
    }),
    
    // Delete operation
    fc.integer({ min: 0, max: Math.max(0, totalLength - 1) }).chain(start =>
      fc.record({
        type: fc.constant('delete' as const),
        start: fc.constant(start),
        end: fc.integer({ min: start + 1, max: totalLength }),
      })
    ),
    
    // Format operation
    fc.integer({ min: 0, max: Math.max(0, totalLength - 1) }).chain(start =>
      fc.record({
        type: fc.constant('format' as const),
        formatType: formatTypeArb,
        start: fc.constant(start),
        end: fc.integer({ min: start + 1, max: totalLength }),
      })
    ),
    
    // Create block (only at valid positions)
    totalLength > 1
      ? fc.record({
          type: fc.constant('createBlock' as const),
          offset: fc.integer({ min: 1, max: totalLength - 1 }),
        })
      : fc.constant({ type: 'insert' as const, offset: 0, text: 'a' }),
  );
};

// Apply an operation to the document
function applyOperation(doc: DocumentModel, op: Operation): void {
  try {
    switch (op.type) {
      case 'insert':
        doc.insertText(op.offset, op.text);
        break;
      case 'delete':
        doc.deleteText(op.start, op.end);
        break;
      case 'format':
        doc.applyFormatting({ type: op.formatType, start: op.start, end: op.end });
        break;
      case 'createBlock':
        doc.createBlock(op.offset);
        break;
    }
  } catch (e) {
    // Some operations may fail due to invalid state, that's ok
    // The important thing is that the document remains in a valid state
  }
}

// Verify document invariants
function verifyInvariants(doc: DocumentModel): void {
  const totalLength = doc.getLength();
  const blocks = doc.getBlocks();
  
  // Invariant 1: totalLength === sum of all block lengths
  const sumOfBlockLengths = blocks.reduce((sum, block) => sum + block.length, 0);
  expect(sumOfBlockLengths).toBe(totalLength);
  
  // Invariant 2: Block offsets are strictly increasing and correct
  let expectedOffset = 0;
  for (const block of blocks) {
    expect(block.offset).toBe(expectedOffset);
    expectedOffset += block.length;
  }
  
  // Invariant 3: All formatting spans have valid bounds
  // Note: The formatting system may merge overlapping spans of the same type
  const allFormatting = totalLength > 0 ? doc.getFormattingInRange(0, totalLength) : [];
  for (const format of allFormatting) {
    expect(format.start).toBeGreaterThanOrEqual(0);
    expect(format.end).toBeLessThanOrEqual(totalLength);
    expect(format.start).toBeLessThan(format.end);
  }
  
  // Invariant 5: UTF-16 code unit consistency
  if (totalLength > 0) {
    const fullText = doc.getText(0, totalLength);
    expect(fullText.length).toBe(totalLength);
  }
}

describe('DocumentModel Property Tests V2', () => {
  it('maintains invariants through random operation sequences', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }),
        (numOperations) => {
          const doc = new DocumentModel();
          
          // Track performance
          const startTime = performance.now();
          
          for (let i = 0; i < numOperations; i++) {
            // Generate operation based on current document state
            const op = fc.sample(operationArb(doc), 1)[0];
            
            // Apply operation
            applyOperation(doc, op);
            
            // Verify invariants after each operation
            verifyInvariants(doc);
          }
          
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          // Performance requirement: 1000 ops in < 200ms
          if (numOperations >= 1000) {
            expect(duration).toBeLessThan(200);
          }
          
          return true;
        }
      ),
      { numRuns: 20, verbose: true }
    );
  });
  
  it('handles edge case: empty document operations', () => {
    const doc = new DocumentModel();
    verifyInvariants(doc);
    
    // These should not crash or corrupt state
    expect(() => doc.deleteText(0, 1)).toThrow();
    // Formatting on empty document should not create invalid spans
    doc.applyFormatting({ type: 'bold', start: 0, end: 1 });
    const formats = doc.getFormattingInRange(0, 0);
    expect(formats.length).toBe(0); // No formatting should exist
    expect(() => doc.createBlock(0)).toThrow();
    
    verifyInvariants(doc);
  });
  
  it('handles complex Unicode correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom(
            '👍', '😀', '🚀', // Basic emojis
            '🏳️‍🌈', '👨‍👩‍👧‍👦', // Complex emojis
            '中文', 'العربية', 'हिन्दी', // Various scripts
          ),
          { minLength: 1, maxLength: 20 }
        ),
        (strings) => {
          const doc = new DocumentModel();
          
          // Insert all strings
          let offset = 0;
          for (const str of strings) {
            doc.insertText(offset, str);
            offset = doc.getLength(); // Use actual length in case of multi-unit chars
          }
          
          verifyInvariants(doc);
          
          // Apply random formats
          const totalLength = doc.getLength();
          if (totalLength > 0) {
            const formatLength = Math.min(5, totalLength);
            doc.applyFormatting({ type: 'highlight', start: 0, end: formatLength });
            verifyInvariants(doc);
          }
          
          return true;
        }
      )
    );
  });
  
  it('maintains performance with large documents', () => {
    const doc = new DocumentModel();
    const largeText = 'a'.repeat(10000);
    
    const startTime = performance.now();
    
    // Insert large text
    doc.insertText(0, largeText);
    
    // Apply many formats
    for (let i = 0; i < 100; i++) {
      const start = i * 100;
      const end = Math.min(start + 50, 10000);
      doc.applyFormatting({ type: 'bold', start, end });
    }
    
    // Create multiple blocks
    for (let i = 9; i >= 1; i--) {
      doc.createBlock(i * 1000);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    verifyInvariants(doc);
    expect(duration).toBeLessThan(100); // Should be very fast
    expect(doc.getLength()).toBe(10000);
    expect(doc.getBlocks().length).toBe(10);
  });
  
  it('handles rapid block operations', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 5, maxLength: 20 }),
        (texts) => {
          const doc = new DocumentModel();
          
          // Insert all text as one block
          const fullText = texts.join(' ');
          doc.insertText(0, fullText);
          
          // Create blocks at word boundaries
          let offset = 0;
          for (let i = 0; i < texts.length - 1; i++) {
            offset += texts[i].length;
            if (offset < doc.getLength()) {
              doc.createBlock(offset);
              offset += 1; // Space character
            }
          }
          
          verifyInvariants(doc);
          
          // Now merge some blocks
          const blocks = doc.getBlocks();
          if (blocks.length > 1) {
            // Merge first two blocks using their IDs
            const firstBlock = blocks[0];
            const secondBlock = blocks[1];
            doc.mergeBlocks(firstBlock.id, secondBlock.id);
            verifyInvariants(doc);
          }
          
          return true;
        }
      )
    );
  });
});