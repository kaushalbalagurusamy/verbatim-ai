# Selection-Offset Mapping Architecture

## Overview

The Selection-Offset Mapping service provides bidirectional conversion between DOM selections and document global offsets. This is critical for maintaining accurate cursor positions and selections across document operations, especially when dealing with virtual rendering, multi-block content, and formatted text.

## Core Components

### SelectionOffsetMapper

The main service class that handles all selection-offset conversions.

```typescript
class SelectionOffsetMapper {
  private nodeMap: Map<Node, NodeMapping>;  // Maps text nodes to their positions
  private blockMap: Map<string, Node[]>;    // Maps block IDs to their text nodes
}
```

### Key Interfaces

```typescript
interface NodeMapping {
  node: Node;              // The text node
  blockId: string;         // ID of containing block
  localOffset: number;     // Offset within the block
  globalOffset: number;    // Global document offset
  length: number;          // Length of text in this node
}

interface GlobalRange {
  start: number;           // Start offset in document
  end: number;             // End offset in document
}
```

## Architecture Design

### 1. Reverse Index Building

The service builds a reverse index that maps every text node in the editor to its position information:

```
DOM Structure:
  Block1 [id="b1"]
    TextNode("Hello ")     → {blockId: "b1", localOffset: 0, globalOffset: 0, length: 6}
    Span
      TextNode("World")    → {blockId: "b1", localOffset: 6, globalOffset: 6, length: 5}
  Block2 [id="b2"]
    TextNode("Second")     → {blockId: "b2", localOffset: 0, globalOffset: 11, length: 6}
```

### 2. Selection to Global Range Conversion

Converts DOM selection (anchorNode/offset, focusNode/offset) to global document offsets:

1. Look up text nodes in the node map
2. Calculate global offset: `mapping.globalOffset + nodeOffset`
3. Handle both forward and backward selections
4. Return normalized range with start < end

### 3. Global Range to Selection Conversion

Converts global document offsets back to DOM positions:

1. Find block containing the offset
2. Find text node within block at local offset
3. Return DOM node and offset within that node
4. Handle empty blocks and formatting boundaries

## Edge Case Handling

### 1. Collapsed Selections
- Single cursor position where start === end
- Handled identically in both directions

### 2. Multi-Block Selections
- Selections spanning multiple blocks
- Proper handling of block boundaries
- Accurate offset calculation across blocks

### 3. Empty Blocks
- Blocks with no text content (just `<br>`)
- Selection points to block element itself
- Offset calculation handles zero-length blocks

### 4. Formatted Text
- Text split across multiple nodes due to formatting
- Maintains accurate offsets across node boundaries
- Example: `Hello <b>World</b>` has two text nodes

### 5. Emojis and Surrogate Pairs
- UTF-16 aware offset calculations
- Emoji "👋" takes 2 code units
- Consistent handling in both directions

### 6. Selection at Boundaries
- Start/end of blocks
- Start/end of formatted spans
- Document start/end positions

## Special Selection Operations

### Triple-Click Selection
```typescript
handleTripleClickSelection(blockId: string): GlobalRange
```
Selects entire block content when user triple-clicks.

### Shift+End Selection
```typescript
handleShiftEndSelection(currentOffset: number): GlobalRange
```
Extends selection to end of current line/block.

### Shift+Home Selection
```typescript
handleShiftHomeSelection(currentOffset: number): GlobalRange
```
Extends selection to start of current line/block.

## Integration Points

### 1. With DocumentModel
- Uses document blocks for offset calculations
- Synchronizes with document structure changes

### 2. With Editor Component
- Receives container element on initialization
- Updates index when DOM changes
- Provides selection conversion for all operations

### 3. With Input Handler
- Converts selections before text operations
- Maintains selection after document changes
- Handles IME and composition events

## Performance Considerations

### 1. Index Building
- O(n) where n is number of text nodes
- Only rebuilds when DOM structure changes
- Incremental updates for minor changes

### 2. Lookup Operations
- O(1) node to offset lookup via Map
- O(m) offset to node where m is nodes in block
- Optimized for common selection patterns

### 3. Memory Usage
- Stores mapping for each text node
- Minimal overhead per node (~40 bytes)
- Cleans up on container change

## Usage Examples

### Basic Selection Conversion
```typescript
const mapper = new SelectionOffsetMapper(document);
mapper.setContainer(editorElement);

// Convert current selection to global range
const selection = window.getSelection();
const range = mapper.selectionToGlobalRange(selection);
console.log(`Selected: [${range.start}, ${range.end}]`);

// Convert range back to selection
const selectionInfo = mapper.globalRangeToSelection(range);
// Apply selection...
```

### Handling Document Changes
```typescript
// After DOM updates
mapper.updateIndex();

// Or set new container
mapper.setContainer(newEditorElement);
```

## Testing Strategy

### Unit Tests
- Test each edge case independently
- Mock DOM structures for consistency
- Verify round-trip conversions

### Integration Tests
- Test with real editor DOM
- Verify with various content types
- Test selection operations (triple-click, etc.)

### Visual Tests
- Interactive HTML test page
- Manual verification of selections
- Performance testing with large documents

## Future Enhancements

1. **Incremental Index Updates**
   - Track DOM mutations
   - Update only affected nodes
   - Improve performance for large documents

2. **Multi-Line Selection Support**
   - Handle wrapped text within blocks
   - Line-based selection operations
   - Visual line vs logical line handling

3. **Virtual Scrolling Integration**
   - Handle partially rendered content
   - Maintain selections during scroll
   - Efficient index management

4. **Selection History**
   - Track selection changes
   - Implement selection undo/redo
   - Smart selection expansion