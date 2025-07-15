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

## Monitoring Performance

### Built-in Performance Monitor

Enable real-time performance metrics:

```typescript
<VirtualScrollEditor
  showPerformanceMonitor={true}
  performanceMonitorPosition="top-right"
/>
```

### Programmatic Access

Monitor performance programmatically:

```typescript
const editor = editorRef.current;

// Get performance metrics
const metrics = editor.getPerformanceMetrics();
console.log('FPS:', metrics.fps);
console.log('Memory:', metrics.memoryUsage);
console.log('Render time:', metrics.lastRenderTime);

// Subscribe to performance updates
editor.onPerformanceUpdate((metrics) => {
  if (metrics.fps < 30) {
    console.warn('Performance degraded:', metrics);
  }
});
```

### Debug Mode

Enable detailed logging:

```typescript
// In browser console
window.VIRTUAL_SCROLL_DEBUG = true;

// Or via prop
<VirtualScrollEditor debug={true} />
```

## Browser Optimization

### Chrome/Edge

```typescript
// Chrome-specific optimizations
const chromeConfig = {
  enableRenderCache: true,
  usePassiveScrollListeners: true,
  enableGPUAcceleration: true
};
```

### Firefox

```typescript
// Firefox-specific optimizations
const firefoxConfig = {
  scrollDebounceMs: 20, // Firefox needs slightly more debounce
  enableSmoothScroll: false, // Use native smooth scroll
};
```

### Safari

```typescript
// Safari-specific optimizations
const safariConfig = {
  enableMomentumScrolling: true,
  use3DTransforms: true,
  disableRenderCache: true // Safari has native caching
};
```

## Troubleshooting

### Common Issues

1. **Jumpy Scrolling**
   - Increase `scrollDebounceMs`
   - Check for layout thrashing
   - Verify RAF throttling

2. **Memory Growth**
   - Reduce `scrollBufferSize`
   - Enable render cache cleanup
   - Check for memory leaks

3. **Line Misalignment**
   - Verify consistent line heights
   - Check zoom level handling
   - Test fractional pixel values

### Performance Checklist

- [ ] Virtual scrolling enabled for large documents
- [ ] Buffer size appropriate for use case
- [ ] GPU acceleration active
- [ ] Render caching configured
- [ ] Performance monitor shows 60 FPS
- [ ] Memory usage remains constant

## Best Practices

1. **Start Conservative**: Use default settings initially
2. **Monitor Metrics**: Watch FPS and memory usage
3. **Test Scenarios**: Verify with rapid scrolling
4. **Browser Testing**: Check all target browsers
5. **User Feedback**: Adjust based on real usage

## API Reference

### VirtualScrollEditor Props

```typescript
interface VirtualScrollProps {
  // Core settings
  enableVirtualScroll?: boolean;
  virtualScrollThreshold?: number;
  scrollBufferSize?: number;
  
  // Performance
  scrollDebounceMs?: number;
  enableRenderCache?: boolean;
  renderCacheSize?: number;
  
  // Features
  variableLineHeight?: boolean;
  smoothScroll?: boolean;
  predictiveRender?: boolean;
  
  // Monitoring
  showPerformanceMonitor?: boolean;
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
  
  // Debug
  debug?: boolean;
}
```