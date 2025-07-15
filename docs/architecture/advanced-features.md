# Advanced EditorV2 Features

## Selection-Offset Mapping

### The Challenge

Browser selections use DOM-relative coordinates, but our DocumentModel uses global offsets. We need bidirectional conversion between these coordinate systems.

### SelectionOffsetMapper

The mapper maintains a reverse index of all text nodes:

```typescript
interface NodeMapping {
  node: Node;              // The text node
  blockId: string;         // ID of containing block
  localOffset: number;     // Offset within the block
  globalOffset: number;    // Global document offset
  length: number;          // Length of text in this node
}
```

### Why This Matters

1. **Formatted text** splits into multiple DOM nodes
2. **Virtual scrolling** means not all blocks are in DOM
3. **Block boundaries** need special handling
4. **Empty blocks** have no text nodes

### Conversion Process

```typescript
// DOM Selection → Global Range
1. Find text node in reverse index
2. Calculate: globalOffset = mapping.globalOffset + nodeOffset
3. Handle backward selections (normalize)

// Global Range → DOM Selection
1. Find block containing offset
2. Find text node at local offset
3. Return DOM node + offset within node
```

### Special Operations

- **Triple-click**: Select entire block
- **Shift+Home/End**: Extend to line boundaries
- **Cross-block selection**: Handle block boundaries correctly

## Virtual Scrolling

### Why Virtual Scrolling?

Large documents (100KB+) create performance issues:
- **Thousands of DOM nodes** slow down rendering
- **Memory usage** grows linearly with content
- **Scrolling stutters** with complex formatting

### Architecture

```
┌─────────────────────────┐
│   Viewport (visible)    │ ← Only these blocks in DOM
├─────────────────────────┤
│   Buffer Zone (top)     │ ← Pre-rendered for smooth scroll
├─────────────────────────┤
│   Off-screen (top)      │ ← Spacer element only
├─────────────────────────┤
│   ...                   │
├─────────────────────────┤
│   Off-screen (bottom)   │ ← Spacer element only
└─────────────────────────┘
```

### Key Components

1. **VirtualRenderer**: Renders only visible blocks
2. **LineRegistry**: Spatial index for O(log n) lookups
3. **IntersectionObserver**: Removes far off-screen content

### Performance Characteristics

- **60+ FPS scrolling** with 10,000+ blocks
- **Constant memory usage** regardless of document size
- **Sub-millisecond** viewport calculations

## Undo/Redo Implementation

### Architecture

Uses the DocumentDiffEmitter to track changes:

```typescript
class UndoRedoManager {
  private history: HistoryEntry[] = [];
  private currentIndex: number = -1;
  
  record(operation: Operation): void {
    // Truncate history after current position
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // Add new entry
    this.history.push({
      operation,
      inverse: this.createInverse(operation),
      timestamp: Date.now()
    });
    
    this.currentIndex++;
  }
}
```

### Operation Inversion

Each operation has an inverse:
- `insertText` → `deleteText`
- `deleteText` → `insertText`  
- `addFormatting` → `removeFormatting`
- `splitBlock` → `mergeBlocks`

### Batching Strategy

Group related operations:
- Continuous typing within 500ms
- Format changes to same range
- Related block operations

## Performance Optimizations

### Render Caching

Cache rendered HTML for unchanged blocks:

```typescript
interface RenderCache {
  blockId: string;
  content: string;
  formatting: TextFormatting[];
  html: string;
}
```

### Differential Updates

Only update what changed:
1. Track dirty blocks during operations
2. Re-render only dirty blocks
3. Reuse DOM nodes when possible

### Web Worker Integration

Offload heavy computations:
- Text diffing for large pastes
- Format conflict resolution
- Search indexing

## Accessibility Features

### Comprehensive ARIA Implementation

EditorV2 achieves WCAG AA compliance through careful ARIA implementation:

#### Editor ARIA
```html
<div 
  role="textbox"
  aria-multiline="true"
  aria-label="Document editor"
  aria-describedby="editor-instructions"
  aria-placeholder="Start typing..."
>
```

#### Toolbar ARIA
```html
<div role="toolbar" aria-orientation="horizontal">
  <button 
    aria-label="Bold (Ctrl+B)"
    aria-pressed="false"
    aria-keyshortcuts="Ctrl+B"
  >
  <button
    aria-label="Block type"
    aria-haspopup="menu"
    aria-expanded="false"
  >
</div>
```

### Screen Reader Announcements

Live regions provide real-time feedback:

```typescript
// Polite announcements for formatting
<div role="status" aria-live="polite" aria-atomic="true">
  Bold applied to selection
</div>

// Assertive for critical changes
<div role="alert" aria-live="assertive">
  Maximum file size exceeded
</div>
```

### Keyboard Navigation

Full keyboard support with no mouse traps:

| Action | Shortcut | Description |
|--------|----------|-------------|
| Bold | Ctrl+B | Toggle bold formatting |
| Undo | Ctrl+Z | Undo last operation |
| Block navigation | Ctrl+↑/↓ | Jump between blocks |
| Select all in block | Triple-click | Select entire block |
| Extend selection | Shift+arrows | Character/line selection |
| Block types | Ctrl+Alt+1-6 | Change to heading/paragraph |

### Focus Management

Intelligent focus preservation across operations:

```typescript
class FocusManager {
  private lastFocus: WeakRef<HTMLElement> | null = null;
  
  saveFocus(): void {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      this.lastFocus = new WeakRef(active);
    }
  }
  
  restoreFocus(): void {
    const element = this.lastFocus?.deref();
    if (element && document.contains(element)) {
      element.focus();
    }
  }
}
```

### High Contrast Support

Automatic adaptation to system preferences:

```css
@media (prefers-contrast: high) {
  .editor {
    --text-color: #000;
    --bg-color: #fff;
    --border-width: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Platform-Specific Features

### iOS Plaintext Mode

iOS sometimes requires plaintext-only contentEditable. Shadow DOM provides a workaround:

```typescript
if (iOS && plaintextOnly) {
  const shadow = container.attachShadow({ mode: 'open' });
  // Full formatting inside shadow
  // iOS sees plaintext on host
}
```

### Touch Gesture Support

Handle touch-specific interactions:
- Long press for selection
- Two-finger scroll for zoom
- Swipe gestures for undo/redo

### Browser Workarounds

Each browser has quirks we handle:
- **Safari**: Selection restoration timing
- **Firefox**: Composition event differences
- **Chrome**: Clipboard API variations

## Collaborative Editing Foundation

### Operational Transformation Ready

The architecture supports OT:
1. All edits are atomic operations
2. Operations have deterministic effects
3. Diff emitter tracks all changes
4. Operations can be transformed

### Conflict Resolution

When operations conflict:
```typescript
// User A: Insert "Hello" at position 5
// User B: Delete positions 3-7

// Transform A's operation against B's
// Result: Insert "Hello" at position 3
```

### Future: CRDT Support

The block-based structure maps well to CRDTs:
- Each block has unique ID
- Operations are commutative
- Formatting uses ranges

## Testing Infrastructure

### Property-Based Testing

Test invariants with random operations:
```typescript
test('document length matches content', () => {
  const ops = generateRandomOperations(100);
  const doc = applyOperations(emptyDoc, ops);
  
  expect(doc.getTotalLength()).toBe(
    doc.blocks.reduce((sum, b) => sum + b.content.length, 0)
  );
});
```

### Fuzzing

Test edge cases with malformed input:
- Invalid UTF-16 sequences
- Overlapping formatting
- Out-of-bounds offsets
- Rapid operation sequences

### Performance Benchmarks

Track performance regressions:
- Time to render 10,000 blocks
- Memory usage over time
- Input latency measurements
- Scroll performance metrics