/**
 * Performance Monitor Component - Real-time performance monitoring dashboard
 * Displays FPS, memory usage, and other performance metrics
 */

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, Cpu, HardDrive, AlertCircle } from 'lucide-react';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  memoryLimit: number;
  renderTime: number;
  inputLatency: number;
  documentSize: number;
  domNodes: number;
}

interface PerformanceBudget {
  fps: { min: number; target: number };
  memory: { max: number };
  renderTime: { max: number };
  inputLatency: { max: number };
  domNodes: { max: number };
}

const DEFAULT_BUDGETS: PerformanceBudget = {
  fps: { min: 55, target: 60 },
  memory: { max: 100 }, // MB
  renderTime: { max: 16.67 }, // ms (60 FPS)
  inputLatency: { max: 100 }, // ms
  domNodes: { max: 1500 },
};

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    memoryLimit: 0,
    renderTime: 0,
    inputLatency: 0,
    documentSize: 0,
    domNodes: 0,
  });
  
  const [warnings, setWarnings] = useState<string[]>([]);
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(performance.now());
  const rafIdRef = useRef<number>();

  // FPS measurement
  useEffect(() => {
    let frameCount = 0;
    const frameTimes: number[] = [];

    function measureFPS(currentTime: number) {
      const deltaTime = currentTime - lastTimeRef.current;
      
      if (deltaTime > 0) {
        const currentFPS = 1000 / deltaTime;
        frameTimes.push(currentFPS);
        
        // Keep last 60 frames
        if (frameTimes.length > 60) {
          frameTimes.shift();
        }
        
        frameCount++;
        
        // Update metrics every 30 frames
        if (frameCount % 30 === 0) {
          const avgFPS = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
          
          setMetrics(prev => ({
            ...prev,
            fps: Math.round(avgFPS),
          }));
        }
      }
      
      lastTimeRef.current = currentTime;
      rafIdRef.current = requestAnimationFrame(measureFPS);
    }

    rafIdRef.current = requestAnimationFrame(measureFPS);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Memory and DOM monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      // Memory usage
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          memoryLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
        }));
      }

      // DOM nodes count
      const nodeCount = document.getElementsByTagName('*').length;
      setMetrics(prev => ({
        ...prev,
        domNodes: nodeCount,
      }));

      // Document size (approximate)
      const editor = document.querySelector('[contenteditable]');
      if (editor) {
        const textLength = editor.textContent?.length || 0;
        setMetrics(prev => ({
          ...prev,
          documentSize: Math.round(textLength / 1024), // KB
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Input latency monitoring
  useEffect(() => {
    let lastInputTime = 0;
    
    function handleInput() {
      const now = performance.now();
      if (lastInputTime > 0) {
        const latency = now - lastInputTime;
        setMetrics(prev => ({
          ...prev,
          inputLatency: Math.round(latency),
        }));
      }
      lastInputTime = now;
    }

    document.addEventListener('input', handleInput, true);
    document.addEventListener('keydown', handleInput, true);

    return () => {
      document.removeEventListener('input', handleInput, true);
      document.removeEventListener('keydown', handleInput, true);
    };
  }, []);

  // Check budgets and generate warnings
  useEffect(() => {
    const newWarnings: string[] = [];

    if (metrics.fps < DEFAULT_BUDGETS.fps.min) {
      newWarnings.push(`FPS below target: ${metrics.fps} < ${DEFAULT_BUDGETS.fps.min}`);
    }

    if (metrics.memoryUsage > DEFAULT_BUDGETS.memory.max) {
      newWarnings.push(`Memory usage high: ${metrics.memoryUsage}MB > ${DEFAULT_BUDGETS.memory.max}MB`);
    }

    if (metrics.inputLatency > DEFAULT_BUDGETS.inputLatency.max) {
      newWarnings.push(`Input latency high: ${metrics.inputLatency}ms > ${DEFAULT_BUDGETS.inputLatency.max}ms`);
    }

    if (metrics.domNodes > DEFAULT_BUDGETS.domNodes.max) {
      newWarnings.push(`DOM nodes excessive: ${metrics.domNodes} > ${DEFAULT_BUDGETS.domNodes.max}`);
    }

    setWarnings(newWarnings);
  }, [metrics]);

  const getFPSColor = (fps: number) => {
    if (fps >= DEFAULT_BUDGETS.fps.target) return 'text-green-500';
    if (fps >= DEFAULT_BUDGETS.fps.min) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMemoryPercentage = () => {
    if (metrics.memoryLimit === 0) return 0;
    return (metrics.memoryUsage / metrics.memoryLimit) * 100;
  };

  return (
    <div className="performance-monitor p-4 space-y-4 bg-[#1e1e1e] text-[#cccccc]">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Activity className="w-5 h-5" />
        Performance Monitor
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {/* FPS Monitor */}
        <Card className="bg-[#252526] border-[#3c3c3c]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Frame Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-mono ${getFPSColor(metrics.fps)}`}>
              {metrics.fps} FPS
            </div>
            <Progress 
              value={(metrics.fps / DEFAULT_BUDGETS.fps.target) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        {/* Memory Monitor */}
        <Card className="bg-[#252526] border-[#3c3c3c]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono">
              {metrics.memoryUsage} MB
            </div>
            <Progress 
              value={getMemoryPercentage()} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        {/* Input Latency */}
        <Card className="bg-[#252526] border-[#3c3c3c]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Input Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono">
              {metrics.inputLatency} ms
            </div>
          </CardContent>
        </Card>

        {/* DOM Nodes */}
        <Card className="bg-[#252526] border-[#3c3c3c]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">DOM Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono">
              {metrics.domNodes}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Info */}
      <Card className="bg-[#252526] border-[#3c3c3c]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Document Size</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-lg font-mono">
            {metrics.documentSize} KB
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert className="bg-red-900/20 border-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-1">Performance Warnings:</div>
            <ul className="text-sm space-y-1">
              {warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}