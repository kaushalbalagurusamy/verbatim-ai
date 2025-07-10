#!/bin/bash

# Script to run bug reproduction tests and collect artifacts

echo "🐛 Running Editor Bug Reproduction Tests..."
echo "These tests are EXPECTED TO FAIL - they document existing bugs"
echo ""

# Create artifacts directory if it doesn't exist
mkdir -p docs/bug-repro/artifacts

# Run the tests
echo "Running Playwright tests..."
pnpm test:e2e bug-reproduction.spec.ts --reporter=list || true

echo ""
echo "✅ Tests completed (failures are expected!)"
echo ""
echo "📸 Screenshots should be saved in: docs/bug-repro/"
echo "🎥 Videos (if any) are in: test-results/"
echo ""
echo "To view test results interactively, run:"
echo "  pnpm test:e2e:ui bug-reproduction.spec.ts"