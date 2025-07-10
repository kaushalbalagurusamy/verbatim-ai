/**
 * Virtual Scrolling Tests - Playwright tests for line number alignment and performance
 * Tests virtual scrolling implementation across different zoom levels and document sizes
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Virtual Scrolling Editor', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:8080/test/performance');
    await page.waitForLoadState('networkidle');
  });
  
  test.afterEach(async () => {
    await page.close();
  });
  
  /**
   * Test line number alignment at different zoom levels
   */
  test.describe('Line Number Alignment', () => {
    const zoomLevels = [50, 75, 100, 125, 150, 175, 200];
    
    for (const zoom of zoomLevels) {
      test(`should maintain alignment at ${zoom}% zoom`, async () => {
        // Set zoom level
        await page.evaluate((zoomLevel) => {
          document.body.style.zoom = `${zoomLevel}%`;
        }, zoom);
        
        // Generate medium document
        await page.selectOption('select', 'medium');
        await page.click('button:has-text("Generate Document")');
        await page.waitForTimeout(1000); // Wait for generation
        
        // Take screenshot of initial state
        const beforeScroll = await page.screenshot({
          clip: { x: 0, y: 100, width: 800, height: 600 }
        });
        
        // Scroll to middle
        await page.evaluate(() => {
          const scrollContainer = document.querySelector('.editor-scroll-container');
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight / 2;
          }
        });
        await page.waitForTimeout(500); // Wait for render
        
        // Check line number alignment
        const lineNumbers = await page.$$eval('.line-number', elements => 
          elements.map(el => ({
            number: el.textContent,
            top: el.getBoundingClientRect().top,
            height: el.getBoundingClientRect().height
          }))
        );
        
        const editorLines = await page.$$eval('.editor-block', elements =>
          elements.map(el => ({
            top: el.getBoundingClientRect().top,
            height: el.getBoundingClientRect().height
          }))
        );
        
        // Verify alignment
        for (let i = 0; i < Math.min(lineNumbers.length, editorLines.length); i++) {
          const lineNumber = lineNumbers[i];
          const editorLine = editorLines[i];
          
          // Allow 1px tolerance for rounding
          expect(Math.abs(lineNumber.top - editorLine.top)).toBeLessThanOrEqual(1);
        }
        
        // Take screenshot after scroll
        const afterScroll = await page.screenshot({
          clip: { x: 0, y: 100, width: 800, height: 600 }
        });
        
        // Visual regression test (would need baseline images)
        // expect(afterScroll).toMatchSnapshot(`alignment-${zoom}-percent.png`);
      });
    }
  });
  
  /**
   * Test scrolling performance
   */
  test.describe('Scrolling Performance', () => {
    test('should maintain 60 FPS on 100KB document', async () => {
      // Generate 100KB document
      await page.selectOption('select', 'medium');
      await page.click('button:has-text("Generate Document")');
      await page.waitForTimeout(2000); // Wait for generation
      
      // Start performance monitoring
      const metrics = await page.evaluate(async () => {
        const startTime = performance.now();
        const frameTimings: number[] = [];
        let lastFrameTime = startTime;
        
        return new Promise<{ avgFPS: number; minFPS: number; droppedFrames: number }>((resolve) => {
          let frameCount = 0;
          let droppedFrames = 0;
          
          const measureFrame = () => {
            const currentTime = performance.now();
            const frameTime = currentTime - lastFrameTime;
            
            if (frameTime > 0) {
              frameTimings.push(1000 / frameTime);
              if (frameTime > 33.33) { // More than 2 frames at 60 FPS
                droppedFrames++;
              }
            }
            
            lastFrameTime = currentTime;
            frameCount++;
            
            if (frameCount < 180) { // Measure for ~3 seconds at 60 FPS
              requestAnimationFrame(measureFrame);
            } else {
              const avgFPS = frameTimings.reduce((a, b) => a + b, 0) / frameTimings.length;
              const minFPS = Math.min(...frameTimings);
              resolve({ avgFPS, minFPS, droppedFrames });
            }
          };
          
          // Start scrolling
          const scrollContainer = document.querySelector('.editor-scroll-container') as HTMLElement;
          if (scrollContainer) {
            // Smooth scroll to bottom
            scrollContainer.scrollTo({
              top: scrollContainer.scrollHeight,
              behavior: 'smooth'
            });
          }
          
          requestAnimationFrame(measureFrame);
        });
      });
      
      // Assert performance metrics
      expect(metrics.avgFPS).toBeGreaterThanOrEqual(58); // Allow small variance
      expect(metrics.minFPS).toBeGreaterThanOrEqual(30); // No severe drops
      expect(metrics.droppedFrames).toBeLessThan(10); // Less than 10 dropped frames
    });
    
    test('should handle rapid scrolling without layout thrashing', async () => {
      // Generate large document
      await page.selectOption('select', 'large');
      await page.click('button:has-text("Generate Document")');
      await page.waitForTimeout(3000); // Wait for generation
      
      // Measure layout recalculations during rapid scroll
      const layoutMetrics = await page.evaluate(async () => {
        const observer = new PerformanceObserver((list) => {});
        observer.observe({ entryTypes: ['layout'] });
        
        const scrollContainer = document.querySelector('.editor-scroll-container') as HTMLElement;
        const startTime = performance.now();
        let layoutCount = 0;
        
        // Rapid scroll simulation
        for (let i = 0; i < 20; i++) {
          scrollContainer.scrollTop = (scrollContainer.scrollHeight / 20) * i;
          await new Promise(r => setTimeout(r, 50));
        }
        
        const duration = performance.now() - startTime;
        
        // Get layout entries
        const entries = performance.getEntriesByType('measure').filter(
          entry => entry.name.includes('layout')
        );
        
        return {
          duration,
          layoutCount: entries.length,
          avgLayoutTime: entries.reduce((sum, e) => sum + e.duration, 0) / entries.length
        };
      });
      
      // Assert no excessive layouts
      expect(layoutMetrics.layoutCount).toBeLessThan(50); // Reasonable number of layouts
      expect(layoutMetrics.avgLayoutTime).toBeLessThan(10); // Fast layout times
    });
  });
  
  /**
   * Test memory usage
   */
  test.describe('Memory Management', () => {
    test('should maintain constant memory with large documents', async () => {
      // Skip if performance.memory is not available
      const hasMemoryAPI = await page.evaluate(() => 'memory' in performance);
      if (!hasMemoryAPI) {
        test.skip();
        return;
      }
      
      // Generate small document and measure baseline
      await page.selectOption('select', 'small');
      await page.click('button:has-text("Generate Document")');
      await page.waitForTimeout(1000);
      
      const baselineMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize / 1048576; // MB
        }
        return 0;
      });
      
      // Generate large document
      await page.selectOption('select', 'large');
      await page.click('button:has-text("Generate Document")');
      await page.waitForTimeout(3000);
      
      // Scroll through document
      await page.evaluate(async () => {
        const scrollContainer = document.querySelector('.editor-scroll-container') as HTMLElement;
        for (let i = 0; i <= 10; i++) {
          scrollContainer.scrollTop = (scrollContainer.scrollHeight / 10) * i;
          await new Promise(r => setTimeout(r, 200));
        }
      });
      
      // Measure memory after scrolling
      const afterScrollMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize / 1048576; // MB
        }
        return 0;
      });
      
      // Memory should not increase dramatically (allow 50MB increase)
      expect(afterScrollMemory - baselineMemory).toBeLessThan(50);
    });
  });
  
  /**
   * Test virtual scrolling accuracy
   */
  test.describe('Virtual Scrolling Accuracy', () => {
    test('should render correct content in viewport', async () => {
      // Generate document with numbered lines
      await page.evaluate(() => {
        const lines = Array.from({ length: 1000 }, (_, i) => `Line ${i + 1}: Test content`);
        const editor = document.querySelector('.editor-content') as HTMLElement;
        if (editor) {
          editor.textContent = lines.join('\n');
          editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await page.waitForTimeout(500);
      
      // Scroll to specific positions and verify content
      const positions = [0, 0.25, 0.5, 0.75, 1];
      
      for (const position of positions) {
        await page.evaluate((pos) => {
          const scrollContainer = document.querySelector('.editor-scroll-container') as HTMLElement;
          scrollContainer.scrollTop = scrollContainer.scrollHeight * pos;
        }, position);
        
        await page.waitForTimeout(200);
        
        // Get visible line numbers
        const visibleLines = await page.$$eval('.line-number:visible', elements =>
          elements.map(el => parseInt(el.textContent || '0'))
        );
        
        // Verify line numbers are sequential
        for (let i = 1; i < visibleLines.length; i++) {
          expect(visibleLines[i]).toBe(visibleLines[i - 1] + 1);
        }
        
        // Verify approximately correct position
        const expectedLine = Math.floor(1000 * position) || 1;
        const firstVisible = visibleLines[0];
        expect(Math.abs(firstVisible - expectedLine)).toBeLessThan(10);
      }
    });
  });
  
  /**
   * Test edge cases
   */
  test.describe('Edge Cases', () => {
    test('should handle empty document', async () => {
      // Ensure editor is empty
      const hasContent = await page.$eval('.editor-content', el => el.textContent?.length || 0);
      expect(hasContent).toBe(0);
      
      // Should show placeholder
      const placeholder = await page.$eval('.editor-content', el => 
        el.getAttribute('aria-placeholder')
      );
      expect(placeholder).toBeTruthy();
    });
    
    test('should handle single line document', async () => {
      await page.evaluate(() => {
        const editor = document.querySelector('.editor-content') as HTMLElement;
        if (editor) {
          editor.textContent = 'Single line of text';
          editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      
      await page.waitForTimeout(200);
      
      const lineCount = await page.$$eval('.line-number', els => els.length);
      expect(lineCount).toBe(1);
    });
    
    test('should handle rapid document changes', async () => {
      // Rapidly change document content
      for (let i = 0; i < 10; i++) {
        await page.evaluate((index) => {
          const editor = document.querySelector('.editor-content') as HTMLElement;
          if (editor) {
            editor.textContent = `Content version ${index}\n`.repeat(100);
            editor.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, i);
        
        await page.waitForTimeout(50);
      }
      
      // Verify final state is correct
      const finalContent = await page.$eval('.editor-content', el => el.textContent);
      expect(finalContent).toContain('Content version 9');
      
      const lineCount = await page.$$eval('.line-number', els => els.length);
      expect(lineCount).toBeGreaterThan(0);
    });
  });
});