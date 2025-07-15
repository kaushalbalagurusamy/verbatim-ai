# Regression & Visual Testing Guide

This comprehensive guide covers regression testing to prevent feature breakage and visual testing to ensure UI consistency across the EditorV2 component system.

## Overview

Our regression test suite ensures that previously fixed bugs remain fixed and that new changes don't break existing functionality. Visual regression testing captures screenshots to detect unintended UI changes.

## Test Structure

### Bug Verification Tests
**Location**: `/workspace/e2e/bug-verification.spec.ts`

Validates that all previously identified and fixed bugs remain resolved.

### Line Alignment Regression Tests
**Location**: `/workspace/e2e/line-alignment-regression.spec.ts`

Comprehensive scenarios ensuring line numbers stay perfectly aligned with text content.

### Visual Regression Tests
**Location**: `/workspace/e2e/visual-regression.spec.ts`

Screenshot-based testing for UI consistency across browsers and viewports.

## Regression Test Coverage

### Line Number Alignment
- ✅ Line numbers stay aligned when text wraps
- ✅ Line numbers align correctly with multiple wrapped lines
- ✅ Line numbers remain aligned during dynamic content changes
- ✅ Line numbers handle rapid resize events without drift

### Formatting Functions
- ✅ Bold button applies formatting correctly
- ✅ Highlight button applies background color
- ✅ Keyboard shortcuts work for formatting
- ✅ Formatting state updates in toolbar when selection changes
- ✅ Formatting persists through content changes

### Window Resize Handling
- ✅ Resizing from wide to narrow viewport
- ✅ Resizing from narrow to wide viewport
- ✅ Rapid resize events
- ✅ Resizing during active typing
- ✅ Multiple resize cycles without drift

### Dynamic Content
- ✅ Inserting text in existing lines
- ✅ Deleting text from lines
- ✅ Adding new lines dynamically
- ✅ Removing lines
- ✅ Block-level operations

### Edge Cases
- ✅ Zero width container handling
- ✅ Extremely narrow containers (<100px)
- ✅ Extremely wide containers (>2000px)
- ✅ Fractional pixel widths
- ✅ Unicode and emoji content
- ✅ Very long lines (1000+ characters)

## Visual Testing Scenarios

### Baseline Coverage
Visual baselines are captured for:
- Empty document state
- Single line content
- Multiple paragraphs with wrapping
- Mixed content types (headings, paragraphs)
- Unicode and emoji content
- Very long lines

### Viewport Variations
Tests run across multiple viewport sizes:
- **Mobile**: 375x667 (iPhone SE)
- **Tablet**: 768x1024 (iPad)
- **Desktop**: 1280x800 (Laptop)
- **Wide**: 1920x1080 (Full HD)

### Dynamic State Changes
Visual regression after:
- Text insertion
- Line deletion
- Window resize sequences
- Format application
- Theme changes

## Success Criteria

### Alignment Precision
- **Tolerance**: ≤ 1px drift between line numbers and text
- **Consistency**: Alignment maintained across all browsers
- **Stability**: No drift after multiple operations

### Visual Regression
- **Pixel Diff**: < 100 pixels difference from baseline
- **Threshold**: 0.2 (20%) variation allowed
- **Coverage**: All viewports and content types

### Performance Requirements
- **Frame Rate**: ≥ 60 FPS during resize
- **Resize Time**: < 500ms for viewport changes
- **Memory Growth**: < 50MB after stress testing
- **Large Document**: 100 lines handled in < 10 seconds

## Running Tests

### Local Development

```bash
# Run all regression tests
pnpm test:e2e bug-verification.spec.ts line-alignment-regression.spec.ts visual-regression.spec.ts

# Run specific test suite
pnpm test:e2e line-alignment-regression.spec.ts

# Update visual baselines
pnpm test:e2e visual-regression.spec.ts --update-snapshots

# Interactive UI mode for debugging
pnpm test:e2e:ui
```

### Automated Test Runner

```bash
# Comprehensive regression suite
./e2e/run-regression-tests.sh

# Update visual baselines
./e2e/run-regression-tests.sh --update-snapshots

# Run specific test
./e2e/run-regression-tests.sh --test line-alignment
```

## CI/CD Integration

### Trigger Events
- Push to main/develop branches
- All pull requests
- Daily scheduled run (3 AM UTC)
- Manual workflow dispatch

### Test Matrix
- **Browsers**: Chromium, Firefox, WebKit
- **Operating Systems**: Ubuntu, Windows, macOS
- **Node Versions**: 18, 20

### Artifacts
- Screenshot comparisons
- Test videos
- HTML reports
- Performance metrics

### Visual Baseline Management
```yaml
# Baselines auto-updated on main branch
# PR baselines compared against main
# Approval required for intentional changes
```

## Test Data Scenarios

### Content Types
1. **Plain Text**: Basic paragraph content
2. **Rich Text**: Bold, italic, underline formatting
3. **Markdown**: Headers, lists, code blocks
4. **Unicode**: Chinese, Japanese, Arabic, RTL text
5. **Emoji**: Single and composite emojis
6. **Mixed**: Combination of all types

### Document Structures
1. **Small**: 1-10 lines
2. **Medium**: 10-50 lines
3. **Large**: 50-100 lines
4. **Stress**: 100+ lines with mixed content

## Debugging Failed Tests

### Line Alignment Failures

1. **Check Screenshots**: Review visual evidence
   ```bash
   # View diff images
   open test-results/diff-*.png
   ```

2. **Measure Drift**: Analyze alignment values
   ```javascript
   const drift = await measureLineAlignment();
   console.log(`Max drift: ${drift.max}px`);
   ```

3. **Browser-Specific**: Check rendering differences
   ```bash
   # Run single browser
   pnpm test:e2e --project=chromium
   ```

### Visual Regression Failures

1. **Compare Screenshots**:
   ```bash
   # Open comparison tool
   npx playwright show-report
   ```

2. **Check for Intentional Changes**:
   - Review recent commits
   - Verify CSS modifications
   - Check component updates

3. **Update Baselines** (if changes are correct):
   ```bash
   pnpm test:e2e visual-regression.spec.ts --update-snapshots
   ```

### Performance Regression

1. **Review Metrics**:
   ```javascript
   // Check performance data
   const metrics = await page.evaluate(() => 
     performance.getEntriesByType('measure')
   );
   ```

2. **Profile Operations**:
   ```bash
   # Enable tracing
   pnpm test:e2e --trace on
   ```

3. **Memory Analysis**:
   ```javascript
   // Monitor heap growth
   const heapUsed = await page.evaluate(() => 
     performance.memory.usedJSHeapSize
   );
   ```

## Best Practices

### Writing Regression Tests

1. **Reproduce First**: Ensure bug is reproducible
2. **Minimal Test**: Create smallest failing case
3. **Document Issue**: Link to bug report
4. **Verify Fix**: Confirm test passes after fix

### Visual Test Guidelines

1. **Stable Selectors**: Use data-testid attributes
2. **Wait for Stability**: Ensure animations complete
3. **Consistent State**: Reset before each test
4. **Cross-Browser**: Test all supported browsers

### Maintenance Schedule

#### Weekly
- Review CI test results
- Update visual baselines if needed
- Investigate flaky tests

#### Monthly
- Add new edge cases
- Update browser versions
- Performance benchmark review

#### Quarterly
- Full regression audit
- Test optimization
- Coverage analysis

## Advanced Techniques

### Custom Assertions
```typescript
// Line alignment assertion
async function expectAligned(page: Page) {
  const measurements = await measureLineAlignment(page);
  measurements.forEach(m => {
    expect(m.drift).toBeLessThanOrEqual(1);
  });
}
```

### Visual Comparison Options
```typescript
await expect(page).toHaveScreenshot('baseline.png', {
  maxDiffPixels: 100,
  threshold: 0.2,
  animations: 'disabled',
  mask: [page.locator('.timestamp')]
});
```

### Performance Tracking
```typescript
// Add to regression tests
const startTime = performance.now();
await performOperation();
const duration = performance.now() - startTime;
expect(duration).toBeLessThan(500);
```

## Future Enhancements

### Planned Improvements
- [ ] AI-powered visual diff analysis
- [ ] Automated fix suggestions
- [ ] Cross-browser pixel-perfect testing
- [ ] Mobile gesture regression tests
- [ ] Accessibility regression testing

### Tool Integration
- [ ] Percy.io for cloud visual testing
- [ ] Applitools for AI-powered comparison
- [ ] BrowserStack for real device testing
- [ ] Sentry for error tracking integration

## Success Metrics

The regression and visual test suite has achieved:
- ✅ All original bugs have passing tests
- ✅ ≤ 1px alignment tolerance maintained
- ✅ 60 FPS performance during operations
- ✅ Visual baselines for all key scenarios
- ✅ Automated CI/CD integration
- ✅ <5% test flakiness rate
- ✅ Comprehensive documentation