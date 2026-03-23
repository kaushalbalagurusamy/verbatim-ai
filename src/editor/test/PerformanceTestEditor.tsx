/**
 * Performance Test Editor - Test component for virtual scrolling with large documents
 * Generates 100KB+ Lorem Ipsum documents and monitors performance metrics
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VirtualScrollEditor } from '../components/VirtualScrollEditor';
import { ScrollPerformanceTracker, MemoryTracker } from '../utils/performance-monitor';
import '../styles/editor.css';

interface TestMetrics {
  documentSize: string;
  lineCount: number;
  scrollFPS: number;
  memoryUsage: number;
  renderTime: number;
}

export function PerformanceTestEditor() {
  const [content, setContent] = useState<string>('');
  const [metrics, setMetrics] = useState<TestMetrics | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [documentSize, setDocumentSize] = useState<'small' | 'medium' | 'large' | 'xlarge'>('medium');
  
  const scrollTrackerRef = useRef<ScrollPerformanceTracker>(new ScrollPerformanceTracker());
  const memoryTrackerRef = useRef<MemoryTracker>(new MemoryTracker());
  const containerRef = useRef<HTMLDivElement>(null);
  
  /**
   * Generate Lorem Ipsum text
   */
  const generateLoremIpsum = useCallback((targetSizeKB: number): string => {
    const lorem = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;
    
    const targetSizeBytes = targetSizeKB * 1024;
    const loremBytes = new TextEncoder().encode(lorem).length;
    const repetitions = Math.ceil(targetSizeBytes / loremBytes);
    
    const lines: string[] = [];
    for (let i = 0; i < repetitions; i++) {
      // Add line numbers and variations
      lines.push(`${i + 1}. ${lorem}`);
      
      // Add some headers
      if (i % 20 === 0) {
        lines.push(`\n# Header ${Math.floor(i / 20) + 1}\n`);
      }
      
      // Add some code blocks
      if (i % 30 === 0) {
        lines.push(`\`\`\`javascript
function example${i}() {
  console.log("Performance test line ${i}");
  return Math.random() * 1000;
}
\`\`\``);
      }
      
      // Add empty lines for variety
      if (i % 10 === 0) {
        lines.push('');
      }
    }
    
    return lines.join('\n');
  }, []);
  
  /**
   * Generate test document
   */
  const generateDocument = useCallback(async () => {
    setIsGenerating(true);
    
    // Start memory tracking
    memoryTrackerRef.current.reset();
    memoryTrackerRef.current.sample();
    
    const startTime = performance.now();
    
    // Generate content based on size
    const sizeMap = {
      small: 10,    // 10KB
      medium: 100,  // 100KB
      large: 500,   // 500KB
      xlarge: 1000  // 1MB
    };
    
    const sizeKB = sizeMap[documentSize];
    const generatedContent = generateLoremIpsum(sizeKB);
    
    setContent(generatedContent);
    
    // Calculate metrics
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    const sizeInBytes = new TextEncoder().encode(generatedContent).length;
    const lineCount = generatedContent.split('\n').length;
    
    // Sample memory after generation
    memoryTrackerRef.current.sample();
    const memoryStats = memoryTrackerRef.current.getStats();
    
    setMetrics({
      documentSize: `${(sizeInBytes / 1024).toFixed(1)} KB`,
      lineCount,
      scrollFPS: 0,
      memoryUsage: memoryStats.current,
      renderTime
    });
    
    setIsGenerating(false);
    
    // Start scroll tracking after a delay
    setTimeout(() => {
      const scrollContainer = containerRef.current?.querySelector('.editor-scroll-container');
      if (scrollContainer) {
        scrollTrackerRef.current.startTracking(scrollContainer as HTMLElement);
      }
    }, 100);
  }, [documentSize, generateLoremIpsum]);
  
  /**
   * Run automated scroll test
   */
  const runScrollTest = useCallback(async () => {
    const scrollContainer = containerRef.current?.querySelector('.editor-scroll-container') as HTMLElement;
    if (!scrollContainer) return;
    
    console.log('Starting automated scroll test...');
    
    // Reset metrics
    const tracker = scrollTrackerRef.current;
    tracker.stopTracking(scrollContainer);
    tracker.startTracking(scrollContainer);
    
    // Scroll patterns
    const scrollPatterns = [
      // Slow scroll down
      { duration: 3000, to: scrollContainer.scrollHeight * 0.5, easing: 'linear' },
      // Fast scroll up
      { duration: 1000, to: 0, easing: 'ease-out' },
      // Jump to bottom
      { duration: 0, to: scrollContainer.scrollHeight },
      // Smooth scroll to middle
      { duration: 2000, to: scrollContainer.scrollHeight * 0.5, easing: 'ease-in-out' },
      // Rapid small scrolls
      ...Array(10).fill(0).map((_, i) => ({
        duration: 100,
        to: scrollContainer.scrollHeight * (0.4 + i * 0.02),
        easing: 'linear'
      }))
    ];
    
    // Execute scroll patterns
    for (const pattern of scrollPatterns) {
      await animateScroll(scrollContainer, pattern);
      await new Promise(resolve => setTimeout(resolve, 200)); // Pause between patterns
    }
    
    // Get final metrics
    setTimeout(() => {
      const metrics = tracker.getMetrics();
      setMetrics(prev => prev ? {
        ...prev,
        scrollFPS: metrics.averageFPS
      } : null);
      
      console.log('Scroll test complete!');
      console.log(tracker.generateReport());
    }, 500);
  }, []);
  
  /**
   * Animate scroll with easing
   */
  const animateScroll = (
    element: HTMLElement,
    { duration, to, easing }: { duration: number; to: number; easing: string }
  ): Promise<void> => {
    return new Promise(resolve => {
      if (duration === 0) {
        element.scrollTop = to;
        resolve();
        return;
      }
      
      const start = element.scrollTop;
      const distance = to - start;
      const startTime = performance.now();
      
      const easingFunctions: Record<string, (t: number) => number> = {
        linear: (t: number) => t,
        'ease-in': (t: number) => t * t,
        'ease-out': (t: number) => t * (2 - t),
        'ease-in-out': (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      };
      
      const easingFn = easingFunctions[easing] || easingFunctions.linear;
      
      const animate = () => {
        const currentTime = performance.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easingFn(progress);
        
        element.scrollTop = start + distance * easedProgress;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  };
  
  /**
   * Monitor performance during manual scrolling
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (scrollTrackerRef.current) {
        const metrics = scrollTrackerRef.current.getMetrics();
        if (metrics.scrollingFPS.length > 0) {
          setMetrics(prev => prev ? {
            ...prev,
            scrollFPS: metrics.averageFPS
          } : null);
        }
      }
      
      // Update memory usage
      memoryTrackerRef.current.sample();
      const memoryStats = memoryTrackerRef.current.getStats();
      setMetrics(prev => prev ? {
        ...prev,
        memoryUsage: memoryStats.current
      } : null);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="performance-test-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="test-controls" style={{ 
        padding: '20px', 
        background: '#252526', 
        borderBottom: '1px solid #3c3c3c',
        flexShrink: 0
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#cccccc' }}>Virtual Scrolling Performance Test</h2>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <select 
            value={documentSize} 
            onChange={(e) => setDocumentSize(e.target.value as any)}
            style={{
              padding: '5px 10px',
              background: '#3c3c3c',
              color: '#cccccc',
              border: '1px solid #555',
              borderRadius: '4px'
            }}
          >
            <option value="small">Small (10KB)</option>
            <option value="medium">Medium (100KB)</option>
            <option value="large">Large (500KB)</option>
            <option value="xlarge">Extra Large (1MB)</option>
          </select>
          
          <button 
            onClick={generateDocument} 
            disabled={isGenerating}
            style={{
              padding: '5px 15px',
              background: '#0e639c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: isGenerating ? 'wait' : 'pointer',
              opacity: isGenerating ? 0.7 : 1
            }}
          >
            {isGenerating ? 'Generating...' : 'Generate Document'}
          </button>
          
          <button 
            onClick={runScrollTest}
            disabled={!content || isGenerating}
            style={{
              padding: '5px 15px',
              background: '#16825d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: !content || isGenerating ? 'not-allowed' : 'pointer',
              opacity: !content || isGenerating ? 0.5 : 1
            }}
          >
            Run Scroll Test
          </button>
        </div>
        
        {metrics && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(5, 1fr)', 
            gap: '15px',
            padding: '10px',
            background: '#1e1e1e',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <div>
              <div style={{ color: '#6a6a6a' }}>Document Size</div>
              <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: 'bold' }}>
                {metrics.documentSize}
              </div>
            </div>
            <div>
              <div style={{ color: '#6a6a6a' }}>Line Count</div>
              <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: 'bold' }}>
                {metrics.lineCount.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ color: '#6a6a6a' }}>Scroll FPS</div>
              <div style={{ 
                color: metrics.scrollFPS >= 58 ? '#16825d' : 
                       metrics.scrollFPS >= 30 ? '#f9c74f' : '#f94144',
                fontSize: '16px', 
                fontWeight: 'bold' 
              }}>
                {metrics.scrollFPS.toFixed(1)}
              </div>
            </div>
            <div>
              <div style={{ color: '#6a6a6a' }}>Memory Usage</div>
              <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: 'bold' }}>
                {metrics.memoryUsage.toFixed(1)} MB
              </div>
            </div>
            <div>
              <div style={{ color: '#6a6a6a' }}>Initial Render</div>
              <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: 'bold' }}>
                {metrics.renderTime.toFixed(0)} ms
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden' }}>
        <VirtualScrollEditor
          initialContent={content}
          onChange={(newContent) => setContent(newContent)}
          placeholder="Generate a document to test performance..."
        />
      </div>
    </div>
  );
}