# EditorV2 Visual Regression Test Scenarios

## Overview

This document details the visual regression test scenarios implemented in the EditorV2 test suite. These tests ensure pixel-perfect rendering consistency across different browsers and viewports.

## Visual Test Architecture

### Screenshot Comparison Strategy
- **Tool**: Playwright's built-in screenshot comparison
- **Tolerance**: Maximum 100 pixels difference
- **Threshold**: 0.2 (20% variation allowed)
- **Storage**: Baseline images in `e2e/visual-regression.spec.ts-snapshots/`

## Core Visual Test Scenarios

### 1. Empty Document Baseline
**File**: `baseline-empty-document.png`

Tests the editor in its initial state:
- Line number "1" visible
- Cursor positioned at start
- Clean editor background
- Proper gutter spacing

### 2. Single Line Baseline
**File**: `baseline-single-line.png`

Validates single line rendering:
- Text: "Single line of text"
- Line number alignment
- Proper font rendering
- Cursor positioning

### 3. Multiple Paragraphs with Wrapping
**File**: `baseline-multiple-paragraphs.png`

Complex layout validation:
```
First paragraph with normal text.
Second paragraph that contains significantly more text and will 
definitely wrap when displayed in a narrow viewport, testing the 
line number alignment.
Third paragraph is short.
Fourth paragraph also has a substantial amount of text to ensure 
we test multiple wrapped lines in the editor view.
Fifth paragraph ends the test.
```

Key validation points:
- Line wrapping behavior
- Line number alignment with wrapped lines
- Paragraph spacing
- Consistent indentation

### 4. Mixed Content Types
**File**: `baseline-mixed-content.png`

Tests various content formatting:
```markdown
# Main Heading
Regular paragraph text here.
## Subheading
Another paragraph with **bold** and *italic* text.
### Smaller Heading
Final paragraph with `inline code`.
```

Validates:
- Heading sizes and spacing
- Bold/italic rendering
- Inline code styling
- Line height consistency

### 5. Unicode and Emoji Content
**File**: `baseline-unicode-emoji.png`

International character support:
```
🎉 Welcome! 🚀
Testing with émojis and spéciål characters ñ.
中文测试 Japanese テスト
Mixed: Hello 世界 🌍
🔥🔥🔥 Multiple emojis in a row 🔥🔥🔥
```

Tests:
- Emoji rendering and spacing
- Unicode character support
- Mixed script rendering
- Character alignment

### 6. Very Long Lines
**File**: `baseline-very-long-lines.png`

Edge case for line wrapping:
- 1000+ character lines
- Multiple wrap points
- Performance under stress
- Horizontal scrolling behavior

## Viewport-Specific Tests

### Mobile Viewport (375×667)
Tests responsive behavior:
- Narrow container handling
- Touch-friendly spacing
- Mobile-optimized rendering

### Tablet Viewport (768×1024)
Medium-size validation:
- Balanced layout
- Readable line lengths
- Proper scaling

### Desktop Viewport (1280×800)
Standard desktop experience:
- Full feature visibility
- Optimal reading width
- Multi-column potential

### Wide Screen (1920×1080)
Large display optimization:
- Maximum content width
- Side panel visibility
- Extended workspace

## Dynamic State Visual Tests

### After Text Insertion
**Scenario**: Insert text at various positions
- Beginning of line
- Middle of line
- End of line
- New line creation

### After Line Deletion
**Scenario**: Remove lines and verify layout
- Single line deletion
- Multiple line selection
- Paragraph removal
- Empty document state

### After Resize Sequence
**Scenario**: Window resize effects
1. Start at 1200px width
2. Resize to 600px
3. Resize to 400px
4. Return to 1200px
5. Verify no visual artifacts

## Edge Case Visual Tests

### Extremely Narrow Viewport (<300px)
- Minimum viable width
- Aggressive line wrapping
- UI element stacking

### Extremely Wide Viewport (>2000px)
- Maximum line length
- Centered content
- Margin behavior

### Many Short Lines
```
Line 1
Line 2
Line 3
...
Line 100
```
- Scrolling performance
- Line number width
- Consistent spacing

### Alternating Long/Short Lines
```
Short line
This is a very long line that will definitely wrap multiple times
Short again
Another extremely long line with lots of content to test wrapping
End
```
- Mixed layout handling
- Wrap transition points
- Visual rhythm

## Visual Regression Detection

### What We're Looking For

1. **Alignment Issues**
   - Line numbers drifting from text
   - Uneven spacing
   - Misaligned cursors

2. **Rendering Artifacts**
   - Blurry text
   - Partial character rendering
   - Color bleeding

3. **Layout Shifts**
   - Unexpected margins
   - Content jumping
   - Scrollbar issues

4. **Style Regressions**
   - Font changes
   - Color variations
   - Border inconsistencies

## Best Practices for Visual Tests

### 1. Consistent Environment
- Fixed viewport sizes
- Controlled font loading
- Stable color profiles
- No animations during capture

### 2. Baseline Management
```bash
# Update baselines when changes are intentional
pnpm test:e2e visual-regression.spec.ts --update-snapshots

# Review changes before committing
git diff --staged e2e/**/*.png
```

### 3. Cross-Browser Validation
Each visual test runs on:
- Chromium (Blink engine)
- Firefox (Gecko engine)
- WebKit (Safari engine)

### 4. Debugging Failures
When visual tests fail:
1. Check `test-results/` for diff images
2. Compare actual vs expected
3. Verify intentional changes
4. Update baselines if needed

## Visual Test Maintenance

### Weekly Tasks
- Review visual test failures
- Update baselines for UI changes
- Add new scenarios as needed

### Monthly Tasks
- Audit baseline images
- Remove obsolete tests
- Optimize image sizes

### Quarterly Tasks
- Full visual regression review
- Cross-browser validation
- Performance impact assessment

## Future Visual Test Enhancements

### Planned Additions
1. **Theme Testing**
   - Dark mode variations
   - High contrast mode
   - Custom theme support

2. **Animation Testing**
   - Cursor blink states
   - Transition smoothness
   - Loading states

3. **Accessibility Visuals**
   - Focus indicators
   - Selection highlights
   - Screen reader indicators

4. **Error States**
   - Network offline
   - Save failures
   - Sync conflicts

## Conclusion

The visual regression test suite provides comprehensive coverage of the EditorV2's visual behavior. By capturing screenshots across multiple scenarios, viewports, and browsers, we ensure that:

1. Line alignment remains pixel-perfect
2. Text rendering is consistent
3. Layout adapts properly to different sizes
4. No visual regressions are introduced

The combination of baseline comparisons and tolerance thresholds allows for minor variations while catching significant visual bugs before they reach users.