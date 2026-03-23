/**
 * Test Performance Page - Route for testing virtual scrolling performance
 * Provides UI for generating large documents and monitoring scroll performance
 */

import React from 'react';
import { EnhancedPerformanceTestEditor } from '@/editor/test/EnhancedPerformanceTestEditor';

export default function TestPerformance() {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden',
      background: '#1e1e1e'
    }}>
      <EnhancedPerformanceTestEditor />
    </div>
  );
}