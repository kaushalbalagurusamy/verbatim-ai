/**
 * Debug component to verify which editor is being used
 */

import React from 'react';
import Editor from '../integration/Editor';

export function DebugEditor() {
  const content = [
    {
      id: 'debug-1',
      type: 'paragraph' as const,
      content: 'This is a test paragraph that should wrap to multiple lines to test line number tracking.',
      formatting: []
    },
    {
      id: 'debug-2',
      type: 'paragraph' as const,
      content: 'Second paragraph for testing.',
      formatting: []
    }
  ];
  
  return (
    <div>
      <h1>Debug: New Editor Test</h1>
      <div style={{ border: '2px solid red', padding: '10px' }}>
        <Editor
          content={content}
          onChange={(newContent) => console.log('Content changed:', newContent)}
          onSelectionChange={() => console.log('Selection changed')}
        />
      </div>
    </div>
  );
}