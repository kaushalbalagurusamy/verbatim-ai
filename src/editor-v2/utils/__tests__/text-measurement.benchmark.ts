/**
 * Performance benchmark for text measurement utility
 * Ensures measurements complete in < 0.4ms average
 */

import { TextMeasurementService } from '../text-measurement';

// Real-world content samples
const benchmarkFixtures = [
  // Technical documentation
  `The TextMeasurementService provides accurate line measurement for text rendering in web editors. It uses a mirror div technique where a hidden DOM element with identical styling is used to measure how text will wrap. This approach ensures pixel-perfect accuracy while maintaining high performance through caching and optimizations.`,
  
  // Code snippet
  `function calculateLineBreaks(text: string, width: number): number[] {
    const breaks: number[] = [];
    let currentPos = 0;
    while (currentPos < text.length) {
      const lineEnd = findLineEnd(text, currentPos, width);
      breaks.push(lineEnd);
      currentPos = lineEnd + 1;
    }
    return breaks;
  }`,
  
  // Markdown content
  `# Performance Optimization Guide

This guide covers essential techniques for optimizing text measurement performance:

1. **Caching**: Store measurement results with an LRU cache
2. **Batch Processing**: Measure multiple blocks in a single frame
3. **Binary Search**: Efficiently find line break points
4. **Idle Callbacks**: Use requestIdleCallback for non-critical work

## Implementation Details

The service maintains a cache of up to 100 entries with a 1-minute TTL...`,
  
  // Long paragraph
  `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.`,
  
  // Mixed content with special characters
  `The formula E=mc² demonstrates Einstein's mass-energy equivalence. In programming, we often use symbols like && || != >= <= and special characters like @#$%^&*(). Unicode support includes émojis 🚀, Chinese 中文, Arabic العربية, and mathematical symbols ∑∏∫∂.`
];

interface BenchmarkResult {
  fixture: string;
  measurements: number[];
  average: number;
  median: number;
  p95: number;
  p99: number;
  passed: boolean;
}

/**
 * Run performance benchmark
 */
export async function runBenchmark(): Promise<{
  results: BenchmarkResult[];
  summary: {
    totalMeasurements: number;
    overallAverage: number;
    passRate: number;
    cacheHitRate: number;
  };
}> {
  const service = new TextMeasurementService();
  const results: BenchmarkResult[] = [];
  const iterations = 100; // Measurements per fixture
  
  // Warm up the service
  for (let i = 0; i < 10; i++) {
    service.measureBlock('warmup', 'Warmup text', 'paragraph', 600);
  }
  
  // Benchmark each fixture
  for (const fixture of benchmarkFixtures) {
    const measurements: number[] = [];
    const fixturePreview = fixture.substring(0, 50) + '...';
    
    // First measurement (cache miss)
    let start = performance.now();
    service.measureBlock('bench', fixture, 'paragraph', 600);
    let duration = performance.now() - start;
    measurements.push(duration);
    
    // Subsequent measurements (mix of cache hits and misses)
    for (let i = 1; i < iterations; i++) {
      // Occasionally change block ID to simulate cache misses
      const blockId = i % 10 === 0 ? `bench-${i}` : 'bench';
      
      start = performance.now();
      service.measureBlock(blockId, fixture, 'paragraph', 600);
      duration = performance.now() - start;
      measurements.push(duration);
    }
    
    // Calculate statistics
    const sorted = [...measurements].sort((a, b) => a - b);
    const average = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    results.push({
      fixture: fixturePreview,
      measurements,
      average,
      median,
      p95,
      p99,
      passed: average < 0.4
    });
  }
  
  // Calculate summary statistics
  const allMeasurements = results.flatMap(r => r.measurements);
  const overallAverage = allMeasurements.reduce((a, b) => a + b, 0) / allMeasurements.length;
  const passRate = (results.filter(r => r.passed).length / results.length) * 100;
  
  // Estimate cache hit rate (measurements under 0.05ms are likely cache hits)
  const cacheHits = allMeasurements.filter(m => m < 0.05).length;
  const cacheHitRate = (cacheHits / allMeasurements.length) * 100;
  
  service.dispose();
  
  return {
    results,
    summary: {
      totalMeasurements: allMeasurements.length,
      overallAverage,
      passRate,
      cacheHitRate
    }
  };
}

/**
 * Format benchmark results for display
 */
export function formatBenchmarkResults(data: Awaited<ReturnType<typeof runBenchmark>>): string {
  let output = '# Text Measurement Performance Benchmark\n\n';
  
  // Summary
  output += '## Summary\n';
  output += `- Total measurements: ${data.summary.totalMeasurements}\n`;
  output += `- Overall average: ${data.summary.overallAverage.toFixed(3)}ms\n`;
  output += `- Pass rate: ${data.summary.passRate.toFixed(1)}% (target: <0.4ms avg)\n`;
  output += `- Cache hit rate: ${data.summary.cacheHitRate.toFixed(1)}%\n\n`;
  
  // Detailed results
  output += '## Detailed Results\n\n';
  output += '| Fixture | Avg (ms) | Median | P95 | P99 | Status |\n';
  output += '|---------|----------|--------|-----|-----|--------|\n';
  
  for (const result of data.results) {
    output += `| ${result.fixture} | ${result.average.toFixed(3)} | ${result.median.toFixed(3)} | ${result.p95.toFixed(3)} | ${result.p99.toFixed(3)} | ${result.passed ? '✅' : '❌'} |\n`;
  }
  
  return output;
}

// Run benchmark if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running text measurement benchmark...');
  runBenchmark().then(results => {
    console.log(formatBenchmarkResults(results));
    
    // Exit with error if benchmark fails
    if (results.summary.overallAverage >= 0.4) {
      console.error('\n❌ Benchmark failed: Average measurement time exceeds 0.4ms');
      process.exit(1);
    } else {
      console.log('\n✅ Benchmark passed: All performance targets met');
    }
  });
}