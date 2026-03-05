# Performance Testing Guide

## Quick Start

### Running All Performance Tests
```bash
./scripts/run-performance-tests.sh
```

### Individual Test Commands
```bash
# Lighthouse CI tests
pnpm run test:lighthouse:local

# Playwright performance tests
pnpm run test:performance

# Open performance monitor
pnpm run perf:monitor
```

## Performance Budgets

| Metric | Budget | Measurement Method |
|--------|--------|-------------------|
| **Frame Rate** | ≥ 55 FPS | Real-time monitoring on Moto G4 emulation |
| **Time to Interactive** | < 2000ms | Lighthouse measurement |
| **Cumulative Layout Shift** | < 0.1 | Lighthouse measurement |
| **First Input Delay** | < 100ms | Custom measurement in tests |
| **Largest Contentful Paint** | < 2500ms | Lighthouse measurement |
| **Total Blocking Time** | < 300ms | Lighthouse measurement |
| **Memory Growth** | < 50MB | Custom monitoring over test duration |
| **DOM Nodes** | < 1500 | Real-time monitoring |

## Test Scenarios

### 1. Load Performance Tests
- **Empty Document**: Baseline performance measurement
- **10KB Document**: Small document typical use case
- **100KB Document**: Medium document stress test
- **1MB Document**: Large document extreme case

### 2. Interaction Tests
- **Typing Performance**:
  - 60 WPM: Slow typing
  - 100 WPM: Average typing
  - 150 WPM: Burst typing
- **Format Operations**: Bold, italic, colors, etc.
- **Scroll Performance**: Smooth and rapid scrolling

### 3. Stability Tests
- **Memory Leak Detection**: Load/clear cycles
- **Resize Performance**: Window dimension changes
- **Long Session**: Extended usage simulation

## Performance Monitoring Dashboard

Access the dashboard at: `http://localhost:8080/test-performance`

### Dashboard Features
- Real-time FPS monitoring
- Memory usage tracking
- Input latency measurement
- DOM node counting
- Performance warnings
- Test scenario runner
- Results export

## CI/CD Integration

### GitHub Actions Workflow
Performance tests run automatically on:
- Every push to main/feature branches
- Every pull request
- Daily at 2 AM UTC

### Failure Conditions
CI builds fail when:
- FPS drops below 55
- Any Lighthouse metric exceeds budget
- Memory grows more than 50MB
- Tests timeout or crash

## Debugging Performance Issues

### 1. Using Chrome DevTools
```javascript
// Enable FPS meter
Chrome DevTools > Settings > Rendering > FPS meter

// Record performance profile
Performance tab > Record > Reproduce issue > Stop
```

### 2. Using Performance Monitor
1. Open `/test-performance`
2. Enable monitor sidebar
3. Run test scenarios
4. Observe real-time metrics

### 3. Analyzing Test Results
- Check `performance-results/` directory
- Review Lighthouse reports
- Examine Playwright traces
- Export and analyze JSON results

## Best Practices

### 1. Regular Testing
- Run before releases
- Test after major changes
- Monitor trends over time

### 2. Realistic Conditions
- Test on actual devices when possible
- Use production builds
- Test with real-world data

### 3. Incremental Optimization
- Profile first, optimize second
- Focus on biggest bottlenecks
- Measure impact of changes

### 4. Documentation
- Document performance fixes
- Track regression causes
- Maintain optimization log

## Troubleshooting

### Common Issues

**Tests timing out**
- Increase timeout in test config
- Check for infinite loops
- Verify server is running

**Lighthouse failing to start**
- Ensure port 8080 is free
- Check Chrome installation
- Verify build completed

**Performance regressions**
- Compare with previous results
- Check recent code changes
- Profile specific operations

**Memory leaks**
- Use heap snapshots
- Check event listener cleanup
- Verify DOM node removal

## Advanced Usage

### Custom Test Scenarios
```javascript
// Add to performance-test-suite.ts
const customTest = {
  id: 'custom-test',
  name: 'Custom Test',
  run: async (editor, suite) => {
    // Your test implementation
  }
};
```

### Performance Profiling
```javascript
// Use built-in profiler
performance.mark('operation-start');
// ... operation ...
performance.mark('operation-end');
performance.measure('operation', 'operation-start', 'operation-end');
```

### Exporting Results
```javascript
// Get test results as JSON
const results = testSuite.exportResults();
// Process or upload results
```