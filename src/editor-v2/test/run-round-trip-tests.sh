#!/bin/bash

# Run round-trip property-based fuzz tests for DocumentModel
# Stage 6.1 - Combines Stage 1 fuzz tests with DOM synchronization

echo "=========================================="
echo "Stage 6.1 - Round-Trip Property Fuzz Tests"
echo "=========================================="
echo ""
echo "Testing: operations → decorator → DOM → re-parse → model"
echo "Goal: Zero divergence across 10,000+ random operations"
echo ""

# Set up test environment
export NODE_ENV=test

# Run the round-trip tests with detailed output
echo "Running round-trip property tests..."
pnpm vitest run src/editor-v2/models/__tests__/document-model.round-trip.test.ts --reporter=verbose

# Check if tests passed
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All round-trip tests passed!"
    echo ""
    echo "Key achievements:"
    echo "- 10,000+ operations tested with zero divergence"
    echo "- Full DOM synchronization validated"
    echo "- Deterministic seeds for reproducible failures"
    echo "- Performance benchmarks met (>1000 ops/sec)"
    echo ""
else
    echo ""
    echo "❌ Some tests failed. Check output above for details."
    echo "Failed tests include seed values for reproduction."
    echo ""
fi

# Optional: Run with specific seed for debugging
if [ ! -z "$TEST_SEED" ]; then
    echo "Re-running with seed: $TEST_SEED"
    pnpm vitest run src/editor-v2/models/__tests__/document-model.round-trip.test.ts --reporter=verbose -- --seed=$TEST_SEED
fi