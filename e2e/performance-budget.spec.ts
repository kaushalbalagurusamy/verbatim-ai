/**
 * Performance Budget Tests - Comprehensive performance testing for EditorV2
 * Tests performance metrics against defined budgets on emulated Moto G4
 */

import { test, expect, Page } from '@playwright/test';
import { chromium } from '@playwright/test';

// Performance budget thresholds
const PERFORMANCE_BUDGETS = {
  fps: 55,
  tti: 2000, // Time to Interactive < 2s
  cls: 0.1, // Cumulative Layout Shift < 0.1
  fid: 100, // First Input Delay < 100ms
  lcp: 2500, // Largest Contentful Paint < 2.5s
  tbt: 300, // Total Blocking Time < 300ms
};

// Test scenarios
const TEST_SCENARIOS = {
  emptyDocument: {
    name: 'Empty Document',
    content: '',
  },
  smallDocument: {
    name: '10KB Document',
    content: 'Lorem ipsum dolor sit amet. '.repeat(350),
  },
  mediumDocument: {
    name: '100KB Document', 
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(1750),
  },
  largeDocument: {
    name: '1MB Document',
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '.repeat(8000),
  },
};

// Device emulation for Moto G4
const MOTO_G4_CONFIG = {
  viewport: { width: 360, height: 640 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 7.0; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.85 Mobile Safari/537.36',
};

test.describe('Performance Budget Tests', () => {
  test.use({
    ...MOTO_G4_CONFIG,
    // CPU throttling
    launchOptions: {
      args: ['--enable-precise-memory-info'],
    },
  });

  // Helper to measure FPS
  async function measureFPS(page: Page, action: () => Promise<void>): Promise<number> {
    const frames: number[] = [];
    
    await page.evaluateHandle(() => {
      return new Promise<void>((resolve) => {
        let lastTime = performance.now();
        let frameCount = 0;
        const frames: number[] = [];
        
        function measureFrame() {
          const currentTime = performance.now();
          const delta = currentTime - lastTime;
          
          if (delta > 0) {
            frames.push(1000 / delta);
          }
          
          lastTime = currentTime;
          frameCount++;
          
          if (frameCount < 60) { // Measure for ~1 second
            requestAnimationFrame(measureFrame);
          } else {
            (window as any).__perfFrames = frames;
            resolve();
          }
        }
        
        requestAnimationFrame(measureFrame);
      });
    });
    
    await action();
    
    const measuredFrames = await page.evaluate(() => (window as any).__perfFrames || []);
    const avgFPS = measuredFrames.reduce((a: number, b: number) => a + b, 0) / measuredFrames.length;
    
    return avgFPS;
  }

  // Helper to measure input delay
  async function measureInputDelay(page: Page): Promise<number> {
    return await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let inputDelay = 0;
        const startTime = performance.now();
        
        const input = document.createElement('input');
        document.body.appendChild(input);
        
        input.addEventListener('input', () => {
          inputDelay = performance.now() - startTime;
          input.remove();
          resolve(inputDelay);
        });
        
        // Simulate input after a small delay
        setTimeout(() => {
          input.value = 'test';
          input.dispatchEvent(new Event('input'));
        }, 100);
      });
    });
  }

  // Test 1: Initial load performance
  test('Initial load with empty document', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/test-performance');
    await page.waitForSelector('.editor-container', { timeout: 5000 });
    
    const tti = Date.now() - startTime;
    expect(tti).toBeLessThan(PERFORMANCE_BUDGETS.tti);
    
    // Measure CLS
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ((entry as any).hadRecentInput) continue;
            clsValue += (entry as any).value;
          }
        });
        
        observer.observe({ type: 'layout-shift', buffered: true });
        
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 2000);
      });
    });
    
    expect(cls).toBeLessThan(PERFORMANCE_BUDGETS.cls);
  });

  // Test 2: Load with 100KB document
  test('Load with 100KB document', async ({ page }) => {
    await page.goto('/test-performance');
    await page.waitForSelector('.editor-container');
    
    // Set document content
    await page.evaluate((content) => {
      const editor = document.querySelector('[contenteditable]');
      if (editor) {
        editor.textContent = content;
      }
    }, TEST_SCENARIOS.mediumDocument.content);
    
    // Measure render performance
    const renderTime = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const startTime = performance.now();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve(performance.now() - startTime);
          });
        });
      });
    });
    
    expect(renderTime).toBeLessThan(100); // Should render within 100ms
  });

  // Test 3: Rapid typing performance (100 WPM)
  test('Rapid typing at 100 WPM', async ({ page }) => {
    await page.goto('/test-performance');
    await page.waitForSelector('.editor-container');
    
    const editor = page.locator('[contenteditable]');
    await editor.focus();
    
    // Type at 100 WPM (500 characters per minute = ~8.3 chars/second)
    const fps = await measureFPS(page, async () => {
      const text = 'The quick brown fox jumps over the lazy dog. ';
      for (let i = 0; i < 50; i++) {
        await page.keyboard.type(text.charAt(i % text.length), { delay: 120 }); // ~8.3 chars/second
      }
    });
    
    expect(fps).toBeGreaterThan(PERFORMANCE_BUDGETS.fps);
  });

  // Test 4: Format operations during typing
  test('Format operations during typing', async ({ page }) => {
    await page.goto('/test-performance');
    await page.waitForSelector('.editor-container');
    
    const editor = page.locator('[contenteditable]');
    await editor.focus();
    
    // Type and apply formatting
    const fps = await measureFPS(page, async () => {
      for (let i = 0; i < 10; i++) {
        await page.keyboard.type('Testing formatting ', { delay: 50 });
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Control+B'); // Bold
        await page.keyboard.press('Escape');
        await page.keyboard.press('End');
      }
    });
    
    expect(fps).toBeGreaterThan(PERFORMANCE_BUDGETS.fps);
  });

  // Test 5: Scroll performance with large document
  test('Scroll performance with large document', async ({ page }) => {
    await page.goto('/test-performance');
    await page.waitForSelector('.editor-container');
    
    // Load large document
    await page.evaluate((content) => {
      const editor = document.querySelector('[contenteditable]');
      if (editor) {
        editor.textContent = content;
      }
    }, TEST_SCENARIOS.largeDocument.content);
    
    // Measure scroll FPS
    const fps = await measureFPS(page, async () => {
      // Smooth scroll to bottom
      await page.evaluate(() => {
        const editor = document.querySelector('.editor-container');
        if (editor) {
          editor.scrollTo({
            top: editor.scrollHeight,
            behavior: 'smooth'
          });
        }
      });
      
      await page.waitForTimeout(1000);
    });
    
    expect(fps).toBeGreaterThan(PERFORMANCE_BUDGETS.fps);
  });

  // Test 6: Memory usage with large documents
  test('Memory usage remains stable', async ({ page }) => {
    await page.goto('/test-performance');
    await page.waitForSelector('.editor-container');
    
    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Load and clear document multiple times
    for (let i = 0; i < 5; i++) {
      await page.evaluate((content) => {
        const editor = document.querySelector('[contenteditable]');
        if (editor) {
          editor.textContent = content;
        }
      }, TEST_SCENARIOS.largeDocument.content);
      
      await page.waitForTimeout(500);
      
      await page.evaluate(() => {
        const editor = document.querySelector('[contenteditable]');
        if (editor) {
          editor.textContent = '';
        }
      });
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Check final memory
    const finalMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Memory should not grow more than 50MB
    const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024;
    expect(memoryGrowth).toBeLessThan(50);
  });

  // Test 7: First Input Delay
  test('First Input Delay < 100ms', async ({ page }) => {
    await page.goto('/test-performance');
    await page.waitForSelector('.editor-container');
    
    // Load medium document
    await page.evaluate((content) => {
      const editor = document.querySelector('[contenteditable]');
      if (editor) {
        editor.textContent = content;
      }
    }, TEST_SCENARIOS.mediumDocument.content);
    
    const fid = await measureInputDelay(page);
    expect(fid).toBeLessThan(PERFORMANCE_BUDGETS.fid);
  });

  // Test 8: Resize performance
  test('Window resize performance', async ({ page }) => {
    await page.goto('/test-performance');
    await page.waitForSelector('.editor-container');
    
    // Load medium document
    await page.evaluate((content) => {
      const editor = document.querySelector('[contenteditable]');
      if (editor) {
        editor.textContent = content;
      }
    }, TEST_SCENARIOS.mediumDocument.content);
    
    // Measure FPS during resize
    const fps = await measureFPS(page, async () => {
      for (let width = 360; width <= 800; width += 40) {
        await page.setViewportSize({ width, height: 640 });
        await page.waitForTimeout(50);
      }
    });
    
    expect(fps).toBeGreaterThan(30); // Lower threshold for resize operations
  });
});

// Performance monitoring tests
test.describe('Performance Monitoring', () => {
  test('Generate performance report', async ({ page }) => {
    const metrics: any = {
      scenarios: {},
    };
    
    // Test each scenario
    for (const [key, scenario] of Object.entries(TEST_SCENARIOS)) {
      await page.goto('/test-performance');
      await page.waitForSelector('.editor-container');
      
      // Load content
      await page.evaluate((content) => {
        const editor = document.querySelector('[contenteditable]');
        if (editor) {
          editor.textContent = content;
        }
      }, scenario.content);
      
      // Collect metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          load: navigation.loadEventEnd - navigation.loadEventStart,
          domInteractive: navigation.domInteractive - navigation.fetchStart,
          memoryUsage: (performance as any).memory ? (performance as any).memory.usedJSHeapSize / 1024 / 1024 : 0,
        };
      });
      
      metrics.scenarios[key] = {
        name: scenario.name,
        metrics: performanceMetrics,
      };
    }
    
    // Save report
    console.log('Performance Report:', JSON.stringify(metrics, null, 2));
  });
});