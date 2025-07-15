# Virtual Scrolling

The Editor V2 implements a sophisticated virtual scrolling system that maintains high performance even with extremely large documents. This guide explains how virtual scrolling works and how to optimize it for your use case.

## Overview

Virtual scrolling renders only the visible portion of a document plus a small buffer, dramatically reducing DOM size and improving performance. The system maintains 60+ FPS scrolling performance even with documents containing hundreds of thousands of lines.

## How It Works

### Rendering Pipeline

The virtual scrolling system follows this pipeline:

1. **Viewport Detection**: Calculate visible area based on scroll position
2. **Line Query**: Use spatial index to find lines in viewport
3. **Virtual Render**: Generate DOM only for visible lines
4. **Spacer Elements**: Create placeholders for off-screen content
5. **Smooth Updates**: Apply transforms for seamless scrolling

### Key Components

```
┌─────────────────────────────┐
│      Spacer (top)           │ ← Placeholder for content above
├─────────────────────────────┤
│      Buffer Zone            │ ← Pre-rendered for smooth scroll
├─────────────────────────────┤
│                             │
│      Visible Viewport       │ ← Actually rendered content
│                             │
├─────────────────────────────┤
│      Buffer Zone            │ ← Pre-rendered for smooth scroll
├─────────────────────────────┤
│      Spacer (bottom)        │ ← Placeholder for content below
└─────────────────────────────┘
```

## Performance Characteristics

### Metrics

With a 100KB document (approximately 2,000 lines):

| Metric | Target | Actual |
|--------|--------|--------|
| Scroll FPS | ≥ 60 | 59.8 |
| Memory Usage | Constant | < 50MB |
| Initial Render | < 100ms | 87ms |
| DOM Nodes | < 200 | ~150 |

### Scaling

Performance remains constant regardless of document size:

- 10 lines: ~60 FPS, 20MB memory
- 1,000 lines: ~60 FPS, 25MB memory
- 100,000 lines: ~60 FPS, 30MB memory

## Usage

### Automatic Activation

Virtual scrolling activates automatically for large documents:

```typescript
<SingleContentEditableEditor
  initialContent={largeDocument}
  // Virtual scrolling enables automatically
  // when content exceeds threshold
/>
```

### Manual Configuration

Control virtual scrolling behavior:

```typescript
<SingleContentEditableEditor
  // Enable/disable virtual scrolling
  enableVirtualScroll={true}
  
  // Line count threshold for activation
  virtualScrollThreshold={500}
  
  // Buffer size (lines above/below viewport)
  scrollBufferSize={20}
  
  // Viewport update debounce
  scrollDebounceMs={16} // ~60 FPS
/>
```

### With Line Numbers

Virtual scrolling maintains perfect line number alignment:

```typescript
<VirtualScrollEditor
  showLineNumbers={true}
  lineNumberWidth={50}
  // Line numbers stay aligned at all zoom levels
/>
```

## Optimization Strategies

### Buffer Size Tuning

Adjust buffer size based on use case:

```typescript
// Fast scrolling - larger buffer
const fastScrollConfig = {
  scrollBufferSize: 50,
  scrollDebounceMs: 8
};

// Memory constrained - smaller buffer
const lowMemoryConfig = {
  scrollBufferSize: 10,
  scrollDebounceMs: 32
};

// Balanced (default)
const balancedConfig = {
  scrollBufferSize: 20,
  scrollDebounceMs: 16
};
```

### Render Caching

Enable aggressive caching for static content:

```typescript
<VirtualScrollEditor
  // Cache rendered blocks
  enableRenderCache={true}
  
  // Cache size (number of blocks)
  renderCacheSize={100}
  
  // Cache TTL (milliseconds)
  renderCacheTTL={5000}
/>
```

### GPU Acceleration

Ensure GPU acceleration is enabled:

```css
.editor-block {
  /* Force GPU acceleration */
  transform: translateZ(0);
  will-change: transform;
  
  /* Optimize paint performance */
  contain: layout style paint;
}
```

## Advanced Features

### Variable Height Lines

Support for dynamic line heights:

```typescript
<VirtualScrollEditor
  // Enable variable height support
  variableLineHeight={true}
  
  // Height calculation function
  calculateLineHeight={(lineNumber, content) => {
    if (content.includes('image')) return 200;
    if (content.startsWith('#')) return 32;
    return 24;
  }}
/>
```

### Smooth Scrolling

Configure smooth scroll behavior:

```typescript
<VirtualScrollEditor
  // Enable smooth scrolling
  smoothScroll={true}
  
  // Scroll physics
  scrollAcceleration={1.2}
  scrollFriction={0.92}
  
  // Snap to line boundaries
  snapToLines={true}
/>
```

### Predictive Rendering

Pre-render content based on scroll direction:

```typescript
<VirtualScrollEditor
  // Enable predictive rendering
  predictiveRender={true}
  
  // Prediction distance (viewport heights)
  predictionDistance={0.5}
  
  // Max prediction queue
  maxPredictionQueue={50}
/>
```

For performance monitoring, browser optimization, and troubleshooting, see [Virtual Scrolling Advanced Guide](./virtual-scrolling-advanced.md).