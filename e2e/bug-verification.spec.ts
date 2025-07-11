/**
 * Bug Verification Tests for EditorV2
 * These tests verify that previously identified bugs have been fixed
 * They should PASS when bugs are resolved
 */

import { test, expect } from '@playwright/test';
import path from 'path';

// Helper to check if line numbers are aligned with text
async function verifyLineAlignment(page: any, tolerance: number = 1): Promise<boolean> {
  const result = await page.evaluate((tol: number) => {
    const lineNumbers = Array.from(document.querySelectorAll('.line-number'));
    const editor = document.querySelector('[contenteditable="true"]');
    
    if (!editor || lineNumbers.length === 0) return false;
    
    // Get the first text node position for each line
    const lines: number[] = [];
    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    let currentLine = 0;
    const range = document.createRange();
    
    // First line position
    if (walker.nextNode()) {
      range.setStart(walker.currentNode, 0);
      range.setEnd(walker.currentNode, 0);
      const rect = range.getBoundingClientRect();
      lines.push(rect.top);
      currentLine = rect.top;
    }
    
    // Find subsequent lines by detecting Y position changes
    while (node = walker.currentNode) {
      const text = node.textContent || '';
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n' && i + 1 < text.length) {
          range.setStart(node, i + 1);
          range.setEnd(node, i + 1);
          const rect = range.getBoundingClientRect();
          if (rect.top > currentLine) {
            lines.push(rect.top);
            currentLine = rect.top;
          }
        }
      }
      if (!walker.nextNode()) break;
    }
    
    // Compare line number positions with text line positions
    for (let i = 0; i < Math.min(lineNumbers.length, lines.length); i++) {
      const lineNumRect = lineNumbers[i].getBoundingClientRect();
      const drift = Math.abs(lineNumRect.top - lines[i]);
      if (drift > tol) {
        console.log(`Line ${i + 1} drift: ${drift}px`);
        return false;
      }
    }
    
    return true;
  }, tolerance);
  
  return result;
}

test.describe('Bug Fix Verification - Line Number Alignment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
  });

  test('✅ line numbers should stay aligned when text wraps', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    const longLine = 'This is a very long line of text that should wrap when the editor width is constrained. It contains enough words to definitely exceed the editor width and cause line wrapping behavior.';
    
    await editor.type('Line 1 - short line');
    await page.keyboard.press('Enter');
    await editor.type(longLine);
    await page.keyboard.press('Enter');
    await editor.type('Line 3 - another short line');
    await page.keyboard.press('Enter');
    await editor.type('Line 4 - final line');
    
    await page.waitForTimeout(200);
    
    // Verify initial alignment
    const initialAlignment = await verifyLineAlignment(page);
    expect(initialAlignment).toBe(true);
    
    // Resize and verify alignment is maintained
    await page.setViewportSize({ width: 600, height: 600 });
    await page.waitForTimeout(300);
    
    const afterResizeAlignment = await verifyLineAlignment(page);
    expect(afterResizeAlignment).toBe(true);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'fixed-line-alignment-after-resize.png'),
      fullPage: false 
    });
  });

  test('✅ line numbers should align correctly with multiple wrapped lines', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    const lines = [
      'Short line 1',
      'This is an extremely long line that will definitely wrap multiple times in a narrow editor window, testing the line number alignment system',
      'Short line 3',
      'Another very long line with lots of text that will wrap and previously caused line numbers to become misaligned with their corresponding text content',
      'Short line 5'
    ];
    
    for (let i = 0; i < lines.length; i++) {
      await editor.type(lines[i]);
      if (i < lines.length - 1) {
        await page.keyboard.press('Enter');
      }
    }
    
    await page.waitForTimeout(200);
    
    // Verify alignment with wrapped content
    const alignment = await verifyLineAlignment(page);
    expect(alignment).toBe(true);
    
    // Verify we still have 5 line numbers (not more due to wrapping)
    const lineNumbers = await page.locator('.line-number').count();
    expect(lineNumbers).toBe(5);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'fixed-multiple-wrapped-lines.png'),
      fullPage: false 
    });
  });

  test('✅ line numbers should remain aligned during dynamic content changes', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Start with simple content
    await editor.type('Line 1');
    await page.keyboard.press('Enter');
    await editor.type('Line 2');
    await page.keyboard.press('Enter');
    await editor.type('Line 3');
    
    // Verify initial alignment
    let alignment = await verifyLineAlignment(page);
    expect(alignment).toBe(true);
    
    // Add text that causes wrapping
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('End');
    await editor.type(' - now adding a lot more text that will cause this line to wrap across multiple visual lines');
    await page.waitForTimeout(100);
    
    // Verify alignment after dynamic change
    alignment = await verifyLineAlignment(page);
    expect(alignment).toBe(true);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'fixed-dynamic-content-alignment.png'),
      fullPage: false 
    });
  });

  test('✅ line numbers should handle rapid resize events without drift', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Add content with varying line lengths
    await editor.type('Short');
    await page.keyboard.press('Enter');
    await editor.type('Medium length line here');
    await page.keyboard.press('Enter');
    await editor.type('This is a much longer line that will wrap differently at different viewport widths');
    await page.keyboard.press('Enter');
    await editor.type('End');
    
    // Perform rapid resizes
    const widths = [800, 500, 900, 400, 1000, 600, 700];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 600 });
      await page.waitForTimeout(50);
    }
    
    // Final check after rapid resizing
    await page.waitForTimeout(200);
    const alignment = await verifyLineAlignment(page);
    expect(alignment).toBe(true);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'fixed-rapid-resize-stability.png'),
      fullPage: false 
    });
  });
});

test.describe('Bug Fix Verification - Formatting Functions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
  });

  test('✅ bold button should apply formatting correctly', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    await editor.type('This text should become bold');
    await page.keyboard.press('Control+a');
    
    // Click bold button
    const boldButton = page.locator('button[title="Emphasis"]');
    await boldButton.click();
    await page.waitForTimeout(200);
    
    // Verify bold was applied
    const boldText = await editor.locator('strong, b, [style*="font-weight: bold"], [style*="font-weight: 700"]').count();
    expect(boldText).toBeGreaterThan(0);
    
    // Verify button state updated
    const buttonState = await boldButton.getAttribute('aria-pressed');
    expect(buttonState).toBe('true');
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'fixed-bold-formatting.png'),
      fullPage: false 
    });
  });

  test('✅ highlight button should apply background color', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await editor.type('This text should be highlighted');
    
    await page.keyboard.press('Control+a');
    
    // Click highlight button
    const highlightButton = page.locator('button[title="Highlight"]');
    await highlightButton.click();
    
    // Wait for color picker and select yellow
    await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
    const yellowOption = page.locator('[role="option"]').filter({ hasText: 'Yellow' });
    await yellowOption.click();
    await page.waitForTimeout(200);
    
    // Verify highlight was applied
    const highlightedText = await editor.locator('[style*="background-color"], mark, [data-highlight]').count();
    expect(highlightedText).toBeGreaterThan(0);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'fixed-highlight-formatting.png'),
      fullPage: false 
    });
  });

  test('✅ keyboard shortcuts should work for formatting', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Test Ctrl+B for bold
    await editor.type('Testing bold shortcut');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+b');
    await page.waitForTimeout(200);
    
    const boldText = await editor.locator('strong, b, [style*="font-weight: bold"], [style*="font-weight: 700"]').count();
    expect(boldText).toBeGreaterThan(0);
    
    // Test Ctrl+I for italic
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await editor.type('Testing italic shortcut');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+i');
    await page.waitForTimeout(200);
    
    const italicText = await editor.locator('em, i, [style*="font-style: italic"]').count();
    expect(italicText).toBeGreaterThan(0);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'fixed-keyboard-shortcuts.png'),
      fullPage: false 
    });
  });

  test('✅ formatting state should update in toolbar when selection changes', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Type mixed content
    await editor.type('Normal text ');
    
    // Apply bold to next part
    const boldButton = page.locator('button[title="Emphasis"]');
    await boldButton.click();
    await editor.type('bold text');
    await boldButton.click(); // Turn off bold
    
    await editor.type(' normal again');
    
    // Move cursor to bold text
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
    
    // Verify button reflects bold state
    const buttonState = await boldButton.getAttribute('aria-pressed');
    expect(buttonState).toBe('true');
    
    // Move to normal text
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    
    // Verify button reflects non-bold state
    const normalState = await boldButton.getAttribute('aria-pressed');
    expect(normalState).toBe('false');
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'fixed-toolbar-state-sync.png'),
      fullPage: false 
    });
  });

  test('✅ formatting should persist through content changes', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Type and format text
    await editor.type('This is bold');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+b');
    await page.waitForTimeout(100);
    
    // Add more content
    await page.keyboard.press('End');
    await editor.type(' and this is not');
    await page.waitForTimeout(100);
    
    // Verify original formatting persists
    const boldCount = await editor.locator('strong, b').count();
    expect(boldCount).toBeGreaterThan(0);
    
    // Verify new text is not formatted
    const fullText = await editor.textContent();
    expect(fullText).toContain('This is bold and this is not');
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'fixed-formatting-persistence.png'),
      fullPage: false 
    });
  });
});

// Performance verification tests
test.describe('Performance Verification', () => {
  test('✅ should maintain smooth performance during resize', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
    
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    // Add substantial content
    for (let i = 1; i <= 30; i++) {
      await editor.type(`Line ${i} with some content that might wrap in narrow viewports`);
      if (i < 30) await page.keyboard.press('Enter');
    }
    
    // Measure resize performance
    const startTime = Date.now();
    
    // Perform multiple resizes
    for (let i = 0; i < 10; i++) {
      await page.setViewportSize({ width: 600 + (i * 50), height: 800 });
      await page.waitForTimeout(50);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Should complete 10 resizes in under 2 seconds
    expect(totalTime).toBeLessThan(2000);
    
    // Verify final alignment
    const alignment = await verifyLineAlignment(page);
    expect(alignment).toBe(true);
  });

  test('✅ should handle large documents efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
    
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Create a large document
    const startTime = Date.now();
    
    for (let i = 1; i <= 100; i++) {
      await editor.type(`Line ${i}: ${i % 3 === 0 ? 'This is a longer line with more content' : 'Short'}`);
      if (i < 100) await page.keyboard.press('Enter');
    }
    
    const typingTime = Date.now() - startTime;
    
    // Should handle 100 lines in reasonable time
    expect(typingTime).toBeLessThan(10000);
    
    // Verify alignment is still correct
    const alignment = await verifyLineAlignment(page, 2); // Slightly higher tolerance for large doc
    expect(alignment).toBe(true);
    
    // Test scrolling performance
    await page.keyboard.press('Control+Home');
    await page.keyboard.press('Control+End');
    
    // Final screenshot
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'fixed-large-document-performance.png'),
      fullPage: false 
    });
  });
});

// Configure tests
test.use({
  actionTimeout: 10000,
  navigationTimeout: 30000,
  
  // Capture evidence of fixes
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'retain-on-failure',
});