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
  fc.string(), // Basic ASCII strings
  fc.string({ minLength: 0, maxLength: 50 }).map(s => 
    s.replace(/./g, () => String.fromCharCode(Math.floor(Math.random() * 0x10000)))
  ), // Random Unicode strings
  fc.constantFrom('', ' ', '\n', '\t'), // Edge cases
  fc.array(fc.constantFrom('👍', '😀', '🚀', '❤️', '🔥'), { maxLength: 10 }).map(arr => arr.join('')), // Emojis
  fc.array(fc.constantFrom('中', '文', '测', '试'), { maxLength: 10 }).map(arr => arr.join('')), // Chinese characters
  fc.array(fc.constantFrom('🏳️‍🌈', '👨‍👩‍👧‍👦', '🧑🏾‍🦽'), { maxLength: 5 }).map(arr => arr.join('')), // Complex emojis
);

const formatTypeArb = fc.constantFrom<FormatType>('bold', 'highlight', 'minimize');

// Operation types for fuzzing
type Operation = 
  | { type: 'insert'; offset: number; text: string }
  | { type: 'delete'; offset: number; length: number }
  | { type: 'format'; formatType: FormatType; offset: number; length: number }
  | { type: 'unformat'; formatType: FormatType; offset: number; length: number }
  | { type: 'createBlock'; offset: number }
  | { type: 'mergeBlocks'; offset: number };

// Generate valid operations based on document state
const operationArb = (doc: DocumentModel): fc.Arbitrary<Operation> => {
  const totalLength = doc.getLength();
  
  return fc.oneof(
    // Insert operation
    fc.record({
      type: fc.constant('insert' as const),
      offset: fc.integer({ min: 0, max: totalLength }),
      text: textContentArb,
    }),
    
    // Delete operation (only if document is not empty)
    totalLength > 0
      ? fc.record({
          type: fc.constant('delete' as const),
          offset: fc.integer({ min: 0, max: totalLength - 1 }),
          length: fc.integer({ min: 1, max: 10 }),
        }).map(op => ({
          ...op,
          length: Math.min(op.length, totalLength - op.offset),
        }))
      : fc.constant({ type: 'insert' as const, offset: 0, text: 'a' }),
    
    // Format operation (only if document is not empty)
    totalLength > 0
      ? fc.record({
          type: fc.constant('format' as const),
          formatType: formatTypeArb,
          offset: fc.integer({ min: 0, max: totalLength - 1 }),
          length: fc.integer({ min: 1, max: 20 }),
        }).map(op => ({
          ...op,
          length: Math.min(op.length, totalLength - op.offset),
        }))
      : fc.constant({ type: 'insert' as const, offset: 0, text: 'a' }),
    
    // Unformat operation
    totalLength > 0
      ? fc.record({
          type: fc.constant('unformat' as const),
          formatType: formatTypeArb,
          offset: fc.integer({ min: 0, max: totalLength - 1 }),
          length: fc.integer({ min: 1, max: 20 }),
        }).map(op => ({
          ...op,
          length: Math.min(op.length, totalLength - op.offset),
        }))
      : fc.constant({ type: 'insert' as const, offset: 0, text: 'a' }),
    
    // Create block (only at valid block boundaries)
    totalLength > 0
      ? fc.integer({ min: 1, max: totalLength - 1 }).map(offset => ({
          type: 'createBlock' as const,
          offset,
        }))
      : fc.constant({ type: 'insert' as const, offset: 0, text: 'a' }),
    
    // Merge blocks (only if there are multiple blocks)
    doc.getBlocks().length > 1
      ? fc.integer({ min: 0, max: doc.getBlocks().length - 2 }).map(blockIndex => {
          const blocks = doc.getBlocks();
          const block = blocks[blockIndex];
          return {
            type: 'mergeBlocks' as const,
            offset: block.offset + block.length,
          };
        })
      : fc.constant({ type: 'insert' as const, offset: 0, text: 'a' }),
  );
};

// Apply an operation to the document
function applyOperation(doc: DocumentModel, op: Operation): void {
  switch (op.type) {
    case 'insert':
      doc.insertText(op.offset, op.text);
      break;
    case 'delete':
      doc.deleteText(op.offset, op.offset + op.length);
      break;
    case 'format':
      doc.applyFormatting({ type: op.formatType, start: op.offset, end: op.offset + op.length });
      break;
    case 'unformat':
      doc.removeFormatting(op.offset, op.offset + op.length, op.formatType);
      break;
    case 'createBlock':
      doc.createNewBlock(op.offset);
      break;
    case 'mergeBlocks':
      doc.mergeBlocks(op.offset);
      break;
  }
}

// Verify document invariants
function verifyInvariants(doc: DocumentModel): void {
  const totalLength = doc.getLength();
  
  // Invariant 1: totalLength === sum of all block lengths
  const blocks = doc.getBlocks();
  const sumOfBlockLengths = blocks.reduce((sum, block) => sum + block.length, 0);
  expect(sumOfBlockLengths).toBe(totalLength);
  
  // Invariant 2: Block offsets are strictly increasing
  let expectedOffset = 0;
  for (const block of blocks) {
    expect(block.offset).toBe(expectedOffset);
    expectedOffset += block.length;
  }
  
  // Invariant 3: No overlapping formatting spans of same type
  // Get all formatting in document
  const allFormatting = doc.getFormattingInRange(0, totalLength);
  const formatsByType = new Map<FormatType, Array<{ start: number; end: number }>>();
  
  for (const format of allFormatting) {
    const spans = formatsByType.get(format.type) || [];
    
    // Check for overlaps with existing spans
    for (const span of spans) {
      const noOverlap = format.end <= span.start || format.start >= span.end;
      expect(noOverlap).toBe(true);
    }
    
    spans.push({ start: format.start, end: format.end });
    formatsByType.set(format.type, spans);
  }
  
  // Invariant 4: All offsets within valid bounds
  for (const block of blocks) {
    expect(block.offset).toBeGreaterThanOrEqual(0);
    expect(block.offset).toBeLessThan(totalLength); // offset should be less than total length
  }
  
  for (const format of allFormatting) {
    expect(format.start).toBeGreaterThanOrEqual(0);
    expect(format.end).toBeLessThanOrEqual(totalLength);
    expect(format.start).toBeLessThan(format.end);
  }
  
  // Invariant 5: UTF-16 code unit consistency
  const fullText = doc.getText(0, totalLength);
  expect(fullText.length).toBe(totalLength);
}

describe('DocumentModel Property Tests', () => {
  it('maintains invariants through random operation sequences', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }),
        fc.integer({ min: 0, max: 1000000 }), // seed for reproducibility
        (numOperations, seed) => {
          const rng = fc.Random.xorshift128plus(seed);
          const doc = new DocumentModel();
          
          // Initialize with some text to ensure we have at least one block
          doc.insertText(0, 'Initial text');
          
          // Track performance
          const startTime = performance.now();
          
          for (let i = 0; i < numOperations; i++) {
            // Generate operation based on current document state
            const op = operationArb(doc).generate(rng, undefined).value;
            
            // Apply operation
            applyOperation(doc, op);
            
            // Verify invariants after each operation
            verifyInvariants(doc);
          }
          
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          // Performance requirement: 1000 ops in < 200ms
          expect(duration).toBeLessThan(200);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('handles edge case: empty document', () => {
    const doc = new DocumentModel();
    verifyInvariants(doc);
    
    // Should handle operations on empty document
    expect(() => doc.deleteText(0, 1)).toThrow(); // Should throw on invalid range
    doc.applyFormatting({ type: 'bold', start: 0, end: 1 }); // Formatting on empty is no-op
    expect(() => doc.createNewBlock(0)).toThrow(); // Can't split empty document
  });
  
  it('handles edge case: single character document', () => {
    fc.assert(
      fc.property(textContentArb, (char) => {
        if (char.length === 0) return true; // Skip empty strings
        
        const doc = new DocumentModel();
        const singleChar = char[0];
        doc.insertText(0, singleChar);
        
        verifyInvariants(doc);
        expect(doc.getLength()).toBe(singleChar.length); // May be > 1 for some Unicode
        
        // Should handle all operations
        doc.applyFormatting({ type: 'bold', start: 0, end: singleChar.length });
        verifyInvariants(doc);
        
        doc.deleteText(0, singleChar.length);
        verifyInvariants(doc);
        expect(doc.getLength()).toBe(0);
        
        return true;
      })
    );
  });
  
  it('handles complex Unicode and emoji correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom(
            '👍', '😀', '🚀', '❤️', '🔥', // Basic emojis
            '🏳️‍🌈', '👨‍👩‍👧‍👦', '🧑🏾‍🦽', // Complex emojis
            '中文测试', // Chinese
            'العربية', // Arabic
            'हिन्दी', // Hindi
            '🇺🇸🇬🇧🇯🇵', // Flag emojis
          ),
          { minLength: 10, maxLength: 50 }
        ),
        (strings) => {
          const doc = new DocumentModel();
          
          // Insert all strings
          let offset = 0;
          for (const str of strings) {
            doc.insertText(offset, str);
            offset += str.length;
          }
          
          verifyInvariants(doc);
          
          // Apply random formats
          const totalLength = doc.getLength();
          if (totalLength > 0) {
            const formatOffset = Math.floor(Math.random() * totalLength);
            const formatLength = Math.min(10, totalLength - formatOffset);
            doc.applyFormatting({ type: 'highlight', start: formatOffset, end: formatOffset + formatLength });
            verifyInvariants(doc);
          }
          
          return true;
        }
      )
    );
  });
  
  it('handles rapid block creation and merging', () => {
    fc.assert(
      fc.property(
        fc.array(textContentArb, { minLength: 5, maxLength: 20 }),
        (texts) => {
          const doc = new DocumentModel();
          
          // Insert text
          let offset = 0;
          for (const text of texts) {
            doc.insertText(offset, text);
            offset += text.length;
          }
          
          // Create blocks at random positions
          const totalLength = doc.getLength();
          const numBlocks = Math.min(5, Math.floor(totalLength / 2));
          
          for (let i = 0; i < numBlocks; i++) {
            const blockOffset = Math.floor(Math.random() * (totalLength - 1)) + 1;
            doc.createNewBlock(blockOffset);
            verifyInvariants(doc);
          }
          
          // Merge all blocks back
          while (doc.getBlocks().length > 1) {
            const blocks = doc.getBlocks();
            const block = blocks[0];
            doc.mergeBlocks(block.offset + block.length);
            verifyInvariants(doc);
          }
          
          expect(doc.getBlocks().length).toBe(1);
          return true;
        }
      )
    );
  });
  
  it('maintains format integrity through complex operations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            text: textContentArb,
            formats: fc.array(formatTypeArb, { maxLength: 3 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (segments) => {
          const doc = new DocumentModel();
          
          // Build document with formatted segments
          let offset = 0;
          for (const segment of segments) {
            doc.insertText(offset, segment.text);
            
            // Apply formats to this segment
            for (const formatType of segment.formats) {
              doc.applyFormatting({ type: formatType, start: offset, end: offset + segment.text.length });
            }
            
            offset += segment.text.length;
          }
          
          verifyInvariants(doc);
          
          // Perform random deletions and verify formats adjust correctly
          const totalLength = doc.getLength();
          if (totalLength > 10) {
            const deleteOffset = Math.floor(totalLength / 3);
            const deleteLength = Math.min(5, totalLength - deleteOffset);
            
            doc.deleteText(deleteOffset, deleteLength);
            verifyInvariants(doc);
          }
          
          return true;
        }
      )
    );
  });
  
  it('handles maximum document size efficiently', () => {
    const doc = new DocumentModel();
    const largeText = 'a'.repeat(10000);
    
    const startTime = performance.now();
    doc.insertText(0, largeText);
    
    // Apply formats across the document
    for (let i = 0; i < 100; i++) {
      const offset = i * 100;
      doc.applyFormatting({ type: 'bold', start: offset, end: offset + 50 });
    }
    
    // Create some blocks
    for (let i = 1; i < 10; i++) {
      doc.createNewBlock(i * 1000);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    verifyInvariants(doc);
    expect(duration).toBeLessThan(100); // Should be very fast
    expect(doc.getLength()).toBe(10000);
    expect(doc.getBlocks().length).toBe(10);
  });
  
  it('recovers from invalid operations gracefully', () => {
    const doc = new DocumentModel();
    doc.insertText(0, 'Hello World');
    
    // Invalid operations should not corrupt state
    expect(() => doc.deleteText(100, 110)).toThrow(); // Beyond bounds
    verifyInvariants(doc);
    
    doc.applyFormatting({ type: 'bold', start: 100, end: 110 }); // Beyond bounds - may be no-op
    verifyInvariants(doc);
    
    doc.createNewBlock(100); // Beyond bounds
    verifyInvariants(doc);
    
    doc.mergeBlocks(100); // Invalid position
    verifyInvariants(doc);
    
    expect(doc.getText(0, doc.getLength())).toBe('Hello World');
  });
});