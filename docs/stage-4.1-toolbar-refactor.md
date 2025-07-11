# Stage 4.1 - Toolbar Refactor Implementation

## Overview

Stage 4.1 refactors the toolbar to query DocumentModel state instead of inspecting the DOM. This ensures the toolbar state is always consistent with the document model and handles edge cases properly.

## Key Changes

### 1. ToolbarStateService (`/src/editor-v2/services/toolbar-state-service.ts`)

A new service that:
- Queries DocumentModel formatting at cursor offsets
- Provides reactive updates when selection changes
- Handles edge cases like collapsed selections and multi-block selections
- Maps internal formatting to toolbar-compatible state

**Key Methods:**
- `updateSelection(selection)` - Updates current selection and computes new toolbar state
- `getState()` - Returns current toolbar state
- `subscribe(listener)` - Subscribe to toolbar state changes

### 2. SingleContentEditableEditor Updates

Enhanced the editor component to:
- Integrate ToolbarStateService
- Expose imperative methods for toolbar commands
- Update toolbar state on selection changes and formatting operations
- Use React.forwardRef to expose methods to parent components

**New Props:**
- `onToolbarStateChange` - Callback for toolbar state updates

**Exposed Methods:**
- `applyFormatting(type, color?)` - Apply formatting to selection
- `clearFormatting()` - Remove formatting from selection
- `setBlockType(type)` - Change block type at cursor
- `getDocument()` - Access document model directly

### 3. EditorV2WithToolbarRefactored

A new integration component that:
- Connects the refactored editor with the existing toolbar
- Handles toolbar commands through editor methods
- Maintains toolbar state based on DocumentModel

## How It Works

### Selection Change Flow

1. User changes selection in editor
2. Editor's `handleSelectionChange` is triggered
3. Selection is converted from DOM to document offsets
4. ToolbarStateService is updated with new selection
5. Service queries DocumentModel for formatting at selection
6. Toolbar state is computed and listeners notified
7. Toolbar UI updates to reflect active formats

### Formatting Application Flow

1. User clicks toolbar button or uses keyboard shortcut
2. Editor applies formatting to DocumentModel
3. Content is re-rendered with new formatting
4. ToolbarStateService is notified to update state
5. Toolbar reflects the new formatting state

## Edge Cases Handled

### 1. Collapsed Selection (Cursor)
- Queries formatting at exact cursor position
- Shows formats that would apply to newly typed text

### 2. Range Selection
- Computes common formatting across entire range
- Format is considered active only if it covers the entire selection

### 3. Multi-Block Selection
- Correctly handles selections spanning multiple blocks
- Formatting state reflects the entire selection

### 4. Overlapping Formats
- Properly handles multiple formats at same position
- All active formats are tracked and reported

## Benefits

1. **Consistency**: Toolbar always reflects true DocumentModel state
2. **Performance**: No DOM inspection needed
3. **Reliability**: Handles all edge cases correctly
4. **Maintainability**: Clear separation of concerns
5. **Reactivity**: Instant updates on any change

## Testing

Use the test page at `/src/editor-v2/test/toolbar-state-test.html` to verify:
- Toolbar state updates correctly for all selection types
- Formatting commands work properly
- Edge cases are handled correctly
- State remains consistent during complex operations

## Integration

To use the refactored toolbar:

```typescript
import { EditorV2WithToolbarRefactored } from '@/editor-v2/integration/EditorV2WithToolbarRefactored';

function App() {
  return <EditorV2WithToolbarRefactored />;
}
```

The component handles all toolbar-editor integration automatically.