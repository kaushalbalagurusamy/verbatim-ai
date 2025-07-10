/**
 * Performance Monitor - FPS tracking and performance metrics for virtual scrolling
 * Measures frame rates during scroll operations and provides performance analytics
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  droppedFrames: number;
  totalFrames: number;
  memoryUsage?: number;
  scrollingFPS: number[];
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
}

export class PerformanceMonitor {
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fps: number = 0;
  private frameTimeHistory: number[] = [];
  private scrollingFPSHistory: number[] = [];
  private droppedFrames: number = 0;
  private rafId: number | null = null;
  private isMonitoring: boolean = false;
  private targetFPS: number = 60;
  private targetFrameTime: number = 1000 / 60; // ~16.67ms
  
  /**
   * Start monitoring performance
   */
  start(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.frameTimeHistory = [];
    this.scrollingFPSHistory = [];
    this.droppedFrames = 0;
    
    this.tick();
  }
  
  /**
   * Stop monitoring
   */
  stop(): void {
    this.isMonitoring = false;
    
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
  
  /**
   * Main animation frame loop
   */
  private tick = (): void => {
    if (!this.isMonitoring) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    
    // Calculate FPS
    if (deltaTime > 0) {
      this.fps = 1000 / deltaTime;
      this.frameTimeHistory.push(deltaTime);
      
      // Keep only last 60 frames
      if (this.frameTimeHistory.length > 60) {
        this.frameTimeHistory.shift();
      }
      
      // Track dropped frames (frame time > 2x target)
      if (deltaTime > this.targetFrameTime * 2) {
        this.droppedFrames++;
      }
    }
    
    this.frameCount++;
    this.lastTime = currentTime;
    
    this.rafId = requestAnimationFrame(this.tick);
  };
  
  /**
   * Mark a scroll frame for FPS tracking
   */
  markScrollFrame(): void {
    if (this.fps > 0) {
      this.scrollingFPSHistory.push(this.fps);
      
      // Keep only last 300 frames (5 seconds at 60 FPS)
      if (this.scrollingFPSHistory.length > 300) {
        this.scrollingFPSHistory.shift();
      }
    }
  }
  
  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const averageFrameTime = this.frameTimeHistory.length > 0
      ? this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length
      : 0;
    
    const averageFPS = averageFrameTime > 0 ? 1000 / averageFrameTime : 0;
    
    const scrollingFPS = [...this.scrollingFPSHistory];
    const minFPS = scrollingFPS.length > 0 ? Math.min(...scrollingFPS) : 0;
    const maxFPS = scrollingFPS.length > 0 ? Math.max(...scrollingFPS) : 0;
    const avgScrollFPS = scrollingFPS.length > 0
      ? scrollingFPS.reduce((sum, fps) => sum + fps, 0) / scrollingFPS.length
      : 0;
    
    // Get memory usage if available
    let memoryUsage: number | undefined;
    if ('memory' in performance) {
      memoryUsage = (performance as any).memory.usedJSHeapSize / 1048576; // Convert to MB
    }
    
    return {
      fps: this.fps,
      frameTime: averageFrameTime,
      droppedFrames: this.droppedFrames,
      totalFrames: this.frameCount,
      memoryUsage,
      scrollingFPS,
      averageFPS: avgScrollFPS,
      minFPS,
      maxFPS
    };
  }
  
  /**
   * Reset all metrics
   */
  reset(): void {
    this.frameCount = 0;
    this.fps = 0;
    this.frameTimeHistory = [];
    this.scrollingFPSHistory = [];
    this.droppedFrames = 0;
  }
  
  /**
   * Create a performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    
    return `
Performance Report
==================
Current FPS: ${metrics.fps.toFixed(1)}
Average FPS (scrolling): ${metrics.averageFPS.toFixed(1)}
Min FPS: ${metrics.minFPS.toFixed(1)}
Max FPS: ${metrics.maxFPS.toFixed(1)}
Frame Time: ${metrics.frameTime.toFixed(2)}ms
Dropped Frames: ${metrics.droppedFrames} (${((metrics.droppedFrames / metrics.totalFrames) * 100).toFixed(1)}%)
Total Frames: ${metrics.totalFrames}
Memory Usage: ${metrics.memoryUsage ? metrics.memoryUsage.toFixed(1) + ' MB' : 'N/A'}

Performance Rating: ${this.getPerformanceRating(metrics)}
`;
  }
  
  /**
   * Get performance rating based on metrics
   */
  private getPerformanceRating(metrics: PerformanceMetrics): string {
    if (metrics.averageFPS >= 58) return 'Excellent (60 FPS maintained)';
    if (metrics.averageFPS >= 50) return 'Good (50+ FPS)';
    if (metrics.averageFPS >= 30) return 'Fair (30+ FPS)';
    return 'Poor (Below 30 FPS)';
  }
}

/**
 * Scroll performance tracker
 */
export class ScrollPerformanceTracker {
  private monitor: PerformanceMonitor;
  private isTracking: boolean = false;
  private scrollRAF: number | null = null;
  private lastScrollTime: number = 0;
  private scrollTimeout: NodeJS.Timeout | null = null;
  
  constructor() {
    this.monitor = new PerformanceMonitor();
  }
  
  /**
   * Start tracking scroll performance
   */
  startTracking(element: HTMLElement): void {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.monitor.start();
    
    element.addEventListener('scroll', this.handleScroll, { passive: true });
  }
  
  /**
   * Stop tracking
   */
  stopTracking(element: HTMLElement): void {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    this.monitor.stop();
    
    element.removeEventListener('scroll', this.handleScroll);
    
    if (this.scrollRAF !== null) {
      cancelAnimationFrame(this.scrollRAF);
      this.scrollRAF = null;
    }
    
    if (this.scrollTimeout !== null) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }
  }
  
  /**
   * Handle scroll events
   */
  private handleScroll = (): void => {
    const currentTime = performance.now();
    
    // Mark this as a scroll frame
    this.monitor.markScrollFrame();
    
    // Clear existing timeout
    if (this.scrollTimeout !== null) {
      clearTimeout(this.scrollTimeout);
    }
    
    // Set timeout to detect scroll end
    this.scrollTimeout = setTimeout(() => {
      // Scroll ended, generate report
      console.log('Scroll Performance Report:');
      console.log(this.monitor.generateReport());
    }, 150);
    
    this.lastScrollTime = currentTime;
  };
  
  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return this.monitor.getMetrics();
  }
  
  /**
   * Generate performance report
   */
  generateReport(): string {
    return this.monitor.generateReport();
  }
}

/**
 * Memory usage tracker for virtual scrolling
 */
export class MemoryTracker {
  private samples: Array<{ time: number; usage: number }> = [];
  private maxSamples: number = 100;
  
  /**
   * Take a memory sample
   */
  sample(): void {
    if (!('memory' in performance)) return;
    
    const usage = (performance as any).memory.usedJSHeapSize / 1048576; // MB
    const time = performance.now();
    
    this.samples.push({ time, usage });
    
    // Keep only recent samples
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }
  
  /**
   * Get memory statistics
   */
  getStats(): {
    current: number;
    average: number;
    min: number;
    max: number;
    trend: 'stable' | 'increasing' | 'decreasing';
  } {
    if (this.samples.length === 0) {
      return { current: 0, average: 0, min: 0, max: 0, trend: 'stable' };
    }
    
    const usages = this.samples.map(s => s.usage);
    const current = usages[usages.length - 1];
    const average = usages.reduce((sum, u) => sum + u, 0) / usages.length;
    const min = Math.min(...usages);
    const max = Math.max(...usages);
    
    // Calculate trend from last 10 samples
    let trend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    if (this.samples.length >= 10) {
      const recent = this.samples.slice(-10);
      const firstHalf = recent.slice(0, 5).reduce((sum, s) => sum + s.usage, 0) / 5;
      const secondHalf = recent.slice(5).reduce((sum, s) => sum + s.usage, 0) / 5;
      
      if (secondHalf > firstHalf * 1.1) trend = 'increasing';
      else if (secondHalf < firstHalf * 0.9) trend = 'decreasing';
    }
    
    return { current, average, min, max, trend };
  }
  
  /**
   * Reset samples
   */
  reset(): void {
    this.samples = [];
  }
}