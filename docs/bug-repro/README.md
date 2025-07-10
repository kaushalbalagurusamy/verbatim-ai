# Editor Bug Reproduction Tests

This directory contains Playwright tests and artifacts that reproduce two critical bugs in the current EditorV2 implementation.

## Bugs Documented

### 1. Line Number Misalignment Bug

**Description**: When text wraps in the editor, line numbers become misaligned with their corresponding text lines. This occurs because:
- Line numbers are calculated based on newline characters only
- Wrapped lines visually take up multiple rows but are counted as single lines
- The line number gutter doesn't account for the visual height of wrapped content

**How to Reproduce**:
1. Type a long line of text that exceeds the editor width
2. Resize the window to make it narrower
3. Observe that line numbers no longer align with their text lines

**Test Files**:
- `e2e/bug-reproduction.spec.ts` - Contains tests that demonstrate the issue
- Screenshots captured:
  - `line-numbers-before-resize.png` - Shows correct alignment initially
  - `line-numbers-after-resize-misaligned.png` - Shows misalignment after wrap
  - `line-numbers-multiple-wrapped-lines.png` - Shows severe misalignment with multiple wrapped lines

### 2. Formatting Buttons Not Working Bug

**Description**: The formatting toolbar buttons (Bold, Highlight, etc.) do not apply formatting to selected text. This affects:
- Bold/Emphasis button
- Highlight color selection
- Keyboard shortcuts (Ctrl/Cmd+B, Ctrl/Cmd+H)
- Toolbar state not reflecting current formatting

**Root Causes**:
- Selection range restoration fails after DOM manipulation
- Formatting is applied to the document model but not properly rendered
- Event handling conflicts between contentEditable and custom formatting logic

**How to Reproduce**:
1. Select any text in the editor
2. Click the Bold button or press Ctrl/Cmd+B
3. Observe that no formatting is applied
4. Try the Highlight button and select a color
5. Observe that no highlighting appears

**Test Files**:
- `e2e/bug-reproduction.spec.ts` - Contains failing tests for all formatting features
- Screenshots captured:
  - `bold-before-click.png` / `bold-after-click-not-working.png`
  - `highlight-before-click.png` / `highlight-after-click-not-working.png`
  - `keyboard-shortcut-bold-not-working.png`
  - `keyboard-shortcut-highlight-not-working.png`
  - `toolbar-state-not-updating.png`

## Running the Tests

```bash
# Run all bug reproduction tests
pnpm test:e2e bug-reproduction.spec.ts

# Run with UI mode to see the failures visually
pnpm test:e2e:ui bug-reproduction.spec.ts

# Run specific test suites
pnpm test:e2e bug-reproduction.spec.ts -g "Line Number Misalignment"
pnpm test:e2e bug-reproduction.spec.ts -g "Formatting Buttons"
```

## Expected Results

All tests in `bug-reproduction.spec.ts` are **expected to FAIL** on the current implementation. These failures document the bugs and serve as:

1. **Proof of bugs** - Demonstrating the issues exist
2. **Regression tests** - Will pass once bugs are fixed
3. **Documentation** - Clear examples of what's broken

## Test Artifacts

After running the tests, check the following locations for artifacts:

- **Screenshots**: `docs/bug-repro/*.png` - Visual evidence of the bugs
- **Videos**: `test-results/*/video.webm` - If tests are retried
- **Traces**: `test-results/*/trace.zip` - Playwright trace files for debugging

## Technical Details

### Line Number Misalignment Technical Cause

The current implementation:
```typescript
// Line numbers are counted by newlines only
const lineCount = text.split('\n').length;

// But visual rendering wraps lines
<div style="white-space: pre-wrap">
  Long text that wraps...
</div>
```

The fix requires:
- Measuring actual rendered line heights
- Using ResizeObserver or similar to track visual changes
- Synchronizing line number display with visual layout

### Formatting Not Working Technical Cause

The current implementation has issues with:
```typescript
// Selection is lost after DOM updates
const savedRange = selection.getRangeAt(0).cloneRange();
container.innerHTML = renderResult.html; // This destroys the selection
selection.addRange(savedRange); // Fails because nodes no longer exist
```

The fix requires:
- Preserving selection across DOM updates
- Proper integration between contentEditable and custom formatting
- Ensuring formatting spans are properly rendered

## Next Steps

1. Run these tests to confirm the bugs exist
2. Use the test failures as acceptance criteria for fixes
3. Implement fixes that make all tests pass
4. Keep tests as regression prevention