# Stage 6.3 - Performance Budget Tests

## Overview

This stage implements comprehensive performance testing for the EditorV2 component, including:
- Lighthouse CI configuration for automated performance testing
- Playwright-based performance budget tests
- Real-time performance monitoring dashboard
- Manual performance testing tools
- CI/CD integration for automated performance regression detection

## Performance Budgets

The following performance budgets have been defined:

| Metric | Budget | Description |
|--------|--------|-------------|
| FPS | ≥ 55 | Minimum frame rate on emulated Moto G4 |
| TTI | < 2s | Time to Interactive |
| CLS | < 0.1 | Cumulative Layout Shift |
| FID | < 100ms | First Input Delay |
| LCP | < 2.5s | Largest Contentful Paint |
| TBT | < 300ms | Total Blocking Time |

## Implementation

### 1. Lighthouse CI Configuration

**File**: `/workspace/lighthouserc.json`

Configured to:
- Test on emulated Moto G4 device
- Run 5 test iterations for consistency
- Enforce performance budgets with CI failures
- Test multiple URLs including performance test page

### 2. Performance Budget Tests

**File**: `/workspace/e2e/performance-budget.spec.ts`

Comprehensive Playwright tests covering:
- Initial load with empty document
- Load with various document sizes (10KB, 100KB, 1MB)
- Rapid typing at 100 WPM
- Format operations during typing
- Scroll performance with large documents
- Memory usage stability
- First Input Delay measurements
- Window resize performance

### 3. Performance Monitoring Dashboard

**File**: `/workspace/src/components/PerformanceMonitor.tsx`

Real-time monitoring of:
- Frame rate (FPS)
- Memory usage
- Input latency
- DOM node count
- Document size
- Performance warnings when budgets exceeded

### 4. Manual Performance Testing Suite

**Files**:
- `/workspace/src/editor-v2/test/performance-test-suite.ts`
- `/workspace/src/editor-v2/test/EnhancedPerformanceTestEditor.tsx`

Provides:
- Automated test scenarios
- Performance metric collection
- Test result reporting
- JSON export functionality

### 5. CI/CD Integration

**File**: `/workspace/.github/workflows/performance-tests.yml`

GitHub Actions workflow that:
- Runs Lighthouse CI on every push/PR
- Executes Playwright performance tests
- Detects performance regressions
- Comments on PRs with results
- Stores benchmark results for tracking

## Usage

### Running Performance Tests Locally

```bash
# Run Lighthouse CI
pnpm run test:lighthouse:local

# Run Playwright performance tests
pnpm run test:performance

# Open performance monitoring dashboard
pnpm run perf:monitor
```

### Manual Performance Testing

1. Navigate to `/test-performance` in development mode
2. Use the Enhanced Performance Test Editor to:
   - Run predefined test scenarios
   - Monitor real-time performance metrics
   - Export test results as JSON

### CI/CD Performance Testing

Performance tests run automatically on:
- Every push to main or feature branches
- Every pull request
- Daily scheduled runs at 2 AM UTC

If performance budgets are exceeded, the CI build will fail.

## Test Scenarios

### 1. Empty Document Load
- Tests initial render performance
- Measures TTI and FCP
- Validates no layout shifts

### 2. Document Load Tests
- 10KB: Small document baseline
- 100KB: Typical document size
- 1MB: Large document stress test

### 3. Typing Performance
- 60 WPM: Slow typing
- 100 WPM: Average typing
- 150 WPM: Burst typing

### 4. Scroll Performance
- Smooth scrolling patterns
- Rapid scroll jumps
- Continuous scroll monitoring

### 5. Format Operations
- Bold, italic, underline
- Color changes
- Font size adjustments

## Performance Metrics

### Frame Rate Monitoring
- Real-time FPS tracking
- 60-frame rolling average
- Visual indicators (green/yellow/red)

### Memory Tracking
- JS heap size monitoring
- Memory leak detection
- Growth rate analysis

### Input Latency
- Keystroke to render time
- Event processing overhead
- Queue depth monitoring

## Results Analysis

Performance test results include:
- Average, min, max, and 95th percentile FPS
- Render time statistics
- Memory usage patterns
- Pass/fail status per budget
- Detailed error reporting

## Best Practices

1. **Regular Testing**: Run performance tests before major releases
2. **Baseline Tracking**: Compare results against established baselines
3. **Device Testing**: Test on actual low-end devices when possible
4. **Profile Analysis**: Use Chrome DevTools for detailed profiling
5. **Incremental Optimization**: Address one bottleneck at a time

## Future Improvements

1. Add more device emulation profiles
2. Implement performance budget alerting
3. Create performance regression dashboard
4. Add WebVitals tracking
5. Implement A/B performance testing