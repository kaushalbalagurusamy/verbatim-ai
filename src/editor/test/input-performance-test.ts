/**
 * Performance tests for input handling
 * Measures latency and throughput of various input operations
 */

import { DocumentModel } from '../models/document-model';
import { InputHandlerService } from '../services/input-handler';

interface PerformanceResult {
  operation: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  throughput: number; // operations per second
}

export class InputPerformanceTester {
  private document: DocumentModel;
  private inputHandler: InputHandlerService;
  private results: PerformanceResult[] = [];

  constructor() {
    this.document = new DocumentModel();
    const mockConfig = {
      getSelection: () => ({ start: 0, end: 0, isCollapsed: true, text: '' }),
      setSelection: () => {},
      renderContent: () => {},
      onChange: () => {}
    };
    this.inputHandler = new InputHandlerService(this.document, mockConfig);
  }

  /**
   * Run all performance tests
   */
  async runAllTests(): Promise<PerformanceResult[]> {
    console.log('Starting input performance tests...');
    
    await this.testRapidTyping();
    await this.testBulkInsertion();
    await this.testDeletionPerformance();
    await this.testFormattingPerformance();
    await this.testCompositionPerformance();
    
    return this.results;
  }

  /**
   * Test rapid typing performance
   */
  private async testRapidTyping(): Promise<void> {
    const iterations = 1000;
    const times: number[] = [];
    
    // Reset document
    this.document = new DocumentModel();
    
    for (let i = 0; i < iterations; i++) {
      const char = String.fromCharCode(97 + (i % 26)); // a-z
      const event = new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: char
      });
      
      const start = performance.now();
      this.inputHandler.handleBeforeInput(event);
      const end = performance.now();
      
      times.push(end - start);
    }
    
    this.addResult('Rapid Typing (1000 chars)', times);
  }

  /**
   * Test bulk text insertion
   */
  private async testBulkInsertion(): Promise<void> {
    const iterations = 100;
    const times: number[] = [];
    const longText = 'Lorem ipsum dolor sit amet '.repeat(10);
    
    for (let i = 0; i < iterations; i++) {
      // Reset document
      this.document = new DocumentModel();
      
      const event = new InputEvent('beforeinput', {
        inputType: 'insertFromPaste',
        data: longText
      });
      
      const start = performance.now();
      this.inputHandler.handleBeforeInput(event);
      const end = performance.now();
      
      times.push(end - start);
    }
    
    this.addResult('Bulk Text Insertion (270 chars)', times);
  }

  /**
   * Test deletion performance
   */
  private async testDeletionPerformance(): Promise<void> {
    const iterations = 500;
    const times: number[] = [];
    
    // Prepare document with content
    const content = 'a'.repeat(1000);
    this.document = new DocumentModel();
    this.document.insertText(0, content);
    
    for (let i = 0; i < iterations; i++) {
      const event = new InputEvent('beforeinput', {
        inputType: 'deleteContentBackward'
      });
      
      // Update mock selection
      (this.inputHandler as any).config.getSelection = () => ({
        start: this.document.getLength(),
        end: this.document.getLength(),
        isCollapsed: true,
        text: ''
      });
      
      const start = performance.now();
      this.inputHandler.handleBeforeInput(event);
      const end = performance.now();
      
      times.push(end - start);
    }
    
    this.addResult('Character Deletion (500 ops)', times);
  }

  /**
   * Test formatting performance
   */
  private async testFormattingPerformance(): Promise<void> {
    const iterations = 100;
    const times: number[] = [];
    
    // Prepare document with content
    this.document = new DocumentModel();
    this.document.insertText(0, 'The quick brown fox jumps over the lazy dog. '.repeat(20));
    
    for (let i = 0; i < iterations; i++) {
      const start = i * 10;
      const end = start + 20;
      
      // Update mock selection
      (this.inputHandler as any).config.getSelection = () => ({
        start,
        end,
        isCollapsed: false,
        text: this.document.getText(start, end)
      });
      
      const event = new InputEvent('beforeinput', {
        inputType: 'formatBold'
      });
      
      const perfStart = performance.now();
      this.inputHandler.handleBeforeInput(event);
      const perfEnd = performance.now();
      
      times.push(perfEnd - perfStart);
    }
    
    this.addResult('Format Application (100 ops)', times);
  }

  /**
   * Test composition event performance
   */
  private async testCompositionPerformance(): Promise<void> {
    const iterations = 100;
    const times: number[] = [];
    const compositionText = 'こんにちは';
    
    for (let i = 0; i < iterations; i++) {
      // Reset selection
      (this.inputHandler as any).config.getSelection = () => ({
        start: i * 5,
        end: i * 5,
        isCollapsed: true,
        text: ''
      });
      
      const start = performance.now();
      
      // Full composition cycle
      this.inputHandler.handleCompositionStart(new CompositionEvent('compositionstart'));
      this.inputHandler.handleCompositionUpdate(new CompositionEvent('compositionupdate', { data: 'こ' }));
      this.inputHandler.handleCompositionUpdate(new CompositionEvent('compositionupdate', { data: 'こん' }));
      this.inputHandler.handleCompositionUpdate(new CompositionEvent('compositionupdate', { data: 'こんに' }));
      this.inputHandler.handleCompositionUpdate(new CompositionEvent('compositionupdate', { data: 'こんにち' }));
      this.inputHandler.handleCompositionEnd(new CompositionEvent('compositionend', { data: compositionText }));
      
      const end = performance.now();
      
      times.push(end - start);
    }
    
    this.addResult('IME Composition Cycle', times);
  }

  /**
   * Calculate and store results
   */
  private addResult(operation: string, times: number[]): void {
    const sorted = [...times].sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);
    const average = sum / times.length;
    
    // Calculate throughput (operations per second)
    const throughput = 1000 / average;
    
    this.results.push({
      operation,
      averageTime: average,
      minTime: sorted[0],
      maxTime: sorted[sorted.length - 1],
      throughput
    });
    
    console.log(`${operation}:`);
    console.log(`  Average: ${average.toFixed(3)}ms`);
    console.log(`  Min: ${sorted[0].toFixed(3)}ms`);
    console.log(`  Max: ${sorted[sorted.length - 1].toFixed(3)}ms`);
    console.log(`  Throughput: ${throughput.toFixed(0)} ops/sec`);
    console.log('');
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    let report = '# Input Performance Test Results\n\n';
    report += '| Operation | Avg Time (ms) | Min (ms) | Max (ms) | Throughput (ops/sec) |\n';
    report += '|-----------|---------------|----------|----------|---------------------|\n';
    
    for (const result of this.results) {
      report += `| ${result.operation} | ${result.averageTime.toFixed(3)} | ${result.minTime.toFixed(3)} | ${result.maxTime.toFixed(3)} | ${result.throughput.toFixed(0)} |\n`;
    }
    
    report += '\n## Performance Guidelines\n';
    report += '- Typing: < 0.1ms per character for smooth experience\n';
    report += '- Bulk operations: < 5ms for paste/drop operations\n';
    report += '- Formatting: < 1ms per operation\n';
    report += '- IME: < 2ms for complete composition cycle\n';
    
    return report;
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new InputPerformanceTester();
  tester.runAllTests().then(() => {
    console.log('\n' + tester.generateReport());
  });
}