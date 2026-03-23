# Text Measurement Service

## Overview

The Text Measurement Service provides accurate line calculation for text rendering in the editor using a mirror div technique. It creates a hidden DOM element with identical styling to measure how text will wrap, ensuring pixel-perfect accuracy while maintaining high performance through caching and optimizations.

## Features

- **Mirror Div Technique**: Hidden element clones editor CSS exactly for accurate measurements
- **Binary Search Line Splitting**: Efficiently finds line break points with minimal DOM operations
- **LRU Cache**: Caches measurements keyed by blockId + textHash + containerWidth
- **Batch Processing**: Measure multiple blocks in a single frame using requestIdleCallback
- **Performance Optimized**: Average measurement time < 0.4ms per block

## Architecture

### Core Components

1. **TextMeasurementService**: Main service class that manages measurements
2. **Mirror Div**: Hidden DOM element that replicates editor styling
3. **Binary Search Algorithm**: Finds optimal line break points
4. **LRU Cache**: Stores up to 100 measurements with 1-minute TTL

### How It Works

1. Creates a hidden div with identical CSS to the editor
2. Sets text content and measures using binary search to find line breaks
3. Respects word boundaries when possible
4. Caches results for repeated measurements
5. Updates when container width changes

## API

### Basic Usage

```typescript
import { textMeasurementService } from './text-measurement';

// Measure a single block
const measurement = textMeasurementService.measureBlock(
  'block-id',
  'Text content to measure',
  'paragraph', // or 'heading1', 'heading2', etc.
  600 // container width in pixels
);

// Result structure
{
  blockId: string;
  lines: Array<{
    start: number;    // Character offset where line starts
    end: number;      // Character offset where line ends
    height: number;   // Pixel height of the line
    width: number;    // Pixel width of the line content
  }>;
  totalHeight: number;
  totalLines: number;
}
```

### Batch Measurements

```typescript
// Measure multiple blocks efficiently
const measurements = await textMeasurementService.measureBlocksBatch([
  { blockId: 'block1', text: 'First block', blockType: 'paragraph' },
  { blockId: 'block2', text: 'Second block', blockType: 'heading1' }
], 600);
```

### Container Width Updates

```typescript
// Update when editor width changes
textMeasurementService.updateContainerWidth(800);
```

### Cache Management

```typescript
// Get cache statistics
const stats = textMeasurementService.getCacheStats();
// { size: 42, hitRate: 0.85, avgMeasurementTime: 0.3 }

// Clear cache manually
textMeasurementService.clearCache();
```

## Performance Characteristics

### Benchmarks

- **Average measurement time**: < 0.4ms per block
- **Cache hit rate**: > 80% in typical usage
- **Memory usage**: < 100 cache entries (auto-eviction)
- **Batch processing**: Uses requestIdleCallback for non-blocking

### Optimization Strategies

1. **Binary Search**: Reduces DOM measurements from O(n) to O(log n)
2. **Word Boundary Detection**: Avoids breaking words when possible
3. **Frame Batching**: Groups measurements in idle callbacks
4. **Smart Caching**: LRU eviction with TTL for stale entries

## Block Type Support

The service handles different block types with appropriate styling:

| Block Type | Font Size | Line Height | Special Handling |
|------------|-----------|-------------|------------------|
| paragraph  | 14px      | 18.4px      | Default styling  |
| heading1   | 2.5rem    | 48px        | Bold, larger spacing |
| heading2   | 2rem      | 38.4px      | Bold, larger spacing |
| heading3   | 1.7rem    | 32.64px     | Bold, larger spacing |
| heading4   | 1.4rem    | 26.88px     | Bold, larger spacing |
| heading5   | 1.1rem    | 21.12px     | Bold, larger spacing |
| heading6   | 0.9rem    | 17.28px     | Bold, larger spacing |

## Edge Cases Handled

1. **Empty text**: Returns empty lines array
2. **Very long words**: Breaks at character boundaries
3. **Unicode/Emoji**: Proper grapheme handling
4. **Whitespace**: Trims line-start whitespace
5. **Container resize**: Auto-invalidates cache

## Testing

The service includes comprehensive tests covering:

- 100+ text fixtures with various content types
- Performance benchmarks ensuring < 0.4ms average
- Cache hit rate verification (> 80%)
- Word boundary preservation
- Unicode and special character handling

Run tests:
```bash
pnpm test text-measurement
```

Run benchmarks:
```bash
node src/editor-v2/utils/__tests__/text-measurement.benchmark.ts
```

## Integration Example

```typescript
// In your editor component
import { textMeasurementService } from '../utils/text-measurement';

function renderContent() {
  const blocks = document.getBlocks();
  
  for (const block of blocks) {
    // Measure block
    const measurement = textMeasurementService.measureBlock(
      block.id,
      block.text,
      block.type,
      editorWidth
    );
    
    // Update line registry
    measurement.lines.forEach((line, index) => {
      lineRegistry.setLine({
        lineNumber: currentLineNumber++,
        startOffset: block.offset + line.start,
        endOffset: block.offset + line.end,
        height: line.height,
        blockId: block.id,
        indexInBlock: index
      });
    });
  }
}
```

## Future Improvements

1. **Web Worker Support**: Move measurements to worker thread
2. **Virtual Scrolling**: Only measure visible blocks
3. **Incremental Updates**: Re-measure only changed blocks
4. **Font Loading**: Handle dynamic font changes
5. **RTL Support**: Right-to-left text measurement