# Undo/Redo System

The Editor V2 includes a comprehensive undo/redo system that tracks all document changes and allows users to navigate through their editing history with perfect content preservation.

## Overview

The undo/redo system uses a snapshot-based approach for maximum reliability, storing complete document states and ensuring exact restoration of content and formatting. It integrates seamlessly with all editor operations and provides standard keyboard shortcuts.

## Features

### Complete State Preservation
- Full document snapshots ensure perfect restoration
- Preserves text content, formatting, and document structure
- Works reliably with all editor operations

### Keyboard Shortcuts
- **Undo**: Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
- **Redo**: Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y (Windows)
- Shortcuts work globally within the editor

### Memory Management
- Configurable maximum history size (default: 100 actions)
- Memory limit protection (default: 10MB)
- Automatic cleanup of old history when limits exceeded
- Efficient storage of document snapshots

### Performance Optimizations
- Debounced recording for rapid operations (100ms)
- Immediate recording option for critical actions
- Duplicate state detection to avoid redundant entries
- Minimal impact on editing performance

## Usage

### Basic Integration

The undo/redo system is automatically included with the editor:

```typescript
import { SingleContentEditableEditor } from '@/editor-v2/components/SingleContentEditableEditor';

function App() {
  return (
    <SingleContentEditableEditor
      initialContent="Start typing..."
      onChange={(content) => console.log(content)}
    />
  );
}
```

### Programmatic Control

Access the undo/redo manager through the input handler:

```typescript
import { InputHandlerService } from '@/editor-v2/services/input-handler';

// Get the undo/redo manager
const undoRedoManager = inputHandler.getUndoRedoManager();

// Check status
const canUndo = undoRedoManager.canUndo();
const canRedo = undoRedoManager.canRedo();

// Get history information
const historySize = undoRedoManager.getUndoCount();
const memoryUsage = undoRedoManager.getMemoryUsage();

// Manual undo/redo
undoRedoManager.undo();
undoRedoManager.redo();

// Clear history
undoRedoManager.clearHistory();
```

### Custom Recording

For custom operations, manually record snapshots:

```typescript
// Debounced recording (waits 100ms)
document.insertText(0, 'Hello World');
undoRedoManager.recordAction();

// Immediate recording (no delay)
document.applyFormatting({ type: 'bold', start: 0, end: 5 });
undoRedoManager.recordActionImmediate();
```

## Configuration

### Initialize with Custom Settings

```typescript
const undoRedoManager = new UndoRedoManagerV2(document, {
  maxActions: 200,        // Maximum history entries
  maxMemoryMB: 20,       // Maximum memory usage
  debounceMs: 150       // Debounce delay
});
```

### Memory Usage Monitoring

```typescript
// Monitor memory usage
console.log(`Memory: ${undoRedoManager.getMemoryUsage()} bytes`);
console.log(`Actions: ${undoRedoManager.getUndoCount()}`);

// Get detailed state
const state = {
  canUndo: undoRedoManager.canUndo(),
  canRedo: undoRedoManager.canRedo(),
  undoCount: undoRedoManager.getUndoCount(),
  redoCount: undoRedoManager.getRedoCount()
};
```

## Architecture

### Snapshot-Based Approach

The system stores complete document states rather than diffs:

1. **Reliability**: Always restores exact state
2. **Simplicity**: Easier to understand and maintain
3. **Compatibility**: Works around DocumentModel quirks

### Recording Strategy

Actions are recorded after document mutations:

```
User Action → Document Change → Record Snapshot → Update UI
```

### Memory Management

The system maintains efficient memory usage:
- FIFO eviction when limits exceeded
- Memory estimation before storage
- Only text and formatting stored (not full DOM)

## Integration Points

### InputHandlerService
Automatically calls `recordAction()` after each mutation

### Editor Component
Handles keyboard events via `handleKeyDown()`

### UI Updates
onChange callback notifies UI of undo/redo availability

### Document Model
Direct integration for state capture/restore

## Best Practices

### When to Record Actions

1. **Automatically Handled**:
   - Text insertion/deletion
   - Formatting changes
   - Cut/copy/paste operations

2. **Manual Recording Needed**:
   - Programmatic document changes
   - Batch operations
   - Custom formatting commands

### Grouping Operations

For complex operations that should undo as one unit:

```typescript
// Start a batch operation
document.beginBatch();

// Multiple changes
document.insertText(0, 'Title: ');
document.applyFormatting({ type: 'bold', start: 0, end: 6 });

// End batch and record once
document.endBatch();
undoRedoManager.recordActionImmediate();
```

## Testing

Run the comprehensive test suite:

```bash
pnpm test src/editor-v2/services/__tests__/undo-redo-v2.test.ts
```

Tests verify:
- Basic undo/redo functionality
- Multiple operation handling
- Formatting preservation
- Keyboard shortcut processing
- Memory limit enforcement
- Edge case handling

## Limitations & Future

Current limitations:
- Single user only (no collaborative editing)
- Session-based (history not persisted)
- Memory bound for very large documents

See the roadmap for planned enhancements including persistent history and collaborative support.