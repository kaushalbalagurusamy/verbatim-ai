# EditorV2 Line Alignment Regression Test Coverage

## Overview

This document outlines the comprehensive regression test suite for EditorV2's line alignment functionality. The test suite ensures that line numbers remain perfectly aligned with their corresponding text lines across all scenarios.

## Test Suite Structure

### 1. Bug Verification Tests (`bug-verification.spec.ts`)
Verifies that previously identified bugs have been fixed.

#### Line Number Alignment Tests
- ✅ Line numbers stay aligned when text wraps
- ✅ Line numbers align correctly with multiple wrapped lines
- ✅ Line numbers remain aligned during dynamic content changes
- ✅ Line numbers handle rapid resize events without drift

#### Formatting Function Tests
- ✅ Bold button applies formatting correctly
- ✅ Highlight button applies background color
- ✅ Keyboard shortcuts work for formatting
- ✅ Formatting state updates in toolbar when selection changes
- ✅ Formatting persists through content changes

### 2. Line Alignment Regression Tests (`line-alignment-regression.spec.ts`)
Comprehensive scenarios testing line alignment tolerance ≤ 1px.

#### Basic Scenarios
- Empty document alignment
- Single line alignment
- Multiple paragraphs with wrapping
- Mixed content types (headings, paragraphs)

#### Window Resize Tests
- Resizing from wide to narrow viewport
- Resizing from narrow to wide viewport
- Rapid resize events
- Resizing during active typing
- Multiple resize cycles without drift

#### Dynamic Content Tests
- Inserting text in existing lines
- Deleting text from lines
- Adding new lines dynamically
- Removing lines

#### Edge Cases
- Zero width container handling
- Extremely narrow containers (<100px)
- Extremely wide containers (>2000px)
- Fractional pixel widths
- Unicode and emoji content
- Very long lines (1000+ characters)

#### Performance Tests
- 60 FPS maintained during resize
- Bounded memory usage under stress
- Large document handling (100+ lines)

### 3. Visual Regression Tests (`visual-regression.spec.ts`)
Screenshot-based regression detection.

#### Baseline Scenarios
- Empty document
- Single line
- Multiple paragraphs with wrapping
- Mixed content types
- Unicode and emoji content
- Very long lines

#### Viewport Variations
- Mobile (375x667)
- Tablet (768x1024)
- Desktop (1280x800)
- Wide screen (1920x1080)

#### Dynamic State Changes
- After text insertion
- After line deletion
- After window resize sequence

#### Edge Case Visuals
- Extremely narrow viewport
- Extremely wide viewport
- Many short lines
- Alternating long and short lines

## Success Criteria

### Alignment Precision
- **Tolerance**: ≤ 1px drift between line numbers and text lines
- **Consistency**: Alignment maintained across all browsers
- **Stability**: No drift after multiple operations

### Performance Metrics
- **Frame Rate**: ≥ 60 FPS during resize operations
- **Resize Time**: < 500ms for viewport changes
- **Memory Growth**: < 50MB after stress testing
- **Large Document**: 100 lines handled in < 10 seconds

### Visual Regression
- **Pixel Diff**: < 100 pixels difference from baseline
- **Threshold**: 0.2 (20%) variation allowed
- **Coverage**: All viewports and content types

## Test Execution

### Local Development
```bash
# Run all regression tests
pnpm test:e2e bug-verification.spec.ts line-alignment-regression.spec.ts visual-regression.spec.ts

# Run specific test suite
pnpm test:e2e line-alignment-regression.spec.ts

# Update visual baselines
pnpm test:e2e visual-regression.spec.ts --update-snapshots

# Run with UI mode for debugging
pnpm test:e2e:ui
```

### Automated Test Runner
```bash
# Run comprehensive regression suite
./e2e/run-regression-tests.sh

# Update visual baselines
./e2e/run-regression-tests.sh --update-snapshots

# Run specific test
./e2e/run-regression-tests.sh --test line-alignment
```

### CI/CD Integration
- **Triggers**: Push to main/develop, PRs, daily schedule
- **Browsers**: Chromium, Firefox, WebKit
- **Artifacts**: Screenshots, videos, HTML reports
- **Visual Baselines**: Auto-updated on main branch

## Test Data Scenarios

### Content Types
1. **Plain Text**: Basic paragraph content
2. **Markdown**: Headers, bold, italic, code
3. **Unicode**: Chinese, Japanese, Arabic, RTL text
4. **Emoji**: Single and multiple emojis
5. **Mixed**: Combination of all types

### Line Lengths
1. **Short**: < 20 characters
2. **Medium**: 20-80 characters
3. **Long**: 80-200 characters
4. **Very Long**: > 200 characters

### Document Sizes
1. **Small**: 1-10 lines
2. **Medium**: 10-50 lines
3. **Large**: 50-100 lines
4. **Stress**: 100+ lines

## Debugging Failed Tests

### Line Alignment Failures
1. Check screenshot artifacts for visual evidence
2. Review `measureLineAlignment()` output for drift values
3. Verify line number CSS hasn't changed
4. Check for browser-specific rendering issues

### Visual Regression Failures
1. Compare actual vs expected screenshots
2. Check for intentional UI changes
3. Verify consistent viewport and DPI settings
4. Update baselines if changes are expected

### Performance Failures
1. Review performance metrics in test output
2. Check for memory leaks in browser DevTools
3. Profile resize operations for bottlenecks
4. Verify no blocking operations on main thread

## Maintenance

### Weekly
- Review CI test results
- Update visual baselines if UI changed
- Check for flaky tests

### Monthly
- Add new edge cases as discovered
- Update performance benchmarks
- Review and optimize slow tests

### Quarterly
- Full regression test audit
- Update browser versions
- Review test coverage metrics

## Future Enhancements

### Planned Coverage
- [ ] Right-to-left (RTL) language support
- [ ] Accessibility testing (screen readers)
- [ ] Mobile touch interactions
- [ ] Print preview alignment
- [ ] Theme switching effects

### Tool Integration
- [ ] Percy.io for cloud visual regression
- [ ] Lighthouse for performance metrics
- [ ] Sentry for error tracking
- [ ] DataDog for performance monitoring

## Exit Conditions Met ✅

1. **Bug Reproduction**: All original bugs now have passing tests
2. **Alignment Tolerance**: ≤ 1px achieved in all scenarios
3. **Performance**: No regressions, 60 FPS maintained
4. **Visual Baselines**: Established for all key scenarios
5. **CI Integration**: Automated testing on every change
6. **Documentation**: Comprehensive coverage documented

The regression test suite provides confidence that line alignment will remain stable as the editor evolves.