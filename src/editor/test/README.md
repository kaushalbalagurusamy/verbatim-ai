# Virtual Scrolling Performance Tests

## Overview

This directory contains performance tests for the virtual scrolling implementation in EditorV2. The tests verify that scrolling maintains 60 FPS on mid-tier hardware with large documents.

## Running Performance Tests

### Manual Testing

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Navigate to the performance test page:
   ```
   http://localhost:8080/test/performance
   ```

3. Use the UI to:
   - Select document size (10KB, 100KB, 500KB, 1MB)
   - Generate test document
   - Run automated scroll test
   - Monitor real-time FPS and memory usage

### Automated Tests (Playwright)

1. Install Playwright dependencies:
   ```bash
   pnpm add -D @playwright/test
   npx playwright install
   ```

2. Run the virtual scrolling tests:
   ```bash
   npx playwright test virtual-scroll.spec.ts
   ```

3. Run with UI mode for debugging:
   ```bash
   npx playwright test virtual-scroll.spec.ts --ui
   ```

## Performance Metrics

### Success Criteria

- **Scroll FPS**: ≥ 60 FPS average during scroll
- **Min FPS**: ≥ 30 FPS (no severe drops)
- **Dropped Frames**: < 5% of total frames
- **Memory Usage**: Constant regardless of document size
- **Line Alignment**: Pixel-perfect at 50-200% zoom

### Test Scenarios

1. **Large Document Scrolling**: 100KB document smooth scroll
2. **Rapid Scrolling**: Jump scrolling without layout thrashing
3. **Zoom Level Alignment**: Line numbers stay aligned at all zoom levels
4. **Memory Management**: No memory leaks during extended use
5. **Edge Cases**: Empty, single line, rapid content changes

## Performance Monitor

The performance monitor tracks:
- Real-time FPS during scrolling
- Frame time and dropped frames
- Memory usage over time
- Scroll performance history

### Accessing Metrics

```javascript
// In browser console during testing
window.__PERF_METRICS = scrollTrackerRef.current.getMetrics();
console.log(window.__PERF_METRICS);
```

## Troubleshooting

### Low FPS Issues

1. Check browser dev tools Performance tab
2. Look for long tasks during scroll
3. Verify GPU acceleration is enabled
4. Check for excessive DOM operations

### Alignment Issues

1. Test at different zoom levels
2. Check line height calculations
3. Verify transform3d values
4. Test with different fonts/sizes

### Memory Leaks

1. Take heap snapshots before/after scrolling
2. Check for detached DOM nodes
3. Verify observer cleanup
4. Monitor render cache size

## Browser Compatibility

Tested on:
- Chrome 120+ (primary target)
- Firefox 120+
- Safari 17+
- Edge 120+

## Hardware Requirements

Minimum for 60 FPS:
- Intel i5 or equivalent
- 8GB RAM
- Integrated graphics or better
- SSD recommended

## Contributing

When modifying virtual scrolling:
1. Run performance tests before/after changes
2. Document any performance impact
3. Update tests if behavior changes
4. Test on mid-tier hardware