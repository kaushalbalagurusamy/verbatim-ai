/**
 * Enhanced Performance Test Editor - Comprehensive performance testing with monitoring
 * Includes PerformanceMonitor dashboard and automated test scenarios
 */

import React, { useState, useRef, useCallback } from 'react';
import { VirtualScrollEditor } from '../components/VirtualScrollEditor';
import { PerformanceMonitor } from '@/components/PerformanceMonitor';
import { PerformanceTestSuite } from './performance-test-suite';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, FileText, Zap, ScrollText, Download } from 'lucide-react';
import '../styles/editor.css';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  run: (editor: HTMLElement, suite: PerformanceTestSuite) => Promise<any>;
}

export function EnhancedPerformanceTestEditor() {
  const [content, setContent] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [testResults, setTestResults] = useState<string>('');
  const [showMonitor, setShowMonitor] = useState(true);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const testSuiteRef = useRef<PerformanceTestSuite>(new PerformanceTestSuite());

  // Test scenarios
  const testScenarios: TestScenario[] = [
    {
      id: 'empty-load',
      name: 'Empty Document Load',
      description: 'Test initial load performance with empty document',
      icon: <FileText className="w-4 h-4" />,
      run: async (editor, suite) => {
        editor.textContent = '';
        return suite.runLoadTest(editor, '');
      }
    },
    {
      id: 'small-load',
      name: '10KB Document Load',
      description: 'Test load performance with small document',
      icon: <FileText className="w-4 h-4" />,
      run: async (editor, suite) => {
        const content = generateContent(10);
        return suite.runLoadTest(editor, content);
      }
    },
    {
      id: 'medium-load',
      name: '100KB Document Load',
      description: 'Test load performance with medium document',
      icon: <FileText className="w-4 h-4" />,
      run: async (editor, suite) => {
        const content = generateContent(100);
        return suite.runLoadTest(editor, content);
      }
    },
    {
      id: 'large-load',
      name: '1MB Document Load',
      description: 'Test load performance with large document',
      icon: <FileText className="w-4 h-4" />,
      run: async (editor, suite) => {
        const content = generateContent(1000);
        return suite.runLoadTest(editor, content);
      }
    },
    {
      id: 'typing-slow',
      name: 'Typing Test (60 WPM)',
      description: 'Test performance during slow typing',
      icon: <Zap className="w-4 h-4" />,
      run: async (editor, suite) => {
        const text = 'The quick brown fox jumps over the lazy dog. ';
        return suite.runTypingTest(editor, text.repeat(5), 60);
      }
    },
    {
      id: 'typing-fast',
      name: 'Typing Test (100 WPM)',
      description: 'Test performance during fast typing',
      icon: <Zap className="w-4 h-4" />,
      run: async (editor, suite) => {
        const text = 'The quick brown fox jumps over the lazy dog. ';
        return suite.runTypingTest(editor, text.repeat(10), 100);
      }
    },
    {
      id: 'typing-burst',
      name: 'Burst Typing (150 WPM)',
      description: 'Test performance during burst typing',
      icon: <Zap className="w-4 h-4" />,
      run: async (editor, suite) => {
        const text = 'Lorem ipsum dolor sit amet. ';
        return suite.runTypingTest(editor, text.repeat(15), 150);
      }
    },
    {
      id: 'scroll-smooth',
      name: 'Smooth Scroll Test',
      description: 'Test performance during smooth scrolling',
      icon: <ScrollText className="w-4 h-4" />,
      run: async (editor, suite) => {
        // Load medium document first
        const content = generateContent(100);
        editor.textContent = content;
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const container = editor.closest('.editor-scroll-container') as HTMLElement;
        return suite.runScrollTest(container || editor, container?.scrollHeight || 5000);
      }
    },
    {
      id: 'format-ops',
      name: 'Format Operations',
      description: 'Test performance during formatting',
      icon: <Zap className="w-4 h-4" />,
      run: async (editor, suite) => {
        // Add some content first
        editor.textContent = 'This is a test paragraph for formatting operations. '.repeat(20);
        
        return suite.runFormatTest(editor, [
          { command: 'bold' },
          { command: 'italic' },
          { command: 'underline' },
          { command: 'foreColor', value: '#ff0000' },
          { command: 'backColor', value: '#ffff00' },
          { command: 'fontSize', value: '5' },
        ]);
      }
    },
  ];

  // Generate test content
  function generateContent(sizeKB: number): string {
    const lorem = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. `;
    const targetBytes = sizeKB * 1024;
    const loremBytes = new TextEncoder().encode(lorem).length;
    const repetitions = Math.ceil(targetBytes / loremBytes);
    
    return Array(repetitions).fill(lorem).join('\n');
  }

  // Run selected test
  const runTest = useCallback(async (scenario: TestScenario) => {
    setIsRunning(true);
    setCurrentTest(scenario.name);
    
    try {
      const editor = editorRef.current?.querySelector('[contenteditable]') as HTMLElement;
      if (!editor) {
        throw new Error('Editor not found');
      }
      
      const result = await scenario.run(editor, testSuiteRef.current);
      
      // Update results display
      const report = testSuiteRef.current.generateReport();
      setTestResults(report);
      
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults(`Test failed: ${error}`);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  }, []);

  // Run all tests
  const runAllTests = useCallback(async () => {
    for (const scenario of testScenarios) {
      await runTest(scenario);
      // Pause between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }, [runTest]);

  // Export results
  const exportResults = useCallback(() => {
    const results = testSuiteRef.current.exportResults();
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-results-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="enhanced-performance-test" style={{ height: '100vh', display: 'flex', background: '#1e1e1e' }}>
      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ 
          padding: '20px', 
          background: '#252526', 
          borderBottom: '1px solid #3c3c3c',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0, color: '#cccccc', fontSize: '20px' }}>
            Performance Testing Suite
          </h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              onClick={() => setShowMonitor(!showMonitor)}
              variant="outline"
              size="sm"
            >
              {showMonitor ? 'Hide' : 'Show'} Monitor
            </Button>
            <Button
              onClick={exportResults}
              variant="outline"
              size="sm"
              disabled={testResults.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Results
            </Button>
          </div>
        </div>

        {/* Content area with tabs */}
        <Tabs defaultValue="editor" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TabsList style={{ margin: '0 20px' }}>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="tests">Test Scenarios</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" style={{ flex: 1, margin: 0 }}>
            <div ref={editorRef} style={{ height: '100%' }}>
              <VirtualScrollEditor
                initialContent={content}
                onChange={setContent}
                placeholder="Start typing or run a test scenario..."
              />
            </div>
          </TabsContent>

          <TabsContent value="tests" style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ marginBottom: '20px' }}>
                <Button
                  onClick={runAllTests}
                  disabled={isRunning}
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Run All Tests
                </Button>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                {testScenarios.map(scenario => (
                  <Card key={scenario.id} className="bg-[#252526] border-[#3c3c3c]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {scenario.icon}
                        {scenario.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-[#6a6a6a] mb-3">
                        {scenario.description}
                      </p>
                      <Button
                        onClick={() => runTest(scenario)}
                        disabled={isRunning}
                        size="sm"
                        variant={currentTest === scenario.name ? 'default' : 'outline'}
                      >
                        {currentTest === scenario.name ? 'Running...' : 'Run Test'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results" style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
            {testResults ? (
              <pre style={{ 
                background: '#252526', 
                padding: '20px', 
                borderRadius: '8px',
                color: '#cccccc',
                fontSize: '12px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap'
              }}>
                {testResults}
              </pre>
            ) : (
              <Alert>
                <AlertDescription>
                  No test results yet. Run some tests to see performance metrics.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Performance Monitor Sidebar */}
      {showMonitor && (
        <div style={{ 
          width: '400px', 
          borderLeft: '1px solid #3c3c3c',
          overflow: 'auto'
        }}>
          <PerformanceMonitor />
        </div>
      )}
    </div>
  );
}