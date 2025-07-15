# EditorV2 Architecture Overview

## Why EditorV2?

EditorV2 is a complete rewrite of the editor built to solve fundamental limitations:

1. **Predictable State Management**: Native contentEditable is unpredictable across browsers
2. **Advanced Features**: Enable undo/redo, collaborative editing, and complex formatting
3. **Performance**: Handle large documents with thousands of blocks efficiently
4. **Accessibility**: Full keyboard navigation and screen reader support

## Core Architecture Principles

### Controlled Input System

EditorV2 intercepts all native browser editing behavior and routes changes through a centralized document model. This provides:

- **Consistency**: Same behavior across all browsers
- **Control**: Every edit is an explicit operation we can track
- **Features**: Enables undo/redo, collaboration, and custom operations

### Model-View Separation

```
DocumentModel (Source of Truth)
    ↓
Renderer (DOM Synchronization)
    ↓
ContentEditable (User Interface)
```

The DocumentModel holds all document state, while the DOM is purely a view layer that gets synchronized after each change.

## Key Components

### 1. DocumentModel (`models/document-model.ts`)

The central data structure representing the document:

- **Blocks**: Document divided into semantic blocks (paragraphs, headings, etc.)
- **Text Content**: UTF-16 encoded text with proper emoji support
- **Formatting**: Ranges of text with formatting attributes
- **Operations**: All edits are atomic operations (insert, delete, format)

### 2. InputHandlerService (`services/input-handler.ts`)

Intercepts and processes all user input:

- Captures `beforeinput` events and prevents defaults
- Maps browser input types to document operations
- Handles IME composition for international input
- Manages selection state during operations

### 3. DOMDecoratorService (`services/dom-decorator.ts`)

Manages visual formatting in the DOM:

- Wraps formatted text in styled `<span>` elements
- Implements efficient span pooling and recycling
- Supports nested formatting with proper precedence
- Handles iOS plaintext-only mode via shadow DOM

### 4. DocumentDiffEmitter (`services/document-diff-emitter.ts`)

Tracks document changes over time:

- Creates versioned snapshots of document state
- Computes minimal diffs between versions
- Enables undo/redo functionality
- Foundation for collaborative editing

## Data Flow

### User Input Flow

```
1. User types/edits
2. beforeinput event fired
3. InputHandler intercepts
4. Prevents default behavior
5. Maps to DocumentModel operation
6. Updates DocumentModel
7. Emits change event
8. Re-render affected blocks
9. Update selection
```

### Rendering Flow

```
1. DocumentModel changes
2. Identify affected blocks
3. Generate HTML for blocks
4. Apply formatting via DOMDecorator
5. Update DOM efficiently
6. Restore selection position
```

## Why This Architecture?

### Problem: ContentEditable Inconsistency

Native contentEditable behaves differently across browsers, making it impossible to build reliable features. Our architecture solves this by:

- **Intercepting all edits** before they affect the DOM
- **Normalizing behavior** through our input handler
- **Controlling the DOM** ourselves rather than letting the browser

### Problem: Complex Features

Features like collaborative editing require knowing exactly what changed. Our architecture enables this through:

- **Atomic operations** that can be tracked and reversed
- **Diff computation** to identify minimal changes
- **Clean state management** without DOM parsing

### Problem: Performance at Scale

Large documents slow down with native contentEditable. We solve this through:

- **Block-based rendering** - only update changed blocks
- **Virtual scrolling** - only render visible blocks
- **Span recycling** - reuse DOM elements efficiently

## Integration Points

### For New Features

1. **Custom Operations**: Add new operation types to DocumentModel
2. **Input Types**: Map new browser inputs in InputHandler
3. **Formatting**: Add format types to DOMDecorator
4. **History**: Use DocumentDiffEmitter for tracking changes

### For External Systems

1. **Persistence**: Serialize DocumentModel to JSON
2. **Collaboration**: Subscribe to diff events
3. **Search**: Query DocumentModel directly
4. **Export**: Transform DocumentModel to target format

## Design Decisions

### UTF-16 Everywhere

JavaScript strings use UTF-16 encoding, so we maintain UTF-16 offsets throughout to avoid conversion overhead and ensure consistency with browser APIs.

### Block-Based Structure

Documents are divided into blocks for:
- **Performance**: Update only changed blocks
- **Semantics**: Clear document structure
- **Features**: Block-level operations (reorder, style)

### Controlled Rendering

We completely control DOM updates rather than using contentEditable's built-in editing because:
- **Predictability**: Same result every time
- **Features**: Complex formatting and decorations
- **Performance**: Optimize update strategy

## Next Steps

See the following documents for deeper dives:

- [Core Concepts](./core-concepts.md) - DocumentModel, blocks, and formatting
- [Change Tracking](./change-tracking.md) - Diff computation and history
- [DOM Synchronization](./dom-synchronization.md) - Rendering and decoration