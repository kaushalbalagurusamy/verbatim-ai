# Visual Regression Testing Guide

Visual regression testing captures screenshots of the application and compares them against baseline images to detect unintended visual changes.

## Overview

Visual regression tests ensure UI consistency across updates, browsers, and viewport sizes. They catch CSS regressions, layout shifts, and rendering issues that other tests might miss.

## Test Infrastructure

### Tools
- **Playwright**: Screenshot capture and comparison
- **Sharp**: Image processing and optimization
- **Pixelmatch**: Pixel-level comparison
- **CI Integration**: Automated baseline management

### Configuration
```typescript
// Visual regression settings
const visualConfig = {
  threshold: 0.2,        // 20% difference tolerance
  maxDiffPixels: 100,    // Maximum allowed pixel differences
  animations: 'disabled', // Disable animations for consistency
  clip: false,           // Full page screenshots
};
```

## Test Coverage

### Component Screenshots
- Empty editor state
- Text with formatting
- Toolbar states (active/inactive)
- Selection highlights
- Error states
- Loading states

### Viewport Testing
```typescript
const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'wide', width: 1920, height: 1080 },
];
```

### Theme Variations
- Light theme
- Dark theme
- High contrast mode
- Custom color schemes

## Writing Visual Tests

### Basic Screenshot Test
```typescript
test('editor should match visual baseline', async ({ page }) => {
  await page.goto('/editor');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot
  await expect(page).toHaveScreenshot('editor-empty.png');
});
```

### Component-Specific Screenshots
```typescript
test('toolbar formatting states', async ({ page }) => {
  await page.goto('/editor');
  
  // Test each format button state
  const formats = ['bold', 'italic', 'underline'];
  
  for (const format of formats) {
    await page.click(`[data-testid="format-${format}"]`);
    await expect(page.locator('.toolbar')).toHaveScreenshot(
      `toolbar-${format}-active.png`
    );
  }
});
```

### Responsive Screenshots
```typescript
test.describe('Responsive Design', () => {
  viewports.forEach(({ name, width, height }) => {
    test(`should render correctly on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/editor');
      
      await expect(page).toHaveScreenshot(`editor-${name}.png`);
    });
  });
});
```

## Managing Baselines

### Initial Baseline Creation
```bash
# Create initial baselines
pnpm test:e2e visual-regression.spec.ts --update-snapshots
```

### Updating Baselines
```bash
# Update after intentional changes
pnpm test:e2e visual-regression.spec.ts --update-snapshots

# Update specific test
pnpm test:e2e visual-regression.spec.ts --update-snapshots -g "toolbar"
```

### Baseline Storage
```
e2e/
└── visual-regression.spec.ts-snapshots/
    ├── editor-empty-chromium-darwin.png
    ├── editor-empty-firefox-darwin.png
    ├── editor-empty-webkit-darwin.png
    └── ...
```

## Advanced Techniques

### Masking Dynamic Content
```typescript
test('should ignore timestamps', async ({ page }) => {
  await page.goto('/editor');
  
  await expect(page).toHaveScreenshot('editor-masked.png', {
    mask: [page.locator('.timestamp')],
    maskColor: '#FF00FF',
  });
});
```

### Clipping Regions
```typescript
test('toolbar screenshot', async ({ page }) => {
  await page.goto('/editor');
  
  const toolbar = page.locator('.toolbar');
  await expect(toolbar).toHaveScreenshot('toolbar-only.png', {
    clip: await toolbar.boundingBox(),
  });
});
```

### Full Page Screenshots
```typescript
test('full document screenshot', async ({ page }) => {
  await page.goto('/editor');
  await page.evaluate(() => {
    // Add long content
    document.querySelector('.editor').textContent = 
      'Long content...'.repeat(100);
  });
  
  await expect(page).toHaveScreenshot('full-page.png', {
    fullPage: true,
  });
});
```

## Handling Failures

### Debugging Visual Differences

1. **Review Diff Images**:
   ```bash
   # Generated in test-results/
   open test-results/*-diff.png
   ```

2. **Check Actual vs Expected**:
   ```bash
   # Compare side by side
   open test-results/*-actual.png
   open test-results/*-expected.png
   ```

3. **Analyze Difference Report**:
   ```javascript
   // Custom reporting
   const comparison = await page.screenshot();
   const diff = pixelmatch(expected, actual, diff, width, height);
   console.log(`${diff} pixels different`);
   ```

### Common Issues

#### Font Rendering Differences
```typescript
// Use web fonts with consistent rendering
await page.addStyleTag({
  content: `
    * { 
      font-family: Arial, sans-serif !important;
      -webkit-font-smoothing: antialiased;
    }
  `
});
```

#### Animation Interference
```typescript
// Disable all animations
await page.addStyleTag({
  content: `
    *, *::before, *::after {
      animation-duration: 0s !important;
      transition-duration: 0s !important;
    }
  `
});
```

#### Scroll Position
```typescript
// Ensure consistent scroll position
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(100); // Wait for scroll
```

## CI/CD Integration

### Baseline Management
```yaml
# Auto-update baselines on main branch
- name: Update Visual Baselines
  if: github.ref == 'refs/heads/main'
  run: |
    pnpm test:visual --update-snapshots
    git add -A
    git commit -m "Update visual baselines"
    git push
```

### PR Workflow
1. Run visual tests against main baselines
2. Generate diff report
3. Comment on PR with visual changes
4. Require approval for visual changes

### Cross-Platform Testing
```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    browser: [chromium, firefox, webkit]
```

## Best Practices

### Test Design
1. **Stable State**: Wait for animations and loading
2. **Consistent Data**: Use fixed test data
3. **Isolated Tests**: One visual aspect per test
4. **Meaningful Names**: Descriptive screenshot names

### Performance
1. **Optimize Images**: Compress baselines
2. **Parallel Execution**: Run tests concurrently
3. **Smart Comparison**: Skip unchanged areas
4. **Selective Testing**: Only test affected components

### Maintenance
1. **Regular Reviews**: Audit baselines quarterly
2. **Clean Up**: Remove obsolete screenshots
3. **Documentation**: Document visual requirements
4. **Version Control**: Track baseline history

## Troubleshooting

### Platform Differences
```typescript
// Handle platform-specific rendering
const platform = process.platform;
await expect(page).toHaveScreenshot(`editor-${platform}.png`);
```

### Flaky Visual Tests
- Increase wait times
- Disable smooth scrolling
- Use more lenient thresholds
- Mock dynamic content

### Large Baseline Files
- Use Git LFS for images
- Compress baselines
- Store only essential screenshots
- Regular cleanup of old baselines

## Future Enhancements

1. **Cloud Visual Testing**: Integration with Percy/Applitools
2. **AI-Powered Comparison**: Smart difference detection
3. **Component Library**: Visual documentation
4. **A/B Testing**: Visual variant testing
5. **Performance Impact**: Visual performance metrics