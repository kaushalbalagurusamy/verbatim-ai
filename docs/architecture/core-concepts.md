# EditorV2 Core Concepts

## DocumentModel: The Source of Truth

The DocumentModel is the heart of EditorV2, representing the entire document state in a structured, predictable format.

### Why a Custom Model?

Traditional contentEditable stores document state in the DOM, leading to:
- **Parsing overhead**: Constantly reading DOM to understand state
- **Browser differences**: Same content, different DOM structures
- **Limited operations**: Can't implement complex features cleanly

Our DocumentModel solves these by being a pure JavaScript data structure that:
- **Centralizes state**: One source of truth for the document
- **Enables features**: Undo/redo, collaboration, validation
- **Improves performance**: No DOM parsing needed

## Block Structure

### What is a Block?

A block is a semantic unit of content - typically a paragraph, heading, or list item. Each block contains:

```typescript
interface DocumentBlock {
  id: string;           // Unique identifier
  type: BlockType;      // 'paragraph', 'heading1', etc.
  content: string;      // UTF-16 encoded text
}
```

### Why Blocks?

1. **Performance**: Update only changed blocks, not entire document
2. **Structure**: Clear document hierarchy and semantics
3. **Features**: Block-level operations (reorder, convert, style)
4. **Rendering**: Natural mapping to HTML elements

### Block Types

```typescript
type BlockType = 
  | 'paragraph'
  | 'heading1' | 'heading2' | 'heading3'
  | 'bullet-list' | 'numbered-list'
  | 'quote' | 'code';
```

Each type maps to specific:
- HTML element for rendering
- Keyboard shortcuts for creation
- Formatting rules and constraints

## Text and UTF-16 Handling

### Why UTF-16 Matters

JavaScript strings use UTF-16 encoding, where some characters (like emojis) use two code units:

```javascript
'Hello'.length     // 5 - each character is 1 code unit
'👋'.length        // 2 - emoji uses 2 code units (surrogate pair)
'Hello👋'.length   // 7 - mixed content
```

### Our Approach

We embrace UTF-16 throughout the system:

1. **Consistency**: All offsets are UTF-16 code units
2. **No conversion**: Matches browser selection APIs
3. **Performance**: No encoding/decoding overhead

### UTF-16 Utilities

```typescript
// Check if we're in middle of surrogate pair
function isHighSurrogate(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0xD800 && code <= 0xDBFF;
}

// Adjust offset to valid character boundary
function adjustOffset(text: string, offset: number): number {
  if (offset > 0 && isHighSurrogate(text[offset - 1])) {
    return offset - 1;
  }
  return offset;
}
```

## Formatting System

### TextFormatting Structure

Formatting is stored as ranges with attributes:

```typescript
interface TextFormatting {
  start: number;      // UTF-16 offset
  end: number;        // UTF-16 offset  
  format: FormatType; // 'bold', 'highlight', etc.
  color?: string;     // For highlight colors
}
```

### Why Separate from Text?

1. **Flexibility**: Multiple formats can overlap
2. **Performance**: Update formatting without touching text
3. **Merging**: Automatically merge adjacent same formats
4. **Querying**: Efficiently find formatting at position

### Format Types

- **Bold**: Font weight emphasis
- **Highlight**: Background color with predefined palette
- **Minimize**: Reduced visual prominence
- **Future**: Italic, underline, links, etc.

### Format Operations

```typescript
// Apply formatting to selection
applyFormatting({
  start: 10,
  end: 20,
  format: 'bold'
});

// Toggle format at position
toggleFormat(offset, 'highlight', 'yellow');

// Query formats at position
getFormatsAtOffset(15); // Returns ['bold', 'highlight']
```

## Document Operations

### Atomic Operations

Every edit is an atomic operation that can be:
- **Applied**: Make the change
- **Reversed**: Undo the change
- **Tracked**: Know exactly what changed

### Operation Types

1. **Text Operations**
   ```typescript
   insertText(offset: number, text: string)
   deleteText(start: number, end: number)
   replaceText(start: number, end: number, text: string)
   ```

2. **Block Operations**
   ```typescript
   createBlock(type: BlockType, index: number)
   deleteBlock(id: string)
   updateBlockType(id: string, type: BlockType)
   mergeBlocks(firstId: string, secondId: string)
   ```

3. **Format Operations**
   ```typescript
   addFormatting(formatting: TextFormatting)
   removeFormatting(start: number, end: number, format: FormatType)
   ```

### Why Atomic Operations?

1. **Undo/Redo**: Each operation can be reversed
2. **Collaboration**: Operations can be transformed
3. **History**: Track document evolution
4. **Validation**: Ensure document consistency

## Selection and Offsets

### Document Offsets

All positions in the document use absolute UTF-16 offsets:

```
Block 1: "Hello" (0-5)
Block 2: "World" (5-10)
Total length: 10
```

### Selection Mapping

Browser selection uses block-relative positions, we convert to absolute:

```typescript
// Browser gives us: block 2, offset 2
// We calculate: 5 (block 1) + 2 = absolute offset 7

function getAbsoluteOffset(blockIndex: number, blockOffset: number): number {
  let offset = 0;
  for (let i = 0; i < blockIndex; i++) {
    offset += blocks[i].content.length;
  }
  return offset + blockOffset;
}
```

### Why Absolute Offsets?

1. **Simplicity**: One coordinate system
2. **Operations**: Easy range calculations
3. **Formatting**: Spans multiple blocks naturally
4. **Performance**: No repeated conversions

## Input Handling

### Controlled Input System

EditorV2 intercepts ALL native contentEditable behavior through the InputHandlerService:

```typescript
// Every keystroke goes through this flow:
User Input → beforeinput Event → preventDefault() → Map to Operation → Update Model → Render
```

### Why Control Input?

Native contentEditable is unpredictable:
- **Different browsers** produce different DOM for same input
- **No operation history** for undo/redo
- **Limited control** over formatting behavior
- **Inconsistent IME** handling across platforms

### Input Type Mapping

The InputHandler maps browser input types to document operations:

| Browser Event | Document Operation | Example |
|--------------|-------------------|---------|
| insertText | insertText() | Regular typing |
| insertCompositionText | insertText() | IME input |
| deleteContentBackward | deleteText() | Backspace |
| insertParagraph | splitBlock() | Enter key |
| formatBold | toggleFormat() | Ctrl+B |

### Composition Events (IME)

For Chinese, Japanese, Korean input:

1. **compositionstart**: Mark composition active, store position
2. **compositionupdate**: Store data but don't update document
3. **compositionend**: Insert final text, update selection

This prevents intermediate IME states from corrupting the document.

## Design Principles

### Immutability Where Possible

Operations return new state rather than mutating:
- Easier to track changes
- Enables time-travel debugging
- Simplifies collaborative editing

### Fail Fast and Explicit

Invalid operations throw errors immediately:
- No silent failures
- Clear error messages
- Consistent state guaranteed

### Performance First

Every design decision considers performance:
- O(1) block lookups with Map
- Efficient UTF-16 boundary checks
- Minimal object allocations
- Smart diff algorithms