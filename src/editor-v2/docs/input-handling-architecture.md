# Input Handling Architecture

## Overview

The EditorV2 implements a controlled input handling system that intercepts all native contentEditable behavior and routes edits through the DocumentModel. This ensures data consistency and enables features like undo/redo, collaborative editing, and complex formatting.

## Architecture Components

### 1. InputHandlerService (`services/input-handler.ts`)

The central service that processes all input events:

- **Intercepts** all `beforeinput` events
- **Maps** inputTypes to DocumentModel operations
- **Handles** composition events for IME support
- **Manages** selection state during operations

### 2. Event Flow

```
User Input
    ↓
beforeinput Event
    ↓
InputHandlerService.handleBeforeInput()
    ↓
event.preventDefault() [Always called]
    ↓
Map inputType to handler
    ↓
DocumentModel operation
    ↓
Update selection
    ↓
Trigger onChange & renderContent
```

### 3. Supported InputTypes

| InputType | Handler | Description |
|-----------|---------|-------------|
| `insertText` | handleInsertText | Regular character insertion |
| `insertCompositionText` | handleInsertCompositionText | IME composition |
| `deleteContentBackward` | handleDeleteBackward | Backspace key |
| `deleteContentForward` | handleDeleteForward | Delete key |
| `deleteByCut` | handleDeleteByCut | Cut operation |
| `deleteByDrag` | handleDeleteByDrag | Drag deletion |
| `insertFromPaste` | handleInsertFromPaste | Paste operation |
| `insertFromDrop` | handleInsertFromDrop | Drop operation |
| `insertLineBreak` | handleInsertLineBreak | Soft line break |
| `insertParagraph` | handleInsertParagraph | Enter key |
| `deleteWordBackward` | handleDeleteWordBackward | Ctrl+Backspace |
| `deleteWordForward` | handleDeleteWordForward | Ctrl+Delete |
| `deleteSoftLineBackward` | handleDeleteLineBackward | Delete to line start |
| `deleteSoftLineForward` | handleDeleteLineForward | Delete to line end |
| `formatBold` | handleFormatBold | Bold formatting |
| `formatItalic` | handleFormatItalic | Italic formatting |
| `historyUndo` | handleUndo | Undo operation |
| `historyRedo` | handleRedo | Redo operation |

## Composition Events (IME)

For Chinese, Japanese, Korean, and other IME input:

1. **compositionstart**: 
   - Mark composition state as active
   - Delete any selected text
   - Store composition start offset

2. **compositionupdate**:
   - Store composition data
   - Do NOT update document (prevent intermediate states)

3. **compositionend**:
   - Insert final composition text
   - Reset composition state
   - Update selection and trigger render

## Selection Management

The system maintains selection state throughout operations:

1. **Before operation**: Get current selection via `getDocumentSelection()`
2. **During operation**: Calculate new selection position
3. **After operation**: Set selection via `setDocumentSelection()`

Selection coordinates are always in document offset space (UTF-16 code units).

## Key Design Decisions

### 1. Always Prevent Default

Every `beforeinput` event calls `preventDefault()` to ensure complete control over editing behavior.

### 2. Document-First Updates

All edits go through DocumentModel methods:
- `insertText(offset, text)`
- `deleteText(start, end)`
- `replaceText(start, end, text)`
- `applyFormatting(formatting)`

### 3. Atomic Operations

Each input event results in one atomic document operation, ensuring consistency and enabling undo/redo.

### 4. Deferred Rendering

Document updates are followed by:
1. `onChange` callback (for external state sync)
2. `renderContent` call (for DOM update)

## Testing Strategy

### Unit Tests (`services/__tests__/input-handler.test.ts`)

- Test each inputType mapping
- Verify selection updates
- Test composition event sequence
- Validate edge cases

### Integration Tests

- Test with real browser events
- Verify DOM sync after operations
- Test with different keyboard layouts
- Performance testing with rapid input

## Performance Considerations

1. **Batch Updates**: Multiple rapid inputs are processed sequentially
2. **Minimal DOM Updates**: Only re-render affected blocks
3. **Selection Restoration**: Use requestAnimationFrame for smooth updates
4. **Event Delegation**: Single event listener on editor container

## Future Enhancements

1. **Undo/Redo Stack**: Implement operation history
2. **Collaborative Editing**: Add operation transforms
3. **Custom InputTypes**: Support for app-specific operations
4. **Input Validation**: Add hooks for input filtering
5. **Accessibility**: Enhanced screen reader support

## Browser Compatibility

The architecture relies on:
- `beforeinput` event (Level 2 spec)
- `InputEvent.inputType` property
- Composition events

Supported in:
- Chrome 60+
- Firefox 87+
- Safari 10.1+
- Edge 79+

## Debugging

Enable input event logging:
```javascript
// In InputHandlerService
console.log(`Input: ${event.inputType}`, event.data);
```

Monitor document state:
```javascript
console.log('Document:', document.getText());
console.log('Selection:', selection);
```