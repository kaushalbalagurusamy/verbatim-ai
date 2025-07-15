# Performance Testing & Benchmarks

This guide covers the comprehensive performance testing infrastructure for EditorV2, including automated benchmarks, real-time monitoring, and regression detection.

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

## Quick Start

### Running All Performance Tests
```bash
# Comprehensive performance test suite
./scripts/run-performance-tests.sh

# Individual test types
pnpm run test:lighthouse:local    # Lighthouse CI tests
pnpm run test:performance         # Playwright performance tests
pnpm run perf:monitor            # Open performance dashboard
```

## Test Infrastructure

### 1. Lighthouse CI
**Config**: `/workspace/lighthouserc.json`

- Emulated Moto G4 device testing
- 5 test iterations for consistency
- Automated budget enforcement
- Multiple URL testing support

### 2. Playwright Performance Tests
**Location**: `/workspace/e2e/performance-budget.spec.ts`

Comprehensive browser-based testing:
- Document load performance
- Typing and interaction speed
- Memory usage tracking
- Scroll performance
- Resize handling

### 3. Performance Monitor Dashboard
**Component**: `/workspace/src/components/PerformanceMonitor.tsx`

Real-time metrics display:
- FPS indicator with color coding
- Memory usage graphs
- Input latency tracking
- DOM node counting
- Performance warnings

### 4. Manual Test Suite
**Files**:
- `/workspace/src/editor-v2/test/performance-test-suite.ts`
- `/workspace/src/editor-v2/test/EnhancedPerformanceTestEditor.tsx`

Interactive testing capabilities:
- Scenario automation
- Metric collection
- Result export (JSON)
- Visual feedback

## Test Scenarios

### Load Performance Tests

#### Empty Document
- Baseline performance measurement
- Initial render timing
- Framework overhead assessment

#### Document Size Variations
- **10KB**: Small document (typical email)
- **100KB**: Medium document (typical article)
- **1MB**: Large document (book chapter)
- **10MB**: Stress test (full book)

### Interaction Performance

#### Typing Tests
```javascript
// Test configurations
const typingSpeeds = {
  slow: 60,      // WPM - Hunt and peck
  average: 100,  // WPM - Regular typing
  fast: 150,     // WPM - Burst typing
  stress: 200    // WPM - Maximum speed
};
```

#### Format Operations
- Single format toggle (bold, italic)
- Multiple format combinations
- Full document formatting
- Format removal operations

#### Scroll Performance
- Smooth scroll (reading pace)
- Rapid scroll (navigation)
- Jump to top/bottom
- Page up/down operations

### Stability Tests

#### Memory Leak Detection
```javascript
// Load/clear cycles test
for (let i = 0; i < 100; i++) {
  await loadDocument(largeDoc);
  await clearDocument();
  await measureMemory();
}
```

#### Long Session Simulation
- Extended usage patterns
- Continuous editing for 30+ minutes
- Memory growth tracking
- Performance degradation check

## Performance Monitoring

### Dashboard Access
Navigate to: `http://localhost:8080/test-performance`

### Dashboard Features

#### Real-time Metrics
- **FPS Meter**: Current, average, and minimum FPS
- **Memory Graph**: Heap usage over time
- **Latency Display**: Input to render timing
- **DOM Counter**: Active node tracking

#### Test Runner
- Automated scenario execution
- Side-by-side metric comparison
- Performance regression detection
- Export capabilities

#### Visual Indicators
- 🟢 Green: Performance within budget
- 🟡 Yellow: Approaching limits (80%)
- 🔴 Red: Budget exceeded

## CI/CD Integration

### GitHub Actions Workflow
**File**: `/workspace/.github/workflows/performance-tests.yml`

#### Trigger Conditions
- Every push to main/feature branches
- All pull requests
- Daily scheduled run (2 AM UTC)
- Manual workflow dispatch

#### Failure Conditions
- FPS drops below 55
- Any Lighthouse metric exceeds budget
- Memory growth >50MB
- Test timeout or crash

### Results Reporting
```yaml
# PR comment format
Performance Test Results:
- FPS: 58 (✅ target: ≥55)
- TTI: 1.8s (✅ target: <2s)
- Memory: +32MB (✅ target: <50MB)
```

## Debugging Performance Issues

### Using Chrome DevTools

#### Performance Recording
```javascript
// Enable in console
Chrome DevTools > Performance > Record
// Reproduce issue
// Stop recording and analyze
```

#### Key Metrics to Check
- Main thread blocking
- Layout thrashing
- Forced reflows
- Memory allocation patterns

### Performance Monitor Usage

1. Open `/test-performance`
2. Enable monitor sidebar
3. Run problematic scenario
4. Observe real-time metrics
5. Export data for analysis

### Analyzing Results

#### Check Artifacts
```bash
# Performance results location
ls -la performance-results/

# View Lighthouse reports
open performance-results/lighthouse-report.html

# Examine Playwright traces
npx playwright show-trace trace.zip
```

## Best Practices

### Regular Testing
- Before major releases
- After significant changes
- Weekly performance runs
- Trend monitoring

### Realistic Conditions
- Test on actual devices
- Use production builds
- Real-world data sets
- Network throttling

### Incremental Optimization
1. Profile first
2. Identify bottlenecks
3. Make targeted fixes
4. Measure impact
5. Document changes

### Performance Log
```markdown
# Performance Optimization Log
## Date: YYYY-MM-DD
### Issue: Slow typing on large documents
### Root Cause: Inefficient DOM updates
### Fix: Implemented virtual scrolling
### Impact: 45% improvement in FPS
```

## Troubleshooting

### Common Issues

#### Tests Timing Out
```bash
# Increase timeout
TIMEOUT=30000 pnpm test:performance

# Check server status
lsof -i :8080
```

#### Lighthouse Failures
```bash
# Verify Chrome installation
google-chrome --version

# Check port availability
netstat -an | grep 8080

# Run with debugging
DEBUG=lighthouse:* pnpm test:lighthouse:local
```

#### Memory Leaks
```javascript
// Use heap snapshots
performance.measureUserAgentSpecificMemory()
  .then(result => console.log(result));

// Check event listeners
getEventListeners(document);
```

## Advanced Usage

### Custom Test Scenarios
```typescript
// Add to performance-test-suite.ts
const customScenario = {
  id: 'custom-complex-edit',
  name: 'Complex Editing Pattern',
  run: async (editor, monitor) => {
    monitor.startMeasure('complex-edit');
    
    // Your test implementation
    await editor.bulkInsert(largeText);
    await editor.applyFormatting();
    await editor.scrollToBottom();
    
    const metrics = monitor.endMeasure('complex-edit');
    return metrics;
  }
};
```

### Performance Profiling API
```javascript
// Mark operations
performance.mark('operation-start');
// ... perform operation ...
performance.mark('operation-end');

// Measure duration
performance.measure(
  'operation-duration',
  'operation-start',
  'operation-end'
);

// Get results
const measures = performance.getEntriesByType('measure');
```

### Exporting Results
```javascript
// Get comprehensive results
const results = {
  timestamp: Date.now(),
  metrics: testSuite.getMetrics(),
  budgets: testSuite.getBudgetStatus(),
  traces: testSuite.getTraces()
};

// Export as JSON
downloadJSON(results, 'performance-results.json');
```

## Future Roadmap

1. **WebVitals Integration**: Core Web Vitals tracking
2. **Synthetic Monitoring**: Automated performance checks
3. **Regression Dashboard**: Historical trend analysis
4. **Mobile Lab**: Real device testing farm
5. **AI-Powered Analysis**: Automatic bottleneck detection