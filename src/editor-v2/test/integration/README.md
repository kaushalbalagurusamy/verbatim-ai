# EditorV2 Integration Tests

Comprehensive integration test suite for the EditorV2 component system, testing all services and components working together.

## Overview

This test suite validates the complete integration of:

- **Document Model**: Core text and formatting management
- **Input Handler**: Keyboard and composition event processing
- **Line Registry & Observer**: Line tracking and updates
- **Virtual Renderer**: Efficient rendering of large documents
- **Selection Mapper**: DOM ↔ Document offset mapping
- **Toolbar State Service**: Formatting state management
- **Undo/Redo Manager**: History tracking and operations
- **Diff Emitter**: Change tracking and notifications
- **DOM Decorator**: Formatting application to DOM

## Test Coverage

### 1. Complete Flow Integration
Tests the full cycle: typing → model update → DOM update → toolbar state → undo/redo

### 2. Virtual Scrolling
- Large document handling (1000+ lines)
- Viewport calculation and updates
- Line registry integration
- Performance optimization

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

## Running Tests

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
```

### Manual Test Page

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Open in browser:
   ```
   http://localhost:8080/src/editor-v2/test/integration/full-integration-demo.html
   ```

3. Use the test buttons to run individual scenarios or "Run All Tests"

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

## Manual Test Features

The manual test page provides:

### Toolbar
- **Bold** formatting toggle
- **Minimize** text toggle
- **Highlight** with color picker (yellow, blue, green, pink)
- **Clear** all formatting
- **Undo/Redo** with visual feedback
- **Block Type** selector (paragraph, headings)

### Status Panel
Real-time display of:
- Document statistics (length, blocks, lines)
- Current selection info
- Active formatting at cursor
- Undo/redo stack sizes
- Virtual scroll viewport

### Diff Viewer
Live display of all document changes with color coding:
- 🟢 Insert operations
- 🔴 Delete operations
- 🔵 Formatting changes

### Test Controls
Automated test scenarios:
- **Complete Flow Test**: Full integration test
- **Virtual Scrolling**: Tests with 100+ lines
- **Clipboard Operations**: Copy/paste with formatting
- **Selection Mapping**: Various selection scenarios
- **Formatting Combos**: Overlapping formats
- **Undo/Redo Stack**: History management
- **Diff Tracking**: Change detection
- **Performance Test**: Large document stress test

## Key Integration Points

### 1. Input → Model → View Flow
```typescript
User Input → InputHandler → DocumentModel → DiffEmitter → Render
                ↓                              ↓
          SelectionMapper              UndoRedoManager
                ↓                              ↓
          ToolbarState                   History Stack
```

### 2. Virtual Scrolling Integration
```typescript
Scroll Event → VirtualRenderer → Calculate Visible Range
                     ↓
              LineRegistry → Track Visible Lines
                     ↓
              Render Only Visible Content
```

### 3. Formatting Application
```typescript
Format Command → DocumentModel → IntervalTree Storage
                      ↓
                DOMDecorator → Apply CSS Classes
                      ↓
                ToolbarState → Update UI State
```

## Performance Considerations

The integration tests validate:
- Efficient rendering of 1000+ line documents
- Minimal DOM updates through virtual scrolling
- Fast formatting operations with interval trees
- Optimized selection mapping
- Memory-efficient undo/redo

## Debugging

Enable debug output:
```javascript
// In browser console
localStorage.setItem('editorDebug', 'true');
```

Check performance:
```javascript
// In test page console
performance.measure('render', 'render-start', 'render-end');
```

## Known Limitations

1. **IME Testing**: Composition events require manual testing
2. **Clipboard API**: Browser security limits automated clipboard tests
3. **Performance**: Large documents (10k+ lines) may show lag
4. **Selection**: Complex multi-format selections need careful handling

## Contributing

When adding new integration tests:

1. Add test case to `full-integration.test.ts`
2. Add manual test button to `full-integration-demo.html`
3. Update this README with new test coverage
4. Ensure all existing tests still pass
5. Check performance impact with large documents