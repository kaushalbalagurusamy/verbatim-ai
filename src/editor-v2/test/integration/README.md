# EditorV2 Integration Tests

This directory contains integration tests for the EditorV2 component system, validating how all services and components work together.

## Quick Start

### Run Automated Tests
```bash
# Run all integration tests
./run-tests.sh

# Run with coverage
npx jest --coverage

# Watch mode for development
npx jest --watch
```

### Manual Testing
```bash
# Start dev server
pnpm dev

# Open test page
# http://localhost:8080/src/editor-v2/test/integration/full-integration-demo.html
```

## Test Structure

```
integration/
├── full-integration.test.ts    # Automated Jest test suite
├── full-integration-demo.html  # Interactive manual test page
├── jest.config.js             # Jest configuration
├── setup.js                   # Test environment setup
├── run-tests.sh              # Test runner script
└── __mocks__/                # Mock modules
```

## What's Tested

### Core Integration
- Complete editing flow (input → model → view)
- Service coordination and state consistency
- Event propagation between components

### Feature Coverage
- Virtual scrolling with 1000+ lines
- Clipboard operations with formatting
- Selection mapping and cursor positioning
- Undo/redo with full state restoration
- Real-time diff tracking

### Performance Validation
- Render efficiency for large documents
- Memory usage during extended sessions
- Operation throughput benchmarks

## Manual Test Page Features

The interactive test page includes:

- **Toolbar**: Format controls with visual feedback
- **Status Panel**: Real-time metrics display
- **Diff Viewer**: Live change tracking
- **Test Runner**: Automated scenario execution

## Documentation

For comprehensive testing documentation, see:
- [Integration Testing Guide](/workspace/docs/testing/integration-tests.md)
- [Testing Overview](/workspace/docs/testing/overview.md)

## Debugging

```javascript
// Enable debug output
localStorage.setItem('editorDebug', 'true');

// Check performance
performance.getEntriesByType('measure');
```

## Contributing

1. Add test cases to `full-integration.test.ts`
2. Update manual test page for new features
3. Ensure all tests pass before committing
4. Check performance impact