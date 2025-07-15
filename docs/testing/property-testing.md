# Property-Based Testing Guide

Property-based testing uses random data generation to test invariants and properties that should always hold true, regardless of input. This approach helps discover edge cases that traditional example-based tests might miss.

## Overview

Our property-based testing suite validates the DocumentModel and its DOM synchronization through thousands of random operations, ensuring zero divergence between the model and its visual representation.

## Test Implementation

### Core Test Suite
**Location**: `/workspace/src/editor-v2/models/__tests__/document-model.round-trip.test.ts`

### Operation Types

```typescript
type Operation = 
  | { type: 'insert'; offset: number; text: string }
  | { type: 'delete'; start: number; length: number }
  | { type: 'format'; formatType: FormatType; start: number; length: number }
  | { type: 'removeFormat'; formatType: FormatType; start: number; length: number }
  | { type: 'createBlock'; offset: number }
  | { type: 'mergeBlocks'; blockIndex1: number; blockIndex2: number }
  | { type: 'bulkInsert'; offset: number; text: string }
  | { type: 'replaceRange'; start: number; end: number; text: string };
```

## Round-Trip Validation

The testing process follows these steps:

1. **Apply Operations**: Random operations to DocumentModel
2. **DOM Rendering**: Use DOMDecoratorService to render
3. **Parse Back**: Extract text and formatting from DOM
4. **Verify Match**: Ensure perfect synchronization
5. **Check Invariants**: Validate all properties remain true

## Text Generation Strategies

### Unicode Coverage
- ASCII strings of varying lengths
- Emoji sequences: 👍, 😀, 🚀, 🎉, 🌟, ❤️
- Complex emoji: 👨‍👩‍👧‍👦, 🏳️‍🌈
- RTL text: Hebrew (שָׁלוֹם), Arabic
- CJK characters: 中文测试, 日本語
- Mathematical alphanumeric: 𝓗𝓮𝓵𝓵𝓸
- Control characters and whitespace

### Edge Cases
- Empty strings
- Very long lines (1000+ characters)
- Surrogate pair boundaries
- Zero-width characters
- Combining marks

## Deterministic Reproducibility

```typescript
// Every test run uses a seed for exact reproduction
fc.configureGlobal({ seed });
testContext.seed = seed;

// Failed tests report: "Failed with seed: 123456789"
// Reproduce with: TEST_SEED=123456789 pnpm test
```

## Performance Benchmarks

### Target Metrics
- Text insertion: >10,000 ops/sec
- Formatting: >5,000 ops/sec
- Deletion: >5,000 ops/sec
- Round-trip validation: >100 checks/sec
- Overall: >1,000 ops/sec maintained

## Test Scenarios

### 1. Bulk Operations Test
```typescript
// Applies 10,000+ random operations
// Round-trip validation every 100 operations
// Measures performance throughout
```

### 2. Edge Case Coverage
- Empty document handling
- Maximum formatting nesting (Bold + Highlight + Minimize)
- Unicode boundary formatting
- Rapid block creation/merging

### 3. Stress Testing
- Large documents (100+ blocks)
- Concurrent operations
- Memory pressure scenarios
- Rapid undo/redo cycles

## Running Property Tests

### Basic Commands
```bash
# Run all property tests
./src/editor-v2/test/run-round-trip-tests.sh

# Run with specific seed for debugging
TEST_SEED=123456789 ./src/editor-v2/test/run-round-trip-tests.sh

# Run via vitest directly
pnpm vitest run document-model.round-trip.test.ts

# Run with verbose output
DEBUG=true pnpm test:property
```

### CI Integration
```yaml
# Runs automatically in CI with:
- timeout: 5 seconds per test
- seed reporting on failures
- performance metrics collection
- parallel execution support
```

## Debugging Failed Tests

### When Tests Fail

1. **Note the Seed**: Copy from failure message
2. **Reproduce Locally**: Use TEST_SEED environment variable
3. **Enable Debug Mode**: Add verbose logging
4. **Minimize Case**: Reduce operations to find minimal failure

### Common Failure Patterns

#### Text Corruption
- Characters lost during DOM serialization
- UTF-16 surrogate pair issues
- Whitespace normalization problems

#### Formatting Loss
- Overlapping spans not preserved
- Boundary conditions in formatting
- Block-level formatting conflicts

#### Performance Degradation
- Memory leaks in operation loops
- Inefficient DOM updates
- Quadratic complexity emergence

## Writing New Property Tests

### Template Structure
```typescript
test.property('property name', {
  // Define generators
  operations: fc.array(operationGenerator, { minLength: 100 }),
  seed: fc.integer(),
}, async ({ operations, seed }) => {
  // Setup
  const model = new DocumentModel();
  
  // Execute
  for (const op of operations) {
    applyOperation(model, op);
    
    // Verify invariants
    expect(model.invariants()).toBe(true);
  }
  
  // Round-trip validation
  const dom = renderToDOM(model);
  const parsed = parseFromDOM(dom);
  expect(parsed).toEqual(model.state);
});
```

### Best Practices

1. **Start Small**: Begin with simple properties
2. **Add Complexity**: Gradually increase operation types
3. **Monitor Performance**: Track operation throughput
4. **Document Seeds**: Keep problematic seeds for regression

## Invariants to Test

### Document Invariants
- Total length = sum of block lengths
- Block offsets are monotonically increasing
- All formatting spans within valid bounds
- No overlapping blocks

### Operation Invariants
- Insert increases document length
- Delete decreases document length
- Format preserves text content
- Undo/redo maintains consistency

### Performance Invariants
- Operations complete in O(log n) time
- Memory usage grows linearly
- No exceptions during valid operations
- DOM updates are incremental

## Success Metrics

- ✅ 10,000+ operations without divergence
- ✅ All Unicode edge cases handled
- ✅ Deterministic reproduction of failures
- ✅ Performance targets consistently met
- ✅ Zero crashes or exceptions
- ✅ Memory usage remains bounded

## Future Enhancements

1. **Concurrent Operations**: Test parallel editing
2. **Network Simulation**: Add latency/failure scenarios
3. **Cross-Browser**: Expand browser-specific testing
4. **Collaborative Editing**: Multi-user scenarios
5. **Performance Regression**: Automatic benchmark tracking