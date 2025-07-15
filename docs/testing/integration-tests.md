# Integration Testing Guide

This guide covers the comprehensive integration test suite for EditorV2, validating how all services and components work together as a complete system.

## Overview

Integration tests verify the complete flow from user input through all system layers to final DOM output. They ensure that individual components, which may work perfectly in isolation, function correctly when integrated.

## System Components

The integration tests validate interaction between:

- **Document Model**: Core text and formatting management
- **Input Handler**: Keyboard and composition event processing
- **Line Registry & Observer**: Line tracking and updates
- **Virtual Renderer**: Efficient rendering of large documents
- **Selection Mapper**: DOM ↔ Document offset mapping
- **Toolbar State Service**: Formatting state management
- **Undo/Redo Manager**: History tracking and operations
- **Diff Emitter**: Change tracking and notifications
- **DOM Decorator**: Formatting application to DOM

## Test Structure

```
integration/
├── full-integration.test.ts    # Automated Jest test suite
├── full-integration-demo.html  # Interactive manual test page
├── jest.config.js             # Jest configuration
├── setup.js                   # Test environment setup
├── run-tests.sh              # Test runner script
└── __mocks__/                # Mock modules
    └── styleMock.js
```

## Test Coverage Areas

### 1. Complete Flow Integration
Tests the full cycle of user interactions:
- Typing → Model update → DOM update
- Selection → Toolbar state → Format application
- Operations → Undo/redo → State restoration

### 2. Virtual Scrolling
- Large document handling (1000+ lines)
- Viewport calculation and updates
- Line registry integration
- Performance optimization validation

### 3. Clipboard Operations
- Copy with formatting preservation
- Paste with formatting restoration
- Multi-format handling
- Cross-block selections

### 4. Selection Mapping
- Simple text selection
- Multi-block selection
- Selection with formatting
- Collapsed cursor positioning
- Edge cases (empty blocks, boundaries)

### 5. Diff Tracking
- Insert text operations
- Delete text operations
- Formatting changes
- Block operations
- Change aggregation

### 6. Service Integration
- Concurrent operation handling
- State consistency across services
- Event propagation
- Memory management

## Running Integration Tests

### Automated Tests (Jest)

```bash
# Run all integration tests
./run-tests.sh

# Run specific test file
npx jest full-integration.test.ts

# Run with coverage
npx jest --coverage

# Watch mode for development
npx jest --watch

# Debug mode with verbose output
DEBUG=true npx jest
```

### Manual Test Page

The manual test page provides an interactive environment for testing and debugging.

1. **Start the development server**:
   ```bash
   pnpm dev
   ```

2. **Open in browser**:
   ```
   http://localhost:8080/src/editor-v2/test/integration/full-integration-demo.html
   ```

3. **Use test controls**:
   - Individual test buttons
   - "Run All Tests" for comprehensive validation
   - Real-time status updates

## Integration Flow Diagrams

### Input → Model → View Flow
```
User Input → InputHandler → DocumentModel → DiffEmitter → Render
                ↓                              ↓
          SelectionMapper              UndoRedoManager
                ↓                              ↓
          ToolbarState                   History Stack
```

### Virtual Scrolling Integration
```
Scroll Event → VirtualRenderer → Calculate Visible Range
                     ↓
              LineRegistry → Track Visible Lines
                     ↓
              Render Only Visible Content
```

### Formatting Application
```
Format Command → DocumentModel → IntervalTree Storage
                      ↓
                DOMDecorator → Apply CSS Classes
                      ↓
                ToolbarState → Update UI State
```

## Manual Test Features

### Interactive Toolbar
- **Bold** formatting toggle
- **Minimize** text toggle
- **Highlight** with color picker (yellow, blue, green, pink)
- **Clear** all formatting
- **Undo/Redo** with visual feedback
- **Block Type** selector (paragraph, headings)

### Real-time Status Panel
Displays live information:
- Document statistics (length, blocks, lines)
- Current selection info
- Active formatting at cursor
- Undo/redo stack sizes
- Virtual scroll viewport

### Diff Viewer
Live display of all document changes:
- 🟢 Insert operations (green)
- 🔴 Delete operations (red)  
- 🔵 Formatting changes (blue)

### Automated Test Scenarios
- **Complete Flow Test**: Full integration validation
- **Virtual Scrolling**: Tests with 100+ lines
- **Clipboard Operations**: Copy/paste with formatting
- **Selection Mapping**: Various selection scenarios
- **Formatting Combos**: Overlapping formats
- **Undo/Redo Stack**: History management
- **Diff Tracking**: Change detection
- **Performance Test**: Large document stress test

## Writing Integration Tests

### Test Structure Template
```typescript
describe('Feature Integration', () => {
  let container: HTMLElement;
  let model: DocumentModel;
  let services: IntegrationServices;

  beforeEach(() => {
    // Setup clean environment
    container = document.createElement('div');
    model = new DocumentModel();
    services = createIntegrationServices(model, container);
  });

  afterEach(() => {
    // Cleanup
    services.destroy();
    container.remove();
  });

  test('should handle complete user flow', async () => {
    // Arrange
    const { inputHandler, selectionMapper } = services;
    
    // Act
    await userTypes('Hello world');
    await userSelects(0, 5);
    await userFormats('bold');
    
    // Assert
    expect(model.getText()).toBe('Hello world');
    expect(model.getFormats(0, 5)).toContain('bold');
    expect(container.querySelector('.bold')).toBeTruthy();
  });
});
```

### Service Integration Helpers
```typescript
// Create integrated services
function createIntegrationServices(model, container) {
  const registry = new LineRegistry();
  const observer = new LineUpdateObserver(registry);
  const renderer = new VirtualRenderer(container, registry);
  const decorator = new DOMDecorator();
  const inputHandler = new InputHandler(model);
  
  // Connect services
  model.on('change', () => {
    renderer.update();
    decorator.apply(container, model);
  });
  
  return { model, registry, renderer, decorator, inputHandler };
}
```

## Debugging Integration Issues

### Enable Debug Output
```javascript
// In browser console
localStorage.setItem('editorDebug', 'true');

// In tests
process.env.DEBUG = 'editor:*';
```

### Performance Profiling
```javascript
// Measure operation timing
performance.mark('operation-start');
await performComplexOperation();
performance.mark('operation-end');
performance.measure('operation', 'operation-start', 'operation-end');
```

### Common Issues

#### State Synchronization
- Services out of sync
- Event ordering problems
- Race conditions

#### Memory Leaks
- Event listeners not cleaned up
- DOM references retained
- Large history stacks

#### Performance Degradation
- Too many DOM updates
- Inefficient virtual scrolling
- Large format trees

## Performance Considerations

The integration tests validate:
- Efficient rendering of 1000+ line documents
- Minimal DOM updates through virtual scrolling
- Fast formatting operations with interval trees
- Optimized selection mapping
- Memory-efficient undo/redo

### Performance Benchmarks
- Initial render: < 100ms for 1000 lines
- Typing latency: < 16ms (60 FPS)
- Format application: < 50ms
- Undo/redo: < 100ms
- Memory growth: < 50MB for large documents

## Known Limitations

1. **IME Testing**: Composition events require manual testing
2. **Clipboard API**: Browser security limits automated tests
3. **Large Documents**: 10k+ lines may show performance lag
4. **Complex Selections**: Multi-format selections need careful handling

## Best Practices

### Test Design
1. Test user workflows, not implementation
2. Use realistic data and scenarios
3. Verify visual output matches model state
4. Test edge cases and error conditions

### Test Maintenance
1. Keep tests focused and independent
2. Use descriptive test names
3. Add comments for complex scenarios
4. Regular cleanup of obsolete tests

### Contributing
When adding new integration tests:
1. Add test case to `full-integration.test.ts`
2. Add manual test button to demo page
3. Update documentation
4. Ensure all existing tests pass
5. Check performance impact