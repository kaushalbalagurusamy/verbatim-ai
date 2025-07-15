# Toolbar Integration

The Editor V2 toolbar provides a powerful formatting interface that seamlessly integrates with the document model. This guide covers how to use the toolbar, available formatting options, and configuration details.

## Overview

The toolbar system queries the DocumentModel state directly rather than inspecting the DOM, ensuring consistent formatting behavior and proper handling of edge cases. All formatting operations are atomic and support undo/redo functionality.

## Features

### Available Formatting Options

- **Bold** (Ctrl/Cmd+B) - Apply or remove bold formatting
- **Highlight** (Ctrl/Cmd+H) - Apply colored highlights with 4 color options
- **Minimize** (Ctrl/Cmd+M) - Reduce text size and opacity
- **Clear Formatting** (Ctrl/Cmd+Shift+C) - Remove all formatting
- **Heading Levels** (Ctrl/Cmd+1-6) - Apply heading styles H1-H6

### Smart Toggle Behavior

All formatting options implement intelligent toggle behavior:
- If no text in the selection has the format, it's applied to all
- If all text has the format, it's removed from all
- Mixed formatting states are handled consistently

### Real-time State Updates

The toolbar automatically reflects the active formatting at the current cursor position or selection:
- Visual indicators show which formats are active
- State updates instantly as you move through the document
- Keyboard shortcuts and button clicks produce identical results

## Usage

### Basic Integration

```typescript
import { EditorV2WithToolbar } from '@/editor-v2/integration/EditorV2WithToolbar';

function App() {
  return (
    <EditorV2WithToolbar
      initialContent="Start typing..."
      onChange={(content) => console.log(content)}
    />
  );
}
```

### Advanced Integration

For more control, use the refactored components directly:

```typescript
import { EditorV2WithToolbarRefactored } from '@/editor-v2/integration/EditorV2WithToolbarRefactored';

function App() {
  const handleToolbarStateChange = (state) => {
    console.log('Active formats:', state);
  };

  return (
    <EditorV2WithToolbarRefactored
      onToolbarStateChange={handleToolbarStateChange}
    />
  );
}
```

### Programmatic Formatting

Access formatting methods via the editor ref:

```typescript
const editorRef = useRef();

// Apply formatting
editorRef.current.applyFormatting('bold');
editorRef.current.applyFormatting('highlight', 'yellow');

// Clear all formatting
editorRef.current.clearFormatting();

// Change block type
editorRef.current.setBlockType('h1');
```

## Configuration

### Toolbar State Service

The toolbar uses a dedicated service for state management:

```typescript
const toolbarService = new ToolbarStateService(documentModel);

// Subscribe to state changes
toolbarService.subscribe((state) => {
  console.log('Bold active:', state.bold);
  console.log('Highlight color:', state.highlightColor);
});

// Update selection
toolbarService.updateSelection({ start: 0, end: 10 });
```

### Custom Toolbar Implementation

Create your own toolbar UI while using the state service:

```typescript
function CustomToolbar({ toolbarState, onCommand }) {
  return (
    <div className="custom-toolbar">
      <button 
        className={toolbarState.bold ? 'active' : ''}
        onClick={() => onCommand('bold')}
      >
        Bold
      </button>
      {/* Add more buttons */}
    </div>
  );
}
```

## Keyboard Shortcuts

All toolbar functions are accessible via keyboard:

| Action | Windows/Linux | macOS |
|--------|--------------|-------|
| Bold | Ctrl+B | Cmd+B |
| Highlight | Ctrl+H | Cmd+H |
| Minimize | Ctrl+M | Cmd+M |
| Clear Format | Ctrl+Shift+C | Cmd+Shift+C |
| Heading 1-6 | Ctrl+1-6 | Cmd+1-6 |

## Edge Cases Handled

### Collapsed Selection (Cursor)
- Toolbar shows formats that would apply to newly typed text
- Formatting commands affect future input

### Range Selection
- Common formatting across the entire range is shown
- Partial formatting is handled intelligently

### Multi-Block Selection
- Block-level formats (headings) apply to all selected blocks
- Inline formats work across block boundaries

## Architecture Benefits

- **Consistency**: All formatting through DocumentModel ensures data integrity
- **Performance**: Efficient format queries via IntervalTree data structure
- **Reliability**: No DOM inspection means no browser inconsistencies
- **Extensibility**: Easy to add new format types

## Testing

Use the interactive test page to verify toolbar behavior:

```bash
open src/editor-v2/test/toolbar-integration-test.html
```

This page allows you to:
- Test all formatting commands
- Verify keyboard shortcuts
- Check toolbar state updates
- Debug edge cases