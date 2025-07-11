# Stage 3.4 - DOM Decorator for Formatting

## Overview

Stage 3.4 implements a DOM decorator service that manages visual formatting for the editor. The decorator efficiently wraps formatted text with `<span>` elements while supporting span recycling, nested formatting, and iOS plaintext-only mode via shadow DOM.

## Implementation Details

### DOMDecoratorService (`src/editor-v2/services/dom-decorator.ts`)

The core service provides:

1. **Span Management**
   - Efficient span pooling and recycling
   - Tracks span usage to minimize DOM operations
   - Automatically releases unused spans after render

2. **Formatting Support**
   - Bold: `<span class="fmt-bold">`
   - Highlight: `<span class="fmt-highlight fmt-highlight-{color}">`
   - Minimize: `<span class="fmt-minimize">`
   - Nested formatting with proper priority (minimize > highlight > bold)

3. **HTML Paste Normalization**
   - Parses pasted HTML content
   - Extracts bold and highlight formatting
   - Converts to clean text + formatting ranges
   - Preserves formatting during paste operations

4. **iOS Shadow DOM Support**
   - Optional shadow DOM mode for iOS plaintext-only restrictions
   - Encapsulates formatting styles within shadow root
   - Maintains visual formatting while respecting platform constraints

### Integration Points

1. **Editor Component Updates**
   - Added `decoratorRef` to manage decorator instance
   - Updated `renderContent` to use decorator for block rendering
   - Integrated decorator with input handler for paste operations
   - Releases unused spans after each render cycle

2. **Input Handler Integration**
   - Enhanced paste handler to support HTML formatting
   - Normalizes HTML through decorator before insertion
   - Applies extracted formatting to document model

3. **CSS Styling**
   - Defined visual styles for all formatting types
   - Supports nested formatting combinations
   - Optimized for both light and dark themes
   - Print-friendly styles included

## Key Features

### 1. Efficient Span Recycling
```javascript
// Spans are pooled and reused
private spanPool: Map<string, FormattingSpan> = new Map();
private recycledSpans: HTMLSpanElement[] = [];

// After render, unused spans are released
releaseUnusedSpans(): void {
  // Move unused spans to recycled pool
  // Limit pool size to prevent memory growth
}
```

### 2. Nested Formatting Support
```javascript
// Formats are sorted by priority and nested properly
private createNestedSpan(text: string, formats: TextFormatting[]): HTMLSpanElement {
  // Creates properly nested structure:
  // <span class="fmt-minimize">
  //   <span class="fmt-highlight">
  //     <span class="fmt-bold">text</span>
  //   </span>
  // </span>
}
```

### 3. HTML Paste Normalization
```javascript
normalizeHTML(html: string): { text: string; formatting: TextFormatting[] } {
  // Parses HTML and extracts:
  // - Bold from <b>, <strong>, font-weight styles
  // - Highlights from <mark>, background-color styles
  // - Returns clean text + formatting ranges
}
```

### 4. Shadow DOM for iOS
```javascript
// For iOS plaintext-only mode
if (options.useShadowDOM && container.attachShadow) {
  this.shadowRoot = container.attachShadow({ mode: 'open' });
  this.injectStyles(); // Styles encapsulated in shadow
}
```

## Performance Optimizations

1. **Span Pooling**: Reuses DOM elements instead of creating/destroying
2. **Batch Updates**: Processes all formatting in a single pass
3. **Minimal DOM Operations**: Only updates changed portions
4. **Memory Management**: Limits recycled span pool size

## Testing

Created comprehensive test page (`src/editor-v2/test/dom-decorator-test.html`) demonstrating:
- Basic formatting application
- Nested formatting combinations
- HTML paste normalization
- Shadow DOM mode toggle
- Performance testing with 1000+ formats

## Future Enhancements

1. **Additional Format Types**
   - Italic support (structure already in place)
   - Underline, strikethrough
   - Custom text colors

2. **Advanced Features**
   - Format painter tool
   - Format preservation during cut/copy
   - Collaborative formatting conflicts

3. **Optimizations**
   - Virtual DOM diffing for large documents
   - Web Worker formatting calculations
   - Incremental rendering for long blocks

## Code Quality

- Fully typed with TypeScript
- Comprehensive JSDoc documentation
- Follows project coding standards
- Modular design for easy extension