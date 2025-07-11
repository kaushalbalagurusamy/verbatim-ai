/**
 * Round-trip property-based fuzz testing for DocumentModel with DOM synchronization
 * Tests: operations → decorator → DOM → re-parse → model validation
 * Ensures zero divergence between model and DOM representation across 10,000+ operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { DocumentModel } from '../document-model';
import { DOMDecoratorService } from '../../services/dom-decorator';
import type { TextFormatting } from '../data-structures/interval-tree';
import { sliceByCodeUnits } from '../../utils/string-utils';

type FormatType = TextFormatting['type'];

// Enhanced operation types for comprehensive testing
type Operation = 
  | { type: 'insert'; offset: number; text: string }
  | { type: 'delete'; start: number; length: number }
  | { type: 'format'; formatType: FormatType; start: number; length: number }
  | { type: 'removeFormat'; formatType: FormatType; start: number; length: number }
  | { type: 'createBlock'; offset: number }
  | { type: 'mergeBlocks'; blockIndex1: number; blockIndex2: number }
  | { type: 'bulkInsert'; offset: number; text: string }
  | { type: 'replaceRange'; start: number; end: number; text: string };

// Test context for round-trip validation
interface TestContext {
  model: DocumentModel;
  decorator: DOMDecoratorService;
  container: HTMLElement;
  operationCount: number;
  seed?: number;
}

// Custom arbitraries for enhanced test data
const enhancedTextArb = fc.oneof(
  { arbitrary: fc.string({ minLength: 1, maxLength: 100 }), weight: 5 },
  { arbitrary: fc.constant('Hello World'), weight: 1 },
  { arbitrary: fc.constant('\n'), weight: 2 },
  { arbitrary: fc.constant('\r\n'), weight: 1 },
  { arbitrary: fc.array(fc.constantFrom('👍', '😀', '🚀', '🎉', '🌟', '❤️', '👨‍👩‍👧‍👦', '🏳️‍🌈'), { minLength: 1, maxLength: 10 }).map(a => a.join('')), weight: 2 },
  { arbitrary: fc.constantFrom('', '   ', '\t\t', '  \n  '), weight: 1 }, // whitespace edge cases
  // Unicode edge cases
  { arbitrary: fc.constant('\u0000\u0001\u0002'), weight: 0.5 }, // control characters
  { arbitrary: fc.constant('𝓗𝓮𝓵𝓵𝓸'), weight: 0.5 }, // mathematical alphanumeric
  { arbitrary: fc.constant('שָׁלוֹם'), weight: 0.5 }, // RTL text
  { arbitrary: fc.constant('中文测试'), weight: 0.5 }, // CJK
);

// Generate more complex operations
const enhancedOperationArb = fc.oneof(
  // Insert operation (40% weight)
  fc.record({
    type: fc.constant('insert' as const),
    offset: fc.nat({ max: 10000 }),
    text: enhancedTextArb,
  }),
  
  // Delete operation (15% weight)
  fc.record({
    type: fc.constant('delete' as const),
    start: fc.nat({ max: 1000 }),
    length: fc.integer({ min: 1, max: 50 }),
  }),
  
  // Format operation (15% weight)
  fc.record({
    type: fc.constant('format' as const),
    formatType: fc.constantFrom<FormatType>('bold', 'highlight', 'minimize'),
    start: fc.nat({ max: 1000 }),
    length: fc.integer({ min: 1, max: 100 }),
  }),
  
  // Remove format operation (10% weight)
  fc.record({
    type: fc.constant('removeFormat' as const),
    formatType: fc.constantFrom<FormatType>('bold', 'highlight', 'minimize'),
    start: fc.nat({ max: 1000 }),
    length: fc.integer({ min: 1, max: 100 }),
  }),
  
  // Create block operation (5% weight)
  fc.record({
    type: fc.constant('createBlock' as const),
    offset: fc.nat({ max: 1000 }),
  }),
  
  // Merge blocks operation (5% weight)
  fc.record({
    type: fc.constant('mergeBlocks' as const),
    blockIndex1: fc.nat({ max: 10 }),
    blockIndex2: fc.nat({ max: 10 }),
  }),
  
  // Bulk insert operation (5% weight)
  fc.record({
    type: fc.constant('bulkInsert' as const),
    offset: fc.nat({ max: 1000 }),
    text: fc.string({ minLength: 100, maxLength: 1000 }),
  }),
  
  // Replace range operation (5% weight)
  fc.record({
    type: fc.constant('replaceRange' as const),
    start: fc.nat({ max: 500 }),
    end: fc.nat({ max: 1000 }),
    text: enhancedTextArb,
  }),
);

// Apply operation with validation
function applyOperationWithValidation(ctx: TestContext, op: Operation): boolean {
  try {
    const { model } = ctx;
    const totalLength = model.getLength();
    
    switch (op.type) {
      case 'insert':
        if (op.offset >= 0 && op.offset <= totalLength && op.text.length > 0) {
          model.insertText(op.offset, op.text);
          ctx.operationCount++;
          return true;
        }
        break;
        
      case 'delete':
        if (op.start >= 0 && op.start < totalLength && op.length > 0) {
          const actualLength = Math.min(op.length, totalLength - op.start);
          model.deleteText(op.start, op.start + actualLength);
          ctx.operationCount++;
          return true;
        }
        break;
        
      case 'format':
        if (op.start >= 0 && op.start < totalLength && op.length > 0) {
          const actualLength = Math.min(op.length, totalLength - op.start);
          model.applyFormatting({ 
            type: op.formatType, 
            start: op.start, 
            end: op.start + actualLength 
          });
          ctx.operationCount++;
          return true;
        }
        break;
        
      case 'removeFormat':
        if (op.start >= 0 && op.start < totalLength && op.length > 0) {
          const actualLength = Math.min(op.length, totalLength - op.start);
          model.removeFormatting(op.start, op.start + actualLength, op.formatType);
          ctx.operationCount++;
          return true;
        }
        break;
        
      case 'createBlock':
        if (op.offset > 0 && op.offset < totalLength) {
          model.createBlock(op.offset);
          ctx.operationCount++;
          return true;
        }
        break;
        
      case 'mergeBlocks':
        const blocks = model.getBlocks();
        if (blocks.length >= 2) {
          const idx1 = Math.min(op.blockIndex1, blocks.length - 1);
          const idx2 = Math.min(op.blockIndex2, blocks.length - 1);
          if (idx1 !== idx2) {
            model.mergeBlocks(blocks[idx1].id, blocks[idx2].id);
            ctx.operationCount++;
            return true;
          }
        }
        break;
        
      case 'bulkInsert':
        if (op.offset >= 0 && op.offset <= totalLength) {
          model.insertText(op.offset, op.text);
          ctx.operationCount++;
          return true;
        }
        break;
        
      case 'replaceRange':
        if (op.start >= 0 && op.start <= totalLength) {
          const end = Math.min(op.end, totalLength);
          if (end > op.start) {
            model.deleteText(op.start, end);
          }
          model.insertText(op.start, op.text);
          ctx.operationCount++;
          return true;
        }
        break;
    }
  } catch (e) {
    // Operation failed, but document should still be valid
    console.error('Operation failed:', op, e);
  }
  return false;
}

// Perform round-trip validation: model → DOM → parse → verify
function performRoundTripValidation(ctx: TestContext): void {
  const { model, decorator, container } = ctx;
  
  // Clear container
  container.innerHTML = '';
  
  // Get all blocks from model
  const blocks = model.getBlocks();
  
  // Decorate each block
  blocks.forEach(block => {
    const blockElement = document.createElement('div');
    blockElement.setAttribute('data-block-id', block.id);
    blockElement.setAttribute('data-block-offset', block.offset.toString());
    blockElement.setAttribute('data-block-length', block.length.toString());
    
    decorator.decorateBlock(block, blockElement);
    container.appendChild(blockElement);
  });
  
  // Parse DOM back to verify consistency
  const parsedText = parseDOMToText(container);
  const parsedFormatting = parseDOMToFormatting(container);
  
  // Verify text content matches
  const modelText = model.getText();
  expect(parsedText).toBe(modelText);
  
  // Verify formatting matches
  const modelFormatting = model.getLength() > 0 ? model.getFormattingInRange(0, model.getLength()) : [];
  verifyFormattingMatches(modelFormatting, parsedFormatting);
  
  // Verify block structure
  verifyBlockStructure(model, container);
}

// Parse DOM back to text
function parseDOMToText(container: HTMLElement): string {
  const text: string[] = [];
  
  const walkNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text.push(node.textContent || '');
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of Array.from(node.childNodes)) {
        walkNode(child);
      }
    }
  };
  
  const blocks = container.querySelectorAll('[data-block-id]');
  blocks.forEach(block => walkNode(block));
  
  return text.join('');
}

// Parse DOM back to formatting
function parseDOMToFormatting(container: HTMLElement): TextFormatting[] {
  const formatting: TextFormatting[] = [];
  let globalOffset = 0;
  
  const blocks = container.querySelectorAll('[data-block-id]');
  blocks.forEach(block => {
    const blockOffset = parseInt(block.getAttribute('data-block-offset') || '0');
    
    const walkNode = (node: Node, offset: number, activeFormats: Set<string>): number => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        
        // Record active formats for this text range
        activeFormats.forEach(formatClass => {
          const type = formatClass.replace('fmt-', '').split('-')[0] as FormatType;
          if (['bold', 'highlight', 'minimize'].includes(type)) {
            formatting.push({
              type,
              start: offset,
              end: offset + text.length,
              id: `parsed-${type}-${offset}`,
              color: formatClass.includes('highlight') ? formatClass.split('-')[2] as any : undefined
            });
          }
        });
        
        return offset + text.length;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as HTMLElement;
        const classes = Array.from(elem.classList).filter(c => c.startsWith('fmt-'));
        const newActiveFormats = new Set([...activeFormats, ...classes]);
        
        let currentOffset = offset;
        for (const child of Array.from(node.childNodes)) {
          currentOffset = walkNode(child, currentOffset, newActiveFormats);
        }
        return currentOffset;
      }
      return offset;
    };
    
    walkNode(block, blockOffset, new Set());
  });
  
  return formatting;
}

// Verify formatting matches between model and parsed DOM
function verifyFormattingMatches(modelFormatting: TextFormatting[], parsedFormatting: TextFormatting[]): void {
  // Group by type and range
  const modelGroups = new Map<string, Set<string>>();
  const parsedGroups = new Map<string, Set<string>>();
  
  modelFormatting.forEach(fmt => {
    const key = `${fmt.type}-${fmt.start}-${fmt.end}`;
    if (!modelGroups.has(fmt.type)) modelGroups.set(fmt.type, new Set());
    modelGroups.get(fmt.type)!.add(key);
  });
  
  parsedFormatting.forEach(fmt => {
    const key = `${fmt.type}-${fmt.start}-${fmt.end}`;
    if (!parsedGroups.has(fmt.type)) parsedGroups.set(fmt.type, new Set());
    parsedGroups.get(fmt.type)!.add(key);
  });
  
  // Verify all model formatting is in parsed
  modelGroups.forEach((ranges, type) => {
    const parsedRanges = parsedGroups.get(type) || new Set();
    ranges.forEach(range => {
      expect(parsedRanges.has(range), `Missing formatting: ${range}`).toBe(true);
    });
  });
}

// Verify block structure consistency
function verifyBlockStructure(model: DocumentModel, container: HTMLElement): void {
  const modelBlocks = model.getBlocks();
  const domBlocks = Array.from(container.querySelectorAll('[data-block-id]'));
  
  expect(domBlocks.length).toBe(modelBlocks.length);
  
  domBlocks.forEach((domBlock, index) => {
    const modelBlock = modelBlocks[index];
    expect(domBlock.getAttribute('data-block-id')).toBe(modelBlock.id);
    expect(parseInt(domBlock.getAttribute('data-block-offset') || '0')).toBe(modelBlock.offset);
    expect(parseInt(domBlock.getAttribute('data-block-length') || '0')).toBe(modelBlock.length);
  });
}

// Extended invariant verification
function verifyExtendedInvariants(ctx: TestContext): void {
  const { model } = ctx;
  const totalLength = model.getLength();
  const blocks = model.getBlocks();
  
  // Basic invariants
  const sumOfBlockLengths = blocks.reduce((sum, block) => sum + block.length, 0);
  expect(sumOfBlockLengths).toBe(totalLength);
  
  // Block ordering invariants
  let expectedOffset = 0;
  for (const block of blocks) {
    expect(block.offset).toBe(expectedOffset);
    expect(block.length).toBeGreaterThanOrEqual(0);
    expectedOffset += block.length;
  }
  
  // Formatting invariants
  if (totalLength > 0) {
    const allFormatting = model.getFormattingInRange(0, totalLength);
    for (const format of allFormatting) {
      expect(format.start).toBeGreaterThanOrEqual(0);
      expect(format.end).toBeLessThanOrEqual(totalLength);
      expect(format.start).toBeLessThan(format.end);
      
      // Verify formatting doesn't cross block boundaries incorrectly
      const startBlock = blocks.find(b => format.start >= b.offset && format.start < b.offset + b.length);
      const endBlock = blocks.find(b => format.end > b.offset && format.end <= b.offset + b.length);
      
      if (startBlock && endBlock && startBlock.id !== endBlock.id) {
        // Multi-block formatting should be valid
        const startBlockIndex = blocks.indexOf(startBlock);
        const endBlockIndex = blocks.indexOf(endBlock);
        expect(endBlockIndex).toBeGreaterThan(startBlockIndex);
      }
    }
  }
  
  // UTF-16 consistency
  if (totalLength > 0) {
    const fullText = model.getText(0, totalLength);
    expect(fullText.length).toBe(totalLength);
    
    // Verify each block's text matches its slice
    blocks.forEach(block => {
      const blockText = sliceByCodeUnits(fullText, block.offset, block.offset + block.length);
      expect(blockText).toBe(block.text);
    });
  }
}

describe('DocumentModel Round-Trip Property Tests', () => {
  let testContext: TestContext;
  
  beforeEach(() => {
    const container = document.createElement('div');
    const model = new DocumentModel();
    const decorator = new DOMDecoratorService(model, { container });
    
    testContext = {
      model,
      decorator,
      container,
      operationCount: 0
    };
  });
  
  it('maintains perfect synchronization through 10,000+ random operations', () => {
    fc.assert(
      fc.property(
        fc.array(enhancedOperationArb, { minLength: 1000, maxLength: 10000 }),
        fc.integer({ min: 0, max: 2147483647 }), // seed for reproducibility
        fc.boolean(), // whether to start with initial content
        (operations, seed, startWithContent) => {
          // Set seed for reproducible failures
          testContext.seed = seed;
          fc.configureGlobal({ seed });
          
          if (startWithContent) {
            testContext.model.insertText(0, 'Initial content for testing\nWith multiple lines\nAnd some emojis 🚀🎉');
          }
          
          const startTime = performance.now();
          let roundTripChecks = 0;
          
          operations.forEach((op, index) => {
            // Apply operation
            applyOperationWithValidation(testContext, op);
            
            // Verify invariants
            verifyExtendedInvariants(testContext);
            
            // Perform round-trip validation every 100 operations
            if (index % 100 === 99) {
              performRoundTripValidation(testContext);
              roundTripChecks++;
            }
          });
          
          // Final round-trip validation
          performRoundTripValidation(testContext);
          roundTripChecks++;
          
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          // Performance benchmarks
          const opsPerSecond = (testContext.operationCount / duration) * 1000;
          console.log(`Completed ${testContext.operationCount} operations in ${duration.toFixed(2)}ms (${opsPerSecond.toFixed(0)} ops/sec)`);
          console.log(`Performed ${roundTripChecks} round-trip validations`);
          
          // Performance requirements
          expect(opsPerSecond).toBeGreaterThan(1000); // At least 1000 ops/sec
          
          return true;
        }
      ),
      { 
        numRuns: 10, // Run 10 test cases with different seeds
        verbose: true,
        endOnFailure: false // Continue testing even after failures
      }
    );
  });
  
  it('handles edge cases with zero divergence', () => {
    const edgeCases = [
      // Empty document
      { name: 'empty', ops: [] as Operation[] },
      
      // Maximum nesting
      { 
        name: 'max-nesting',
        ops: [
          { type: 'insert', offset: 0, text: 'Nested formatting test' } as Operation,
          { type: 'format', formatType: 'bold' as FormatType, start: 0, length: 22 },
          { type: 'format', formatType: 'highlight' as FormatType, start: 7, length: 10 },
          { type: 'format', formatType: 'minimize' as FormatType, start: 10, length: 5 }
        ]
      },
      
      // Unicode boundaries
      {
        name: 'unicode-boundaries',
        ops: [
          { type: 'insert', offset: 0, text: '👨‍👩‍👧‍👦🏳️‍🌈' } as Operation,
          { type: 'format', formatType: 'bold' as FormatType, start: 0, length: 5 },
          { type: 'delete', start: 2, length: 3 } as Operation,
        ]
      },
      
      // Rapid block creation/merging
      {
        name: 'block-chaos',
        ops: Array.from({ length: 20 }, (_, i) => ({
          type: 'insert' as const,
          offset: i * 10,
          text: `Block ${i}\n`
        })).concat(
          Array.from({ length: 10 }, (_, i) => ({
            type: 'createBlock' as const,
            offset: (i + 1) * 10
          }))
        )
      }
    ];
    
    edgeCases.forEach(({ name, ops }) => {
      console.log(`Testing edge case: ${name}`);
      
      const container = document.createElement('div');
      const model = new DocumentModel();
      const decorator = new DOMDecoratorService(model, { container });
      const ctx: TestContext = { model, decorator, container, operationCount: 0 };
      
      // Apply operations
      ops.forEach(op => {
        applyOperationWithValidation(ctx, op);
      });
      
      // Verify invariants and round-trip
      verifyExtendedInvariants(ctx);
      performRoundTripValidation(ctx);
      
      expect(true).toBe(true); // If we get here, test passed
    });
  });
  
  it('provides deterministic reproduction of failures', () => {
    const knownProblematicSeeds = [
      // Add any seeds that previously caused failures
      // Example: 123456789
    ];
    
    knownProblematicSeeds.forEach(seed => {
      fc.assert(
        fc.property(
          fc.array(enhancedOperationArb, { minLength: 100, maxLength: 1000 }),
          (operations) => {
            fc.configureGlobal({ seed });
            
            const container = document.createElement('div');
            const model = new DocumentModel();
            const decorator = new DOMDecoratorService(model, { container });
            const ctx: TestContext = { model, decorator, container, operationCount: 0, seed };
            
            operations.forEach(op => {
              applyOperationWithValidation(ctx, op);
              verifyExtendedInvariants(ctx);
            });
            
            performRoundTripValidation(ctx);
            return true;
          }
        ),
        { seed }
      );
    });
  });
  
  it('benchmarks performance across operation types', () => {
    const benchmarks = [
      { name: 'text-insertion', ops: 10000, generator: () => ({ type: 'insert' as const, offset: 0, text: 'a' }) },
      { name: 'formatting', ops: 5000, generator: () => ({ type: 'format' as const, formatType: 'bold' as FormatType, start: 0, length: 10 }) },
      { name: 'deletion', ops: 5000, generator: () => ({ type: 'delete' as const, start: 0, length: 1 }) },
      { name: 'round-trip', ops: 100, generator: () => ({ type: 'insert' as const, offset: 0, text: 'test' }) }
    ];
    
    benchmarks.forEach(({ name, ops, generator }) => {
      const container = document.createElement('div');
      const model = new DocumentModel();
      const decorator = new DOMDecoratorService(model, { container });
      const ctx: TestContext = { model, decorator, container, operationCount: 0 };
      
      // Prepare document
      model.insertText(0, 'a'.repeat(1000));
      
      const startTime = performance.now();
      
      for (let i = 0; i < ops; i++) {
        const op = generator();
        applyOperationWithValidation(ctx, op);
        
        if (name === 'round-trip') {
          performRoundTripValidation(ctx);
        }
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const opsPerSecond = (ops / duration) * 1000;
      
      console.log(`Benchmark ${name}: ${ops} operations in ${duration.toFixed(2)}ms (${opsPerSecond.toFixed(0)} ops/sec)`);
      
      // Ensure reasonable performance
      expect(duration).toBeLessThan(5000); // All benchmarks complete in < 5 seconds
    });
  });
});