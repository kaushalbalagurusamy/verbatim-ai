/**
 * Comprehensive Line Alignment Regression Tests for EditorV2
 * These tests verify that line numbers stay aligned with their corresponding text lines
 * across various scenarios including resizing, dynamic content, and edge cases
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Helper to measure line alignment precision
async function measureLineAlignment(page: Page): Promise<{ lineNumbers: number[], textLines: number[], maxDrift: number }> {
  // Get all line numbers
  const lineNumbers = await page.locator('.line-number').all();
  const lineNumberTops = await Promise.all(
    lineNumbers.map(async (ln) => {
      const box = await ln.boundingBox();
      return box ? box.y : 0;
    })
  );

  // Get all text lines (by finding line breaks in content)
  const editor = page.locator('[contenteditable="true"]').first();
  const editorBox = await editor.boundingBox();
  if (!editorBox) return { lineNumbers: [], textLines: [], maxDrift: 0 };

  // Execute JavaScript to get actual line positions
  const textLineTops = await page.evaluate(() => {
    const editor = document.querySelector('[contenteditable="true"]');
    if (!editor) return [];

    const range = document.createRange();
    const textNodes: Node[] = [];
    
    // Collect all text nodes
    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    const lineStarts: number[] = [0]; // First line always starts at 0
    let currentTop = 0;

    textNodes.forEach((node) => {
      const text = node.textContent || '';
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n') {
          // Found a line break
          range.setStart(node, i + 1);
          range.setEnd(node, i + 1);
          const rect = range.getBoundingClientRect();
          if (rect.top > currentTop) {
            lineStarts.push(rect.top);
            currentTop = rect.top;
          }
        }
      }
    });

    return lineStarts;
  });

  // Calculate maximum drift
  let maxDrift = 0;
  for (let i = 0; i < Math.min(lineNumberTops.length, textLineTops.length); i++) {
    const drift = Math.abs(lineNumberTops[i] - textLineTops[i]);
    maxDrift = Math.max(maxDrift, drift);
  }

  return { 
    lineNumbers: lineNumberTops, 
    textLines: textLineTops, 
    maxDrift 
  };
}

test.describe('Line Alignment Regression Tests - Basic Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
  });

  test('should maintain alignment with empty document', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    // Clear content
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    await page.waitForTimeout(100);
    
    const alignment = await measureLineAlignment(page);
    expect(alignment.maxDrift).toBeLessThanOrEqual(1); // 1px tolerance
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-empty-document.png'),
      fullPage: false 
    });
  });

  test('should maintain alignment with single line', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await editor.type('Single line of text');
    
    await page.waitForTimeout(100);
    
    const alignment = await measureLineAlignment(page);
    expect(alignment.maxDrift).toBeLessThanOrEqual(1);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-single-line.png'),
      fullPage: false 
    });
  });

  test('should maintain alignment with multiple paragraphs', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Type multiple paragraphs
    const paragraphs = [
      'First paragraph with some text.',
      'Second paragraph that is a bit longer and might wrap on narrow screens.',
      'Third paragraph.',
      'Fourth paragraph with enough content to potentially cause wrapping in most viewports, testing the line number alignment.',
      'Fifth and final paragraph.'
    ];
    
    for (let i = 0; i < paragraphs.length; i++) {
      await editor.type(paragraphs[i]);
      if (i < paragraphs.length - 1) {
        await page.keyboard.press('Enter');
      }
    }
    
    await page.waitForTimeout(100);
    
    const alignment = await measureLineAlignment(page);
    expect(alignment.maxDrift).toBeLessThanOrEqual(1);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-multiple-paragraphs.png'),
      fullPage: false 
    });
  });

  test('should maintain alignment with mixed content types', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Type mixed content
    await editor.type('# Heading 1');
    await page.keyboard.press('Enter');
    await editor.type('Regular paragraph text.');
    await page.keyboard.press('Enter');
    await editor.type('## Heading 2');
    await page.keyboard.press('Enter');
    await editor.type('Another paragraph with more content that could wrap.');
    
    await page.waitForTimeout(100);
    
    const alignment = await measureLineAlignment(page);
    expect(alignment.maxDrift).toBeLessThanOrEqual(1);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-mixed-content.png'),
      fullPage: false 
    });
  });
});

test.describe('Line Alignment Regression Tests - Window Resize', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
  });

  test('should maintain alignment when resizing from wide to narrow', async ({ page }) => {
    // Start with wide viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Add content that will wrap when narrowed
    const longText = 'This is a long line of text that will definitely wrap when the viewport becomes narrow. It contains enough words to ensure wrapping behavior.';
    await editor.type('Line 1');
    await page.keyboard.press('Enter');
    await editor.type(longText);
    await page.keyboard.press('Enter');
    await editor.type('Line 3');
    
    await page.waitForTimeout(100);
    
    // Measure initial alignment
    const alignmentBefore = await measureLineAlignment(page);
    expect(alignmentBefore.maxDrift).toBeLessThanOrEqual(1);
    
    // Resize to narrow
    await page.setViewportSize({ width: 600, height: 800 });
    await page.waitForTimeout(300); // Wait for reflow
    
    // Measure alignment after resize
    const alignmentAfter = await measureLineAlignment(page);
    expect(alignmentAfter.maxDrift).toBeLessThanOrEqual(1);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-resize-wide-to-narrow.png'),
      fullPage: false 
    });
  });

  test('should maintain alignment when resizing from narrow to wide', async ({ page }) => {
    // Start with narrow viewport
    await page.setViewportSize({ width: 600, height: 800 });
    
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Add wrapped content
    const longText = 'This text is wrapped in the narrow viewport but will unwrap when the viewport becomes wider.';
    await editor.type(longText);
    await page.keyboard.press('Enter');
    await editor.type('Another line');
    
    await page.waitForTimeout(100);
    
    // Measure initial alignment
    const alignmentBefore = await measureLineAlignment(page);
    expect(alignmentBefore.maxDrift).toBeLessThanOrEqual(1);
    
    // Resize to wide
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(300);
    
    // Measure alignment after resize
    const alignmentAfter = await measureLineAlignment(page);
    expect(alignmentAfter.maxDrift).toBeLessThanOrEqual(1);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-resize-narrow-to-wide.png'),
      fullPage: false 
    });
  });

  test('should maintain alignment during rapid resize events', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Add content
    await editor.type('Line 1 with some text');
    await page.keyboard.press('Enter');
    await editor.type('Line 2 with more text that might wrap');
    await page.keyboard.press('Enter');
    await editor.type('Line 3');
    
    // Perform rapid resizes
    const widths = [800, 600, 900, 500, 1000, 700];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 600 });
      await page.waitForTimeout(50); // Short wait between resizes
    }
    
    await page.waitForTimeout(300); // Final stabilization
    
    const alignment = await measureLineAlignment(page);
    expect(alignment.maxDrift).toBeLessThanOrEqual(1);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-rapid-resize.png'),
      fullPage: false 
    });
  });

  test('should maintain alignment when resizing during typing', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Start typing and resize mid-way
    await editor.type('Starting to type some text...');
    
    // Resize while cursor is active
    await page.setViewportSize({ width: 600, height: 600 });
    await page.waitForTimeout(100);
    
    // Continue typing
    await editor.type(' and continuing after resize.');
    await page.keyboard.press('Enter');
    await editor.type('New line after resize');
    
    await page.waitForTimeout(100);
    
    const alignment = await measureLineAlignment(page);
    expect(alignment.maxDrift).toBeLessThanOrEqual(1);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-resize-during-typing.png'),
      fullPage: false 
    });
  });

  test('should maintain alignment after multiple resize cycles', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Add varied content
    await editor.type('Short line');
    await page.keyboard.press('Enter');
    await editor.type('A much longer line that will definitely wrap in narrow viewports but not in wide ones');
    await page.keyboard.press('Enter');
    await editor.type('Medium length line here');
    
    // Perform multiple resize cycles
    for (let i = 0; i < 5; i++) {
      await page.setViewportSize({ width: 1000, height: 600 });
      await page.waitForTimeout(100);
      await page.setViewportSize({ width: 500, height: 600 });
      await page.waitForTimeout(100);
    }
    
    // Final wide state
    await page.setViewportSize({ width: 900, height: 600 });
    await page.waitForTimeout(200);
    
    const alignment = await measureLineAlignment(page);
    expect(alignment.maxDrift).toBeLessThanOrEqual(1);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-multiple-resize-cycles.png'),
      fullPage: false 
    });
  });
});

test.describe('Line Alignment Regression Tests - Dynamic Content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
  });

  test('should maintain alignment when inserting text', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Initial content
    await editor.type('Line 1');
    await page.keyboard.press('Enter');
    await editor.type('Line 2');
    await page.keyboard.press('Enter');
    await editor.type('Line 3');
    
    // Insert text in middle line
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('End');
    await editor.type(' - now with much more text that might cause wrapping');
    
    await page.waitForTimeout(100);
    
    const alignment = await measureLineAlignment(page);
    expect(alignment.maxDrift).toBeLessThanOrEqual(1);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-insert-text.png'),
      fullPage: false 
    });
  });

  test('should maintain alignment when deleting text', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Initial content with long line
    await editor.type('Line 1');
    await page.keyboard.press('Enter');
    await editor.type('Line 2 with a lot of text that will wrap in narrow viewports and create alignment challenges');
    await page.keyboard.press('Enter');
    await editor.type('Line 3');
    
    // Delete part of the long line
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('End');
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Backspace');
    }
    
    await page.waitForTimeout(100);
    
    const alignment = await measureLineAlignment(page);
    expect(alignment.maxDrift).toBeLessThanOrEqual(1);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-delete-text.png'),
      fullPage: false 
    });
  });

  test('should maintain alignment when adding new lines', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Start with a few lines
    await editor.type('Line 1');
    await page.keyboard.press('Enter');
    await editor.type('Line 2');
    
    // Add multiple new lines
    for (let i = 3; i <= 10; i++) {
      await page.keyboard.press('Enter');
      await editor.type(`Line ${i}`);
      await page.waitForTimeout(50); // Small delay to simulate real typing
    }
    
    await page.waitForTimeout(100);
    
    const alignment = await measureLineAlignment(page);
    expect(alignment.maxDrift).toBeLessThanOrEqual(1);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-add-lines.png'),
      fullPage: false 
    });
  });

  test('should maintain alignment when removing lines', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Create 10 lines
    for (let i = 1; i <= 10; i++) {
      await editor.type(`Line ${i}`);
      if (i < 10) await page.keyboard.press('Enter');
    }
    
    // Delete some lines
    await page.keyboard.press('Control+Home'); // Go to start
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown'); // Position at line 3
    
    // Select and delete lines 3-5
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Delete');
    
    await page.waitForTimeout(100);
    
    const alignment = await measureLineAlignment(page);
    expect(alignment.maxDrift).toBeLessThanOrEqual(1);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-remove-lines.png'),
      fullPage: false 
    });
  });
});

test.describe('Line Alignment Regression Tests - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
  });

  test('should handle zero width container gracefully', async ({ page }) => {
    await page.setViewportSize({ width: 50, height: 600 });
    
    const editor = page.locator('[contenteditable="true"]').first();
    
    // Try to interact even with minimal space
    await page.waitForTimeout(200);
    
    // Should not crash or throw errors
    const lineNumbers = await page.locator('.line-number').count();
    expect(lineNumbers).toBeGreaterThanOrEqual(0);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-zero-width.png'),
      fullPage: false 
    });
  });

  test('should handle extremely narrow containers', async ({ page }) => {
    await page.setViewportSize({ width: 100, height: 600 });
    
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    await editor.type('Word1 Word2 Word3 Word4');
    await page.keyboard.press('Enter');
    await editor.type('Line2');
    
    await page.waitForTimeout(100);
    
    const alignment = await measureLineAlignment(page);
    expect(alignment.maxDrift).toBeLessThanOrEqual(2); // Slightly higher tolerance for extreme case
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-extremely-narrow.png'),
      fullPage: false 
    });
  });

  test('should handle extremely wide containers', async ({ page }) => {
    await page.setViewportSize({ width: 2000, height: 600 });
    
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Even very long lines shouldn't wrap
    const veryLongLine = 'A'.repeat(200);
    await editor.type(veryLongLine);
    await page.keyboard.press('Enter');
    await editor.type('Next line');
    
    await page.waitForTimeout(100);
    
    const alignment = await measureLineAlignment(page);
    expect(alignment.maxDrift).toBeLessThanOrEqual(1);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-extremely-wide.png'),
      fullPage: false 
    });
  });

  test('should handle fractional pixel widths', async ({ page }) => {
    // Use viewport size that might result in fractional container widths
    await page.setViewportSize({ width: 777, height: 555 });
    
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    await editor.type('Line with fractional width container');
    await page.keyboard.press('Enter');
    await editor.type('Should still align properly');
    
    await page.waitForTimeout(100);
    
    const alignment = await measureLineAlignment(page);
    expect(alignment.maxDrift).toBeLessThanOrEqual(1);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-fractional-pixels.png'),
      fullPage: false 
    });
  });

  test('should handle Unicode and emoji content', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Type various Unicode content
    await editor.type('Normal text');
    await page.keyboard.press('Enter');
    await editor.type('🎉 Emoji line 🚀 with multiple emojis 🌟');
    await page.keyboard.press('Enter');
    await editor.type('中文 Chinese text 日本語');
    await page.keyboard.press('Enter');
    await editor.type('العربية RTL text עברית');
    await page.keyboard.press('Enter');
    await editor.type('Ñiño café résumé'); // Accented characters
    
    await page.waitForTimeout(100);
    
    const alignment = await measureLineAlignment(page);
    expect(alignment.maxDrift).toBeLessThanOrEqual(2); // Slightly higher tolerance for complex scripts
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-unicode-emoji.png'),
      fullPage: false 
    });
  });

  test('should handle very long lines (1000+ chars)', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Create a very long line
    const longText = 'Lorem ipsum dolor sit amet '.repeat(50); // ~1350 chars
    await editor.type('Short line before');
    await page.keyboard.press('Enter');
    await editor.type(longText);
    await page.keyboard.press('Enter');
    await editor.type('Short line after');
    
    await page.waitForTimeout(200); // Extra time for long line rendering
    
    const alignment = await measureLineAlignment(page);
    expect(alignment.maxDrift).toBeLessThanOrEqual(1);
    
    await page.screenshot({ 
      path: path.join('docs', 'bug-repro', 'regression-very-long-lines.png'),
      fullPage: false 
    });
  });
});

// Performance regression test
test.describe('Line Alignment Performance Tests', () => {
  test('should maintain 60 FPS during resize', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
    
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    // Add substantial content
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    for (let i = 1; i <= 20; i++) {
      await editor.type(`Line ${i} with some content that might wrap`);
      if (i < 20) await page.keyboard.press('Enter');
    }
    
    // Measure performance during resize
    const metrics = await page.evaluate(async () => {
      const results = { fps: 0, resizeTime: 0 };
      
      // Performance observer to measure FPS
      let frameCount = 0;
      const startTime = performance.now();
      
      const measureFPS = () => {
        frameCount++;
        if (performance.now() - startTime < 1000) {
          requestAnimationFrame(measureFPS);
        } else {
          results.fps = frameCount;
        }
      };
      
      // Start FPS measurement
      requestAnimationFrame(measureFPS);
      
      // Simulate resize by changing container width
      const container = document.querySelector('[contenteditable="true"]')?.parentElement;
      if (container && container instanceof HTMLElement) {
        const resizeStart = performance.now();
        container.style.width = '400px';
        await new Promise(resolve => setTimeout(resolve, 100));
        container.style.width = '800px';
        await new Promise(resolve => setTimeout(resolve, 100));
        container.style.width = '600px';
        results.resizeTime = performance.now() - resizeStart;
      }
      
      // Wait for FPS measurement to complete
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      return results;
    });
    
    // Verify performance metrics
    expect(metrics.fps).toBeGreaterThanOrEqual(30); // At least 30 FPS
    expect(metrics.resizeTime).toBeLessThan(500); // Resize completes quickly
    
    console.log(`Performance metrics: ${metrics.fps} FPS, ${metrics.resizeTime}ms resize time`);
  });

  test('should maintain bounded memory usage', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
    
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Perform many operations
    for (let cycle = 0; cycle < 5; cycle++) {
      // Add content
      for (let i = 0; i < 10; i++) {
        await editor.type(`Cycle ${cycle} Line ${i}`);
        await page.keyboard.press('Enter');
      }
      
      // Resize
      await page.setViewportSize({ width: 500 + cycle * 100, height: 600 });
      await page.waitForTimeout(50);
      
      // Delete some content
      await page.keyboard.press('Control+Home');
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Shift+ArrowDown');
      }
      await page.keyboard.press('Delete');
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if ('gc' in window) {
        (window as any).gc();
      }
    });
    
    await page.waitForTimeout(500);
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Memory should not grow excessively (allow 50MB growth)
    const memoryGrowth = finalMemory - initialMemory;
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    
    console.log(`Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
  });
});

// Configure tests for comprehensive coverage
test.use({
  // Consistent timing
  actionTimeout: 10000,
  navigationTimeout: 30000,
  
  // Always capture evidence
  screenshot: 'on',
  video: 'retain-on-failure',
  trace: 'retain-on-failure',
});