# End-to-End Testing Guide

End-to-end (E2E) tests validate complete user workflows through the application, ensuring all components work together from the user's perspective.

## Overview

E2E tests simulate real user interactions with the application, testing full workflows from start to finish. They provide confidence that the system works correctly as a whole.

## Test Framework

We use **Playwright** for E2E testing, which provides:
- Cross-browser testing (Chromium, Firefox, WebKit)
- Reliable automation with auto-waiting
- Network interception and mocking
- Visual regression capabilities
- Detailed trace and video recording

## Test Structure

```
e2e/
├── bug-reproduction.spec.ts      # Bug-specific tests
├── bug-verification.spec.ts      # Fixed bug validation
├── document-editor.spec.ts       # Core editor workflows
├── line-alignment-regression.spec.ts  # Alignment tests
├── performance-budget.spec.ts    # Performance validation
├── visual-regression.spec.ts     # UI consistency tests
└── run-regression-tests.sh       # Test runner script
```

## Core Test Scenarios

### Document Editing Workflows
```typescript
test('should handle complete document creation', async ({ page }) => {
  // Navigate to editor
  await page.goto('/');
  
  // Create new document
  await page.click('[data-testid="new-document"]');
  
  // Type content
  await page.keyboard.type('# My Document\n\nThis is a test.');
  
  // Apply formatting
  await page.keyboard.press('Control+A');
  await page.click('[data-testid="format-bold"]');
  
  // Verify content
  const content = await page.textContent('.editor-content');
  expect(content).toContain('My Document');
  
  // Verify formatting
  const bold = await page.locator('.bold').count();
  expect(bold).toBeGreaterThan(0);
});
```

### Multi-User Scenarios
- Concurrent editing simulation
- Conflict resolution testing
- Real-time synchronization
- Collaboration features

### Cross-Browser Workflows
- Feature parity across browsers
- Browser-specific bug validation
- Performance consistency
- Rendering accuracy

## Writing E2E Tests

### Page Object Model
```typescript
// page-objects/EditorPage.ts
export class EditorPage {
  constructor(private page: Page) {}
  
  async navigate() {
    await this.page.goto('/editor');
  }
  
  async typeText(text: string) {
    await this.page.locator('.editor-content').type(text);
  }
  
  async selectAll() {
    await this.page.keyboard.press('Control+A');
  }
  
  async applyFormat(format: string) {
    await this.page.click(`[data-testid="format-${format}"]`);
  }
  
  async getContent() {
    return this.page.textContent('.editor-content');
  }
}
```

### Test Implementation
```typescript
import { test, expect } from '@playwright/test';
import { EditorPage } from './page-objects/EditorPage';

test.describe('Editor Workflows', () => {
  let editor: EditorPage;
  
  test.beforeEach(async ({ page }) => {
    editor = new EditorPage(page);
    await editor.navigate();
  });
  
  test('should support basic editing', async () => {
    await editor.typeText('Hello World');
    await editor.selectAll();
    await editor.applyFormat('bold');
    
    const content = await editor.getContent();
    expect(content).toBe('Hello World');
  });
});
```

## Running E2E Tests

### Local Development
```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e document-editor.spec.ts

# Run in headed mode (see browser)
pnpm test:e2e --headed

# Run specific browser
pnpm test:e2e --project=firefox

# Debug mode
pnpm test:e2e --debug
```

### CI/CD Execution
```bash
# Run in CI mode
CI=true pnpm test:e2e

# Generate reports
pnpm test:e2e --reporter=html

# With retries
pnpm test:e2e --retries=2
```

## Test Configuration

### playwright.config.ts
```typescript
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

## Debugging E2E Tests

### Visual Debugging
```bash
# Open Playwright Inspector
pnpm test:e2e --debug

# Use UI mode
pnpm test:e2e --ui
```

### Trace Viewer
```bash
# View trace after failure
npx playwright show-trace trace.zip

# Enable trace for all tests
pnpm test:e2e --trace on
```

### Common Issues

#### Flaky Tests
- Add explicit waits: `await page.waitForSelector()`
- Use auto-waiting selectors
- Ensure proper test isolation
- Check for race conditions

#### Timeout Issues
```typescript
// Increase timeout for slow operations
test.setTimeout(60000);

// Or for specific actions
await page.click('button', { timeout: 10000 });
```

## Best Practices

### Test Design
1. **User-Centric**: Test real user workflows
2. **Independent**: Each test should run in isolation
3. **Deterministic**: Consistent results every run
4. **Fast**: Optimize for speed without sacrificing reliability

### Selectors Strategy
```typescript
// Good: Data attributes
await page.click('[data-testid="submit-button"]');

// Avoid: Brittle selectors
await page.click('.btn.btn-primary:nth-child(2)');
```

### Test Data Management
```typescript
// Use test fixtures
const testData = {
  user: { email: 'test@example.com', password: 'secure123' },
  document: { title: 'Test Doc', content: 'Sample content' }
};

// Clean up after tests
test.afterEach(async () => {
  await cleanup(testData.document.id);
});
```

## Network Mocking

```typescript
test('should handle API errors', async ({ page }) => {
  // Mock API failure
  await page.route('**/api/save', route => {
    route.fulfill({ status: 500, body: 'Server Error' });
  });
  
  // Test error handling
  await editor.save();
  await expect(page.locator('.error-message')).toBeVisible();
});
```

## Mobile Testing

```typescript
// Test on mobile devices
const iPhone = devices['iPhone 12'];

test.use({ ...iPhone });

test('should work on mobile', async ({ page }) => {
  await page.goto('/');
  // Mobile-specific tests
});
```

## Accessibility Testing

```typescript
test('should be accessible', async ({ page }) => {
  await page.goto('/');
  
  // Check for accessibility violations
  const accessibilityScanResults = await new AxeBuilder({ page })
    .analyze();
    
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Performance Monitoring

```typescript
test('should load quickly', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;
  
  expect(loadTime).toBeLessThan(3000);
});
```

## Maintenance

### Regular Tasks
- Update selectors when UI changes
- Review and remove obsolete tests
- Optimize slow tests
- Update browser versions
- Monitor test stability metrics

### Test Reports
- HTML reports for detailed results
- Screenshots on failure
- Video recordings for debugging
- Performance metrics
- Flakiness tracking