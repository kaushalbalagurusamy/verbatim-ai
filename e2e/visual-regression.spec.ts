/**
 * Visual Regression Tests for EditorV2 Line Alignment
 * These tests capture and compare screenshots to detect visual regressions
 * Uses Playwright's built-in screenshot comparison functionality
 */

import { test, expect } from '@playwright/test';

// Helper to setup consistent editor state
async function setupEditor(page: any, content: string[]) {
  await page.goto('/');
  await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
  
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  
  // Clear existing content
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  
  // Type content
  for (let i = 0; i < content.length; i++) {
    await editor.type(content[i]);
    if (i < content.length - 1) {
      await page.keyboard.press('Enter');
    }
  }
  
  // Wait for stable rendering
  await page.waitForTimeout(200);
}

test.describe('Visual Regression - Line Alignment Baseline', () => {
  test('empty document baseline', async ({ page }) => {
    await setupEditor(page, []);
    
    // Capture full editor area including line numbers
    const editorArea = page.locator('.editor-container, [data-editor-root]').first();
    await expect(editorArea).toHaveScreenshot('baseline-empty-document.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test('single line baseline', async ({ page }) => {
    await setupEditor(page, ['Single line of text']);
    
    const editorArea = page.locator('.editor-container, [data-editor-root]').first();
    await expect(editorArea).toHaveScreenshot('baseline-single-line.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test('multiple paragraphs with wrapping baseline', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    
    await setupEditor(page, [
      'First paragraph with normal text.',
      'Second paragraph that contains significantly more text and will definitely wrap when displayed in a narrow viewport, testing the line number alignment.',
      'Third paragraph is short.',
      'Fourth paragraph also has a substantial amount of text to ensure we test multiple wrapped lines in the editor view.',
      'Fifth paragraph ends the test.'
    ]);
    
    const editorArea = page.locator('.editor-container, [data-editor-root]').first();
    await expect(editorArea).toHaveScreenshot('baseline-multiple-paragraphs.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test('mixed content types baseline', async ({ page }) => {
    await setupEditor(page, [
      '# Main Heading',
      'Regular paragraph text here.',
      '## Subheading',
      'Another paragraph with **bold** and *italic* text.',
      '### Smaller Heading',
      'Final paragraph with `inline code`.'
    ]);
    
    const editorArea = page.locator('.editor-container, [data-editor-root]').first();
    await expect(editorArea).toHaveScreenshot('baseline-mixed-content.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test('unicode and emoji content baseline', async ({ page }) => {
    await setupEditor(page, [
      '🎉 Welcome! 🚀',
      'Testing with émojis and spéciål characters ñ.',
      '中文测试 Japanese テスト',
      'Mixed: Hello 世界 🌍',
      '🔥🔥🔥 Multiple emojis in a row 🔥🔥🔥'
    ]);
    
    const editorArea = page.locator('.editor-container, [data-editor-root]').first();
    await expect(editorArea).toHaveScreenshot('baseline-unicode-emoji.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test('very long lines baseline', async ({ page }) => {
    const longLine = 'This is a very long line that contains enough text to wrap multiple times in most viewport sizes. '.repeat(10);
    
    await setupEditor(page, [
      'Short line before',
      longLine,
      'Short line after',
      'Another normal line'
    ]);
    
    const editorArea = page.locator('.editor-container, [data-editor-root]').first();
    await expect(editorArea).toHaveScreenshot('baseline-very-long-lines.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });
});

test.describe('Visual Regression - Viewport Variations', () => {
  const viewportSizes = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'wide', width: 1920, height: 1080 },
  ];

  for (const viewport of viewportSizes) {
    test(`alignment at ${viewport.name} viewport (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      await setupEditor(page, [
        'Line 1 - Short',
        'Line 2 - This line has enough text to potentially wrap on narrower viewports',
        'Line 3 - Medium length text here',
        'Line 4 - Another potentially wrapping line with lots of content',
        'Line 5 - End'
      ]);
      
      const editorArea = page.locator('.editor-container, [data-editor-root]').first();
      await expect(editorArea).toHaveScreenshot(`viewport-${viewport.name}.png`, {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });
  }
});

test.describe('Visual Regression - Dynamic State Changes', () => {
  test('after text insertion', async ({ page }) => {
    await setupEditor(page, [
      'Line 1',
      'Line 2',
      'Line 3'
    ]);
    
    // Insert text in the middle
    const editor = page.locator('[contenteditable="true"]').first();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('End');
    await editor.type(' - now with additional text that might cause wrapping');
    await page.waitForTimeout(100);
    
    const editorArea = page.locator('.editor-container, [data-editor-root]').first();
    await expect(editorArea).toHaveScreenshot('state-after-insertion.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test('after line deletion', async ({ page }) => {
    await setupEditor(page, [
      'Line 1',
      'Line 2 - to be deleted',
      'Line 3',
      'Line 4',
      'Line 5'
    ]);
    
    // Delete line 2
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+End');
    await page.keyboard.press('Delete');
    await page.keyboard.press('Delete'); // Remove the newline too
    await page.waitForTimeout(100);
    
    const editorArea = page.locator('.editor-container, [data-editor-root]').first();
    await expect(editorArea).toHaveScreenshot('state-after-deletion.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test('after window resize sequence', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 600 });
    
    await setupEditor(page, [
      'Resize test line 1',
      'This line will wrap differently at different viewport widths',
      'Another line that changes based on width',
      'Short line',
      'Final line with moderate length'
    ]);
    
    // Resize sequence
    await page.setViewportSize({ width: 600, height: 600 });
    await page.waitForTimeout(200);
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(200);
    
    const editorArea = page.locator('.editor-container, [data-editor-root]').first();
    await expect(editorArea).toHaveScreenshot('state-after-resize-sequence.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });
});

test.describe('Visual Regression - Edge Cases', () => {
  test('extremely narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 200, height: 600 });
    
    await setupEditor(page, [
      'Narrow',
      'Testing wrap',
      'Multiple words here',
      'End'
    ]);
    
    const editorArea = page.locator('.editor-container, [data-editor-root]').first();
    await expect(editorArea).toHaveScreenshot('edge-case-narrow.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test('extremely wide viewport', async ({ page }) => {
    await page.setViewportSize({ width: 2000, height: 600 });
    
    const veryLongLine = 'A'.repeat(300);
    await setupEditor(page, [
      'Wide viewport test',
      veryLongLine,
      'Normal line after'
    ]);
    
    const editorArea = page.locator('.editor-container, [data-editor-root]').first();
    await expect(editorArea).toHaveScreenshot('edge-case-wide.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test('many short lines', async ({ page }) => {
    const lines = Array.from({ length: 50 }, (_, i) => `L${i + 1}`);
    await setupEditor(page, lines);
    
    const editorArea = page.locator('.editor-container, [data-editor-root]').first();
    await expect(editorArea).toHaveScreenshot('edge-case-many-lines.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test('alternating long and short lines', async ({ page }) => {
    const lines = Array.from({ length: 10 }, (_, i) => 
      i % 2 === 0 
        ? `Short ${i}`
        : `Long line ${i} with significantly more text that will likely wrap in most viewport sizes`
    );
    await setupEditor(page, lines);
    
    const editorArea = page.locator('.editor-container, [data-editor-root]').first();
    await expect(editorArea).toHaveScreenshot('edge-case-alternating.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });
});

// Configure visual regression tests
test.use({
  // Ensure consistent rendering
  actionTimeout: 10000,
  navigationTimeout: 30000,
  
  // Visual regression specific settings
  viewport: { width: 1024, height: 768 }, // Default viewport
  deviceScaleFactor: 1, // Consistent DPI
  hasTouch: false,
  
  // Browser settings for consistency
  colorScheme: 'dark', // Match the app theme
  locale: 'en-US',
  timezoneId: 'UTC',
  
  // Reduce animations for consistent screenshots
  reducedMotion: 'reduce',
  
  // Screenshot options
  screenshot: {
    mode: 'only-on-failure',
    fullPage: false,
  },
});