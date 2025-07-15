# Editor Advanced Guide

This guide covers advanced configuration options, performance optimization, and troubleshooting for the Editor V2.

## Performance Features

### Virtual Scrolling

For large documents, the editor automatically enables virtual scrolling:

- Only visible content is rendered
- Maintains 60+ FPS with 100KB+ documents
- Seamless scrolling experience
- Automatic line number alignment

See [Virtual Scrolling Guide](./virtual-scrolling.md) for detailed configuration.

### Optimized Rendering

The editor uses several optimizations:

- Incremental DOM updates
- RequestAnimationFrame throttling
- Render caching for unchanged blocks
- GPU acceleration for scrolling

## Configuration Options

### Editor Props

```typescript
interface EditorProps {
  // Content
  initialContent?: string;
  placeholder?: string;
  
  // Behavior
  readOnly?: boolean;
  autoFocus?: boolean;
  spellCheck?: boolean;
  
  // Appearance
  className?: string;
  style?: CSSProperties;
  minHeight?: number;
  maxHeight?: number;
  
  // Features
  enableVirtualScroll?: boolean;
  enableLineNumbers?: boolean;
  enableAccessibility?: boolean;
  
  // Callbacks
  onChange?: (content: string) => void;
  onSelectionChange?: (selection: Selection) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}
```

### Advanced Configuration

```typescript
<SingleContentEditableEditor
  // Performance
  virtualScrollThreshold={1000}  // Enable virtual scroll after 1000 lines
  renderBufferSize={10}  // Render 10 extra lines above/below viewport
  
  // Behavior
  tabSize={4}  // Tab key inserts 4 spaces
  wordWrap={true}  // Wrap long lines
  
  // Formatting
  defaultFormats={{  // Default formatting for new text
    bold: false,
    highlight: null,
    minimize: false
  }}
  
  // Advanced options
  measureTextPerformance={true}
  useWebWorker={true}
  enableSmartIndent={true}
/>
```

## Advanced Features

### Custom Formatters

Create custom formatting types:

```typescript
const customFormatter = {
  name: 'strikethrough',
  apply: (text) => `~~${text}~~`,
  remove: (text) => text.replace(/~~/g, ''),
  detect: (text) => text.includes('~~'),
  shortcut: 'Ctrl+Shift+S'
};

editor.registerFormatter(customFormatter);
```

### Content Transformers

Transform content on input/output:

```typescript
const markdownTransformer = {
  input: (html) => htmlToMarkdown(html),
  output: (markdown) => markdownToHtml(markdown)
};

<SingleContentEditableEditor
  contentTransformer={markdownTransformer}
/>
```

### Plugin System

Extend editor functionality with plugins:

```typescript
const autoSavePlugin = {
  name: 'autosave',
  init: (editor) => {
    setInterval(() => {
      const content = editor.getContent();
      localStorage.setItem('draft', content);
    }, 30000); // Save every 30 seconds
  }
};

editor.use(autoSavePlugin);
```

## Performance Optimization

### Memory Management

Monitor and optimize memory usage:

```typescript
const memoryConfig = {
  maxUndoStackSize: 50,
  clearUndoOnMemoryPressure: true,
  compactDocumentThreshold: 100000, // bytes
  enableMemoryProfiling: true
};
```

### Render Optimization

Fine-tune rendering performance:

```typescript
const renderConfig = {
  batchDOMUpdates: true,
  deferNonVisibleRenders: true,
  maxRenderTime: 16, // ms (60 FPS)
  enableRenderProfiling: true
};
```

## Best Practices

1. **Content Validation**: Always validate content before saving
2. **Error Handling**: Handle edge cases gracefully
3. **Performance**: Use virtual scrolling for large documents
4. **Accessibility**: Keep accessibility features enabled
5. **Testing**: Test with different browsers and input methods

## Troubleshooting

### Common Issues

#### Cursor Jumping

```typescript
// Ensure selection is restored after render
const preserveSelection = (fn) => {
  const selection = editor.getSelection();
  fn();
  editor.setSelection(selection.start, selection.end);
};
```

#### IME Input Issues

```typescript
// Debug composition events
editor.on('compositionstart', () => console.log('IME started'));
editor.on('compositionupdate', (e) => console.log('IME update:', e.data));
editor.on('compositionend', (e) => console.log('IME end:', e.data));
```

#### Performance Lag

```typescript
// Profile performance issues
const profiler = editor.getPerformanceProfiler();
profiler.start();
// ... perform operations
const report = profiler.stop();
console.log('Performance report:', report);
```

#### Focus Loss

```typescript
// Track focus changes
let lastFocusTime = Date.now();
editor.on('focus', () => {
  console.log('Focus gained');
  lastFocusTime = Date.now();
});

editor.on('blur', () => {
  console.log('Focus lost after', Date.now() - lastFocusTime, 'ms');
});
```

### Debug Mode

Enable comprehensive debugging:

```typescript
// Global debug mode
window.EDITOR_DEBUG = {
  logInputEvents: true,
  logDocumentChanges: true,
  logRenderCycles: true,
  logSelectionChanges: true,
  showPerformanceOverlay: true
};

// Component-level debug
<SingleContentEditableEditor 
  debug={true}
  debugLevel="verbose" // 'info' | 'verbose' | 'trace'
  onDebugMessage={(msg) => console.log('[Editor]', msg)}
/>
```

### Performance Profiling

```typescript
// Enable built-in profiler
editor.startProfiling();

// Perform operations...

const profile = editor.stopProfiling();
console.log('Input handling:', profile.inputHandling);
console.log('Render time:', profile.rendering);
console.log('Memory delta:', profile.memoryDelta);
```

## Browser-Specific Fixes

### Safari Selection Issues

```typescript
if (navigator.userAgent.includes('Safari')) {
  editor.config.selectionRestoreDelay = 50;
  editor.config.useAlternativeSelectionAPI = true;
}
```

### Firefox IME Handling

```typescript
if (navigator.userAgent.includes('Firefox')) {
  editor.config.compositionEventDelay = 100;
  editor.config.useFirefoxIMEWorkaround = true;
}
```

### Edge Rendering

```typescript
if (navigator.userAgent.includes('Edg')) {
  editor.config.enableEdgeOptimizations = true;
  editor.config.usePassiveScrollListeners = true;
}
```