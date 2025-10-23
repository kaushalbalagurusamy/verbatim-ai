# Virtual Scrolling Advanced Guide

This guide covers performance monitoring, browser-specific optimizations, and troubleshooting for the virtual scrolling system.

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

#### Jumpy Scrolling

**Symptoms**: Scrolling feels choppy or jumps between positions

**Solutions**:
```typescript
// Increase debounce time
editor.config.scrollDebounceMs = 32;

// Check for layout thrashing
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach(entry => {
    if (entry.name.includes('Layout')) {
      console.warn('Layout thrashing detected:', entry);
    }
  });
});
observer.observe({ entryTypes: ['measure'] });

// Verify RAF throttling
let lastFrame = 0;
const checkFrameRate = (timestamp) => {
  const delta = timestamp - lastFrame;
  if (delta > 17) { // More than 16.67ms = dropped frame
    console.warn('Dropped frame:', delta);
  }
  lastFrame = timestamp;
  requestAnimationFrame(checkFrameRate);
};
```

#### Memory Growth

**Symptoms**: Memory usage increases during scrolling

**Solutions**:
```typescript
// Reduce buffer size
editor.config.scrollBufferSize = 10;

// Enable aggressive cleanup
editor.config.cleanupInterval = 5000; // 5 seconds
editor.config.maxCachedBlocks = 50;

// Monitor memory
const checkMemory = () => {
  if (performance.memory) {
    const mb = performance.memory.usedJSHeapSize / 1048576;
    console.log(`Memory: ${mb.toFixed(2)} MB`);
  }
};
setInterval(checkMemory, 1000);
```

#### Line Misalignment

**Symptoms**: Line numbers don't align with content

**Solutions**:
```typescript
// Force consistent line heights
editor.config.forceUniformLineHeight = true;
editor.config.lineHeight = 24; // Fixed pixel height

// Handle zoom levels
const handleZoom = () => {
  const zoom = window.devicePixelRatio;
  editor.config.lineHeight = Math.round(24 * zoom) / zoom;
};
window.addEventListener('resize', handleZoom);

// Test fractional pixels
const testFractionalPixels = () => {
  const heights = [23.5, 24, 24.5];
  heights.forEach(height => {
    editor.config.lineHeight = height;
    console.log(`Testing height ${height}:`, editor.checkAlignment());
  });
};
```

### Performance Checklist

- [ ] Virtual scrolling enabled for documents > 500 lines
- [ ] Buffer size between 10-50 lines based on use case
- [ ] GPU acceleration active (check DevTools Rendering tab)
- [ ] Render caching enabled for static content
- [ ] Performance monitor shows consistent 60 FPS
- [ ] Memory usage plateaus after initial scroll

## Advanced Debugging

### Performance Profiling

Use the built-in profiler for detailed metrics:

```typescript
const profiler = editor.getVirtualScrollProfiler();
profiler.start();

// Perform scrolling operations...

const report = profiler.stop();
console.log('Scroll performance:', report);
```

### Memory Leak Detection

Use the built-in memory leak detector:

```typescript
const detector = editor.getMemoryLeakDetector();
detector.start();

// After scrolling...
const report = detector.analyze();
if (report.heapGrowthRate > 1000000) { // 1MB/sec
  console.warn('Potential memory leak detected');
}
```

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

### Performance Metrics Interface

```typescript
interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  droppedFrames: number;
  memoryUsage: number;
  renderedBlocks: number;
  cachedBlocks: number;
  scrollVelocity: number;
  lastRenderTime: number;
}
```