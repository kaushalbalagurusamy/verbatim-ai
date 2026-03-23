/**
 * Performance Test Suite - Manual and automated performance testing utilities
 * Provides tools for measuring and analyzing editor performance
 */

export interface PerformanceTestResult {
  testName: string;
  metrics: {
    avgFPS: number;
    minFPS: number;
    maxFPS: number;
    p95FPS: number;
    avgRenderTime: number;
    maxRenderTime: number;
    totalTime: number;
    frameCount: number;
  };
  passed: boolean;
  errors: string[];
}

export interface PerformanceTestConfig {
  duration: number; // Test duration in ms
  targetFPS: number;
  maxRenderTime: number; // Max allowed render time in ms
}

export class PerformanceTestSuite {
  private results: PerformanceTestResult[] = [];
  private currentTest: string | null = null;
  private frameTimes: number[] = [];
  private renderTimes: number[] = [];
  private lastFrameTime: number = 0;
  private rafId: number | null = null;
  private startTime: number = 0;

  constructor(private config: PerformanceTestConfig = {
    duration: 5000,
    targetFPS: 55,
    maxRenderTime: 16.67, // 60 FPS threshold
  }) {}

  /**
   * Start a performance test
   */
  async runTest(testName: string, testFn: () => Promise<void>): Promise<PerformanceTestResult> {
    this.currentTest = testName;
    this.frameTimes = [];
    this.renderTimes = [];
    this.startTime = performance.now();
    
    // Start frame monitoring
    this.startFrameMonitoring();
    
    try {
      // Run the test function
      await testFn();
      
      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, this.config.duration));
      
    } finally {
      // Stop monitoring
      this.stopFrameMonitoring();
    }
    
    // Calculate results
    const result = this.calculateResults(testName);
    this.results.push(result);
    
    return result;
  }

  /**
   * Run a typing performance test
   */
  async runTypingTest(
    editor: HTMLElement,
    text: string,
    wpm: number = 100
  ): Promise<PerformanceTestResult> {
    const charDelay = 60000 / (wpm * 5); // Average 5 chars per word
    
    return this.runTest(`Typing Test (${wpm} WPM)`, async () => {
      editor.focus();
      
      for (const char of text) {
        const event = new InputEvent('beforeinput', {
          inputType: 'insertText',
          data: char,
          bubbles: true,
          cancelable: true,
        });
        
        editor.dispatchEvent(event);
        
        // Also update content if event wasn't prevented
        if (!event.defaultPrevented) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(char));
            range.collapse(false);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, charDelay));
      }
    });
  }

  /**
   * Run a scroll performance test
   */
  async runScrollTest(
    container: HTMLElement,
    scrollDistance: number
  ): Promise<PerformanceTestResult> {
    return this.runTest('Scroll Test', async () => {
      const steps = 60; // Smooth scroll over 60 frames
      const stepSize = scrollDistance / steps;
      
      for (let i = 0; i < steps; i++) {
        container.scrollTop += stepSize;
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    });
  }

  /**
   * Run a format operation test
   */
  async runFormatTest(
    editor: HTMLElement,
    operations: Array<{ command: string; value?: string }>
  ): Promise<PerformanceTestResult> {
    return this.runTest('Format Operations Test', async () => {
      editor.focus();
      
      for (const op of operations) {
        // Select all content
        document.execCommand('selectAll');
        
        // Apply formatting
        document.execCommand(op.command, false, op.value);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });
  }

  /**
   * Run a document load test
   */
  async runLoadTest(
    editor: HTMLElement,
    content: string
  ): Promise<PerformanceTestResult> {
    return this.runTest(`Document Load Test (${Math.round(content.length / 1024)}KB)`, async () => {
      const startLoad = performance.now();
      
      editor.textContent = content;
      
      // Trigger layout
      void editor.offsetHeight;
      
      // Wait for next frame
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      const loadTime = performance.now() - startLoad;
      this.renderTimes.push(loadTime);
    });
  }

  /**
   * Generate a performance report
   */
  generateReport(): string {
    let report = '# Performance Test Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += `## Test Configuration\n`;
    report += `- Target FPS: ${this.config.targetFPS}\n`;
    report += `- Max Render Time: ${this.config.maxRenderTime}ms\n`;
    report += `- Test Duration: ${this.config.duration}ms\n\n`;
    
    report += '## Test Results\n\n';
    
    for (const result of this.results) {
      report += `### ${result.testName}\n`;
      report += `- **Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      report += `- **Average FPS**: ${result.metrics.avgFPS.toFixed(2)}\n`;
      report += `- **Min FPS**: ${result.metrics.minFPS.toFixed(2)}\n`;
      report += `- **Max FPS**: ${result.metrics.maxFPS.toFixed(2)}\n`;
      report += `- **95th Percentile FPS**: ${result.metrics.p95FPS.toFixed(2)}\n`;
      report += `- **Avg Render Time**: ${result.metrics.avgRenderTime.toFixed(2)}ms\n`;
      report += `- **Max Render Time**: ${result.metrics.maxRenderTime.toFixed(2)}ms\n`;
      report += `- **Total Time**: ${result.metrics.totalTime.toFixed(2)}ms\n`;
      report += `- **Frame Count**: ${result.metrics.frameCount}\n`;
      
      if (result.errors.length > 0) {
        report += `- **Errors**:\n`;
        result.errors.forEach(error => {
          report += `  - ${error}\n`;
        });
      }
      
      report += '\n';
    }
    
    return report;
  }

  /**
   * Export results as JSON
   */
  exportResults(): object {
    return {
      config: this.config,
      timestamp: new Date().toISOString(),
      results: this.results,
    };
  }

  private startFrameMonitoring() {
    this.lastFrameTime = performance.now();
    
    const measureFrame = (currentTime: number) => {
      if (this.lastFrameTime > 0) {
        const frameTime = currentTime - this.lastFrameTime;
        this.frameTimes.push(frameTime);
        
        // Measure render time
        const renderStart = performance.now();
        // Force layout/paint
        void document.body.offsetHeight;
        const renderTime = performance.now() - renderStart;
        this.renderTimes.push(renderTime);
      }
      
      this.lastFrameTime = currentTime;
      
      if (performance.now() - this.startTime < this.config.duration) {
        this.rafId = requestAnimationFrame(measureFrame);
      }
    };
    
    this.rafId = requestAnimationFrame(measureFrame);
  }

  private stopFrameMonitoring() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private calculateResults(testName: string): PerformanceTestResult {
    const fps = this.frameTimes.map(time => 1000 / time);
    fps.sort((a, b) => a - b);
    
    const avgFPS = fps.reduce((a, b) => a + b, 0) / fps.length || 0;
    const minFPS = fps[0] || 0;
    const maxFPS = fps[fps.length - 1] || 0;
    const p95Index = Math.floor(fps.length * 0.95);
    const p95FPS = fps[p95Index] || 0;
    
    const avgRenderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length || 0;
    const maxRenderTime = Math.max(...this.renderTimes, 0);
    
    const totalTime = performance.now() - this.startTime;
    
    const errors: string[] = [];
    
    if (avgFPS < this.config.targetFPS) {
      errors.push(`Average FPS (${avgFPS.toFixed(2)}) below target (${this.config.targetFPS})`);
    }
    
    if (maxRenderTime > this.config.maxRenderTime) {
      errors.push(`Max render time (${maxRenderTime.toFixed(2)}ms) exceeds limit (${this.config.maxRenderTime}ms)`);
    }
    
    return {
      testName,
      metrics: {
        avgFPS,
        minFPS,
        maxFPS,
        p95FPS,
        avgRenderTime,
        maxRenderTime,
        totalTime,
        frameCount: this.frameTimes.length,
      },
      passed: errors.length === 0,
      errors,
    };
  }
}

// Export test utilities
export function measureFPS(duration: number = 1000): Promise<number> {
  return new Promise((resolve) => {
    const frames: number[] = [];
    let lastTime = performance.now();
    let rafId: number;
    const startTime = performance.now();
    
    function measure(currentTime: number) {
      if (lastTime > 0) {
        const fps = 1000 / (currentTime - lastTime);
        frames.push(fps);
      }
      
      lastTime = currentTime;
      
      if (currentTime - startTime < duration) {
        rafId = requestAnimationFrame(measure);
      } else {
        const avgFPS = frames.reduce((a, b) => a + b, 0) / frames.length;
        resolve(avgFPS);
      }
    }
    
    rafId = requestAnimationFrame(measure);
  });
}

export function measureInputLatency(): Promise<number> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    
    const startTime = performance.now();
    
    input.addEventListener('input', () => {
      const latency = performance.now() - startTime;
      input.remove();
      resolve(latency);
    });
    
    // Trigger input event
    setTimeout(() => {
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
    }, 0);
  });
}