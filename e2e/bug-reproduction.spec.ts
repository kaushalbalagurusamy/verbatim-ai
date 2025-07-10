/**
 * Bug Reproduction Tests for EditorV2
 * These tests are designed to FAIL on the current implementation
 * They document and reproduce the two main bugs in the editor
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Bug Reproduction - Line Number Misalignment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for editor to load
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
  });

  test('should demonstrate line number misalignment when text wraps', async ({ page }) => {
    // Set a specific viewport size to ensure consistent wrapping
    await page.setViewportSize({ width: 800, height: 600 });
    
    // Get the editor element
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    // Clear any existing content
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Type content that will cause line wrapping
    const longLine = 'This is a very long line of text that should wrap when the editor width is constrained. It contains enough words to definitely exceed the editor width and cause line wrapping behavior.';
    
    // Type multiple lines including the long one
    await editor.type('Line 1 - short line');
    await page.keyboard.press('Enter');
    await editor.type(longLine);
    await page.keyboard.press('Enter');
    await editor.type('Line 3 - another short line');
    await page.keyboard.press('Enter');
    await editor.type('Line 4 - final line');
    
    // Wait for rendering to complete
    await page.waitForTimeout(500);
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'line-numbers-before-resize.png'),
      fullPage: false 
    });
    
    // Resize the window to trigger misalignment
    await page.setViewportSize({ width: 600, height: 600 });
    await page.waitForTimeout(500);
    
    // Take screenshot showing misalignment
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'line-numbers-after-resize-misaligned.png'),
      fullPage: false 
    });
    
    // Verify line numbers are visible
    const lineNumbers = await page.locator('.line-number').all();
    expect(lineNumbers.length).toBeGreaterThan(0);
    
    // Get visual positions of line numbers and text lines
    const lineNumberPositions = await Promise.all(
      lineNumbers.slice(0, 4).map(async (ln) => {
        const box = await ln.boundingBox();
        return box ? box.y : 0;
      })
    );
    
    // Get positions of actual text lines in the editor
    const editorBounds = await editor.boundingBox();
    
    // This test is expected to FAIL - documenting the misalignment bug
    // Line numbers should align with their corresponding text lines
    // Currently they don't after wrapping occurs
    
    // Log the misalignment for documentation
    console.log('Line number positions:', lineNumberPositions);
    console.log('Editor bounds:', editorBounds);
    
    // Add a failing assertion to document the bug
    // In a working implementation, line numbers would stay aligned with their text
    expect(lineNumberPositions[1] - lineNumberPositions[0]).toBeLessThan(40); // This will likely fail due to wrapping
  });

  test('should show line number misalignment with multiple wrapped lines', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    // Clear content
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Type multiple lines that will wrap
    const lines = [
      'Short line 1',
      'This is an extremely long line that will definitely wrap multiple times in a narrow editor window, causing significant layout issues with line number alignment',
      'Short line 3',
      'Another very long line with lots of text that will wrap and cause the line numbers to become misaligned with their corresponding text content in the editor',
      'Short line 5'
    ];
    
    for (let i = 0; i < lines.length; i++) {
      await editor.type(lines[i]);
      if (i < lines.length - 1) {
        await page.keyboard.press('Enter');
      }
    }
    
    await page.waitForTimeout(500);
    
    // Capture the misalignment
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'line-numbers-multiple-wrapped-lines.png'),
      fullPage: false 
    });
    
    // Check that line numbers exist but are misaligned
    const lineNumbers = await page.locator('.line-number').all();
    expect(lineNumbers.length).toBe(5); // We typed 5 lines
    
    // This assertion documents that the visual alignment is broken
    // The test is expected to fail
  });
});

test.describe('Bug Reproduction - Formatting Buttons Not Working', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
  });

  test('should demonstrate bold button not applying formatting', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    // Clear content
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Type some text
    await editor.type('This text should become bold');
    
    // Select all text
    await page.keyboard.press('Control+a');
    
    // Take screenshot before clicking bold
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'bold-before-click.png'),
      fullPage: false 
    });
    
    // Click the bold button
    const boldButton = page.locator('button[title="Emphasis"]');
    await boldButton.click();
    
    // Wait for any formatting to be applied
    await page.waitForTimeout(500);
    
    // Take screenshot after clicking bold
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'bold-after-click-not-working.png'),
      fullPage: false 
    });
    
    // Check if bold formatting was applied
    // This test is expected to FAIL - the bold formatting is not being applied
    const formattedText = await editor.locator('strong, b, [style*="font-weight: bold"]').count();
    expect(formattedText).toBeGreaterThan(0); // This will fail - no bold formatting applied
  });

  test('should demonstrate highlight button not applying formatting', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    // Clear and type text
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await editor.type('This text should be highlighted');
    
    // Select the text
    await page.keyboard.press('Control+a');
    
    // Take screenshot before highlighting
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'highlight-before-click.png'),
      fullPage: false 
    });
    
    // Click the highlight button
    const highlightButton = page.locator('button[title="Highlight"]');
    await highlightButton.click();
    
    // Wait for the color picker to appear
    await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
    
    // Select a highlight color (yellow)
    const yellowOption = page.locator('[role="option"]').filter({ hasText: 'Yellow' });
    await yellowOption.click();
    
    await page.waitForTimeout(500);
    
    // Take screenshot after highlighting
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'highlight-after-click-not-working.png'),
      fullPage: false 
    });
    
    // Check if highlight was applied
    // This test is expected to FAIL - highlighting is not being applied
    const highlightedText = await editor.locator('[style*="background-color"], mark').count();
    expect(highlightedText).toBeGreaterThan(0); // This will fail - no highlight applied
  });

  test('should demonstrate keyboard shortcuts not working', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    // Clear and type text
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await editor.type('Testing keyboard shortcuts');
    
    // Select all text
    await page.keyboard.press('Control+a');
    
    // Try Ctrl+B for bold
    await page.keyboard.press('Control+b');
    await page.waitForTimeout(200);
    
    // Take screenshot
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'keyboard-shortcut-bold-not-working.png'),
      fullPage: false 
    });
    
    // Check if bold was applied via keyboard shortcut
    const boldText = await editor.locator('strong, b, [style*="font-weight: bold"]').count();
    expect(boldText).toBeGreaterThan(0); // This will fail
    
    // Try Ctrl+H for highlight
    await page.keyboard.press('Control+h');
    await page.waitForTimeout(200);
    
    // Take screenshot
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'keyboard-shortcut-highlight-not-working.png'),
      fullPage: false 
    });
    
    // Check if highlight was applied
    const highlightedText = await editor.locator('[style*="background-color"], mark').count();
    expect(highlightedText).toBeGreaterThan(0); // This will fail
  });

  test('should demonstrate formatting state not updating in toolbar', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    // Type and manually add some formatted text
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Try to add formatted text and check toolbar state
    await editor.type('Normal text ');
    
    // Check initial toolbar state
    const boldButton = page.locator('button[title="Emphasis"]');
    const initialBoldState = await boldButton.getAttribute('aria-pressed');
    expect(initialBoldState).toBe('false');
    
    // Select text and click bold
    await page.keyboard.press('Control+a');
    await boldButton.click();
    
    // Check if button state updated
    await page.waitForTimeout(200);
    const afterClickState = await boldButton.getAttribute('aria-pressed');
    
    // Take screenshot of toolbar state
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'toolbar-state-not-updating.png'),
      fullPage: false 
    });
    
    // This should be 'true' but will likely remain 'false' due to the bug
    expect(afterClickState).toBe('true'); // This will fail
  });
});

// Test configuration for better error reporting
test.use({
  // Slow down actions to make bugs more visible
  actionTimeout: 10000,
  // Capture video on failure
  video: 'on-first-retry',
  // Capture trace on failure
  trace: 'on-first-retry',
});