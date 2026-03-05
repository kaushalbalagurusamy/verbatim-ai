# Stage 6.1 - Property Fuzz + Round-Trip Tests Implementation

## Overview

Stage 6.1 enhances the existing property-based testing from Stage 1 by adding full DOM synchronization and round-trip validation. This ensures zero divergence between the DocumentModel and its DOM representation across thousands of random operations.

## Implementation Details

### Test Suite: `document-model.round-trip.test.ts`

Located at: `/workspace/src/editor-v2/models/__tests__/document-model.round-trip.test.ts`

### Key Features

#### 1. **Enhanced Operation Types**
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

#### 2. **Round-Trip Validation Process**
1. Apply operations to DocumentModel
2. Use DOMDecoratorService to render to DOM
3. Parse DOM back to extract text and formatting
4. Verify perfect match with model state
5. Check all invariants remain satisfied

#### 3. **Comprehensive Text Generation**
- ASCII strings of varying lengths
- Unicode emoji sequences (👍, 😀, 🚀, 🎉, 🌟, ❤️)
- Complex emoji (👨‍👩‍👧‍👦, 🏳️‍🌈)
- RTL text (Hebrew: שָׁלוֹם)
- CJK characters (中文测试)
- Mathematical alphanumeric (𝓗𝓮𝓵𝓵𝓸)
- Control characters and whitespace edge cases

#### 4. **Deterministic Reproducibility**
```typescript
fc.configureGlobal({ seed });
testContext.seed = seed; // Store for failure reports
```

Every test run uses a specific seed that can reproduce exact failure sequences.

#### 5. **Performance Benchmarks**
- Text insertion: Target 10,000+ ops/sec
- Formatting operations: Target 5,000+ ops/sec
- Deletion operations: Target 5,000+ ops/sec
- Round-trip validation: Target 100+ checks/sec
- Overall requirement: >1000 ops/sec maintained

### Test Coverage

#### Main Test: "maintains perfect synchronization through 10,000+ random operations"
- Runs 10 test cases with different seeds
- Each case applies 1,000-10,000 random operations
- Round-trip validation every 100 operations
- Verifies extended invariants after each operation
- Measures and reports performance metrics

#### Edge Case Tests: "handles edge cases with zero divergence"
1. **Empty Document**: Verify empty state handling
2. **Maximum Nesting**: Bold + Highlight + Minimize on same text
3. **Unicode Boundaries**: Complex emoji with formatting across boundaries
4. **Block Chaos**: Rapid creation and merging of blocks

#### Reproducibility Test: "provides deterministic reproduction of failures"
- Framework for adding problematic seeds
- Allows targeted debugging of specific failure sequences

#### Performance Benchmark Test: "benchmarks performance across operation types"
- Isolated benchmarks for each operation type
- Measures throughput in operations per second
- Ensures all operations complete within timeout

### Validation Functions

#### `performRoundTripValidation(ctx)`
- Decorates all blocks to DOM
- Parses DOM back to text and formatting
- Verifies text content matches exactly
- Verifies all formatting is preserved
- Checks block structure consistency

#### `verifyExtendedInvariants(ctx)`
- Total length equals sum of block lengths
- Block offsets are correct and increasing
- All formatting spans have valid bounds
- UTF-16 code unit consistency
- No exceptions on basic operations

### Bug Detection Capabilities

The round-trip tests can detect:
1. **Text Corruption**: Characters lost or changed during DOM serialization
2. **Formatting Loss**: Spans not properly rendered or parsed
3. **Block Misalignment**: Offsets drift during operations
4. **Encoding Issues**: UTF-16 surrogate pair handling errors
5. **Performance Regressions**: Operations becoming too slow

### Running the Tests

```bash
# Run all round-trip tests
./src/editor-v2/test/run-round-trip-tests.sh

# Run with specific seed for debugging
TEST_SEED=123456789 ./src/editor-v2/test/run-round-trip-tests.sh

# Run via vitest directly
pnpm vitest run src/editor-v2/models/__tests__/document-model.round-trip.test.ts
```

### Integration with CI/CD

The tests are designed to:
- Run efficiently in CI environments (<5 second timeout)
- Report seed values for failed tests
- Provide detailed performance metrics
- Support parallel execution

## Success Criteria Met ✅

1. ✅ **Combined fuzz + DOM sync**: Full integration of Stage 1 property tests with DOM decorator
2. ✅ **10,000 operations**: Tests handle up to 10,000 operations per run
3. ✅ **Zero divergence**: Perfect synchronization between model and DOM
4. ✅ **Edge case coverage**: Empty docs, max nesting, unicode boundaries tested
5. ✅ **Deterministic seeds**: All tests use reproducible seeds
6. ✅ **Performance benchmarks**: Tests run efficiently with metrics reporting

## Next Steps

1. Add any failing seeds to the reproducibility test suite
2. Expand edge cases based on production issues
3. Consider adding visual regression tests for formatting
4. Integrate with continuous performance monitoring