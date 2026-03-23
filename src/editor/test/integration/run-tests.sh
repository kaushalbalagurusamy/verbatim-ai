#!/bin/bash

# EditorV2 Integration Test Runner
# Runs the comprehensive integration test suite

echo "🧪 Running EditorV2 Integration Tests..."
echo "======================================="

# Navigate to integration test directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing test dependencies..."
    npm install --save-dev jest ts-jest @types/jest jsdom
fi

# Run tests with coverage
echo "🏃 Running tests with coverage..."
npx jest --config=jest.config.js --coverage --verbose

# Check test results
if [ $? -eq 0 ]; then
    echo "✅ All integration tests passed!"
    echo ""
    echo "📊 Coverage report generated in ./coverage"
    echo ""
    echo "🌐 To view the manual test page, open:"
    echo "   http://localhost:8080/src/editor-v2/test/integration/full-integration-demo.html"
else
    echo "❌ Some tests failed. Please check the output above."
    exit 1
fi