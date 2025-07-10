/**
 * Text Measurement Utility - Accurate line calculation using mirror div technique
 * Creates a hidden div that clones editor CSS exactly to measure text wrapping
 * Uses binary search and LRU cache for efficient performance
 */

import { codeUnitLength, sliceByCodeUnits } from './string-utils';

export interface LineMeasurement {
  start: number;      // Character offset where line starts
  end: number;        // Character offset where line ends
  height: number;     // Pixel height of the line
  width: number;      // Pixel width of the line content
}

export interface BlockMeasurement {
  blockId: string;
  lines: LineMeasurement[];
  totalHeight: number;
  totalLines: number;
}

interface CacheEntry {
  measurement: BlockMeasurement;
  timestamp: number;
}

/**
 * TextMeasurementService - Main service for measuring text layout
 */
export class TextMeasurementService {
  private mirrorDiv: HTMLDivElement | null = null;
  private measurementCache = new Map<string, CacheEntry>();
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_TTL = 60000; // 1 minute TTL
  private frameCallbacks: (() => void)[] = [];
  private isProcessingFrame = false;

  constructor() {
    this.createMirrorDiv();
    this.startCacheCleanup();
  }

  /**
   * Create the hidden mirror div that clones editor styles
   */
  private createMirrorDiv(): void {
    if (typeof document === 'undefined') return; // For SSR/tests

    this.mirrorDiv = document.createElement('div');
    this.mirrorDiv.className = 'text-measurement-mirror';
    
    // Clone all editor styles exactly
    Object.assign(this.mirrorDiv.style, {
      position: 'absolute',
      top: '-9999px',
      left: '-9999px',
      width: '600px', // Default editor width
      minHeight: '100px',
      visibility: 'hidden',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      fontFamily: "'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace",
      fontSize: '14px',
      lineHeight: '1.15rem', // 18.4px
      padding: '10px 20px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      // Ensure consistent rendering
      letterSpacing: 'normal',
      wordSpacing: 'normal',
      textIndent: '0',
      textTransform: 'none',
      textAlign: 'left',
      direction: 'ltr'
    });

    // Only append to body if it exists (not in test environment)
    if (document.body) {
      document.body.appendChild(this.mirrorDiv);
    }
  }

  /**
   * Update mirror div width to match editor
   */
  public updateContainerWidth(width: number): void {
    if (this.mirrorDiv) {
      this.mirrorDiv.style.width = `${width}px`;
      // Invalidate cache when width changes
      this.measurementCache.clear();
    }
  }

  /**
   * Apply block-specific styles to mirror div
   */
  private applyBlockStyles(blockType: string): void {
    if (!this.mirrorDiv) return;

    // Reset styles
    this.mirrorDiv.style.fontSize = '14px';
    this.mirrorDiv.style.fontWeight = '400';
    this.mirrorDiv.style.marginBottom = '8px';

    // Apply block-specific styles
    switch (blockType) {
      case 'heading1':
        this.mirrorDiv.style.fontSize = '2.5rem';
        this.mirrorDiv.style.fontWeight = '600';
        this.mirrorDiv.style.marginBottom = '0.5rem';
        break;
      case 'heading2':
        this.mirrorDiv.style.fontSize = '2rem';
        this.mirrorDiv.style.fontWeight = '600';
        this.mirrorDiv.style.marginBottom = '0.5rem';
        break;
      case 'heading3':
        this.mirrorDiv.style.fontSize = '1.7rem';
        this.mirrorDiv.style.fontWeight = '600';
        this.mirrorDiv.style.marginBottom = '0.5rem';
        break;
      case 'heading4':
        this.mirrorDiv.style.fontSize = '1.4rem';
        this.mirrorDiv.style.fontWeight = '600';
        this.mirrorDiv.style.marginBottom = '0.5rem';
        break;
      case 'heading5':
        this.mirrorDiv.style.fontSize = '1.1rem';
        this.mirrorDiv.style.fontWeight = '600';
        this.mirrorDiv.style.marginBottom = '0.5rem';
        break;
      case 'heading6':
        this.mirrorDiv.style.fontSize = '0.9rem';
        this.mirrorDiv.style.fontWeight = '600';
        this.mirrorDiv.style.marginBottom = '0.5rem';
        break;
    }
  }

  /**
   * Measure a text block and return line information
   */
  public measureBlock(
    blockId: string,
    text: string,
    blockType: string,
    containerWidth?: number
  ): BlockMeasurement {
    // Generate cache key
    const textHash = this.hashString(text);
    const width = containerWidth || 600;
    const cacheKey = `${blockId}-${textHash}-${width}-${blockType}`;

    // Check cache
    const cached = this.measurementCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.measurement;
    }

    // Perform measurement
    const measurement = this.performMeasurement(blockId, text, blockType, width);
    
    // Update cache
    this.updateCache(cacheKey, measurement);
    
    return measurement;
  }

  /**
   * Batch measure multiple blocks in a single frame
   */
  public measureBlocksBatch(
    blocks: Array<{
      blockId: string;
      text: string;
      blockType: string;
    }>,
    containerWidth?: number
  ): Promise<BlockMeasurement[]> {
    return new Promise((resolve) => {
      this.frameCallbacks.push(() => {
        const measurements = blocks.map(block =>
          this.measureBlock(block.blockId, block.text, block.blockType, containerWidth)
        );
        resolve(measurements);
      });

      if (!this.isProcessingFrame) {
        this.processFrameCallbacks();
      }
    });
  }

  /**
   * Process callbacks in the next idle frame
   */
  private processFrameCallbacks(): void {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        this.executeFrameCallbacks();
      }, { timeout: 16 }); // ~60fps
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        this.executeFrameCallbacks();
      }, 0);
    }
  }

  /**
   * Execute all pending frame callbacks
   */
  private executeFrameCallbacks(): void {
    this.isProcessingFrame = true;
    const callbacks = [...this.frameCallbacks];
    this.frameCallbacks = [];
    
    callbacks.forEach(callback => callback());
    
    this.isProcessingFrame = false;
  }

  /**
   * Perform actual measurement using mirror div
   */
  private performMeasurement(
    blockId: string,
    text: string,
    blockType: string,
    containerWidth: number
  ): BlockMeasurement {
    if (!this.mirrorDiv || !text) {
      return {
        blockId,
        lines: [],
        totalHeight: 0,
        totalLines: 0
      };
    }

    const startTime = performance.now();

    // Update mirror div
    this.mirrorDiv.style.width = `${containerWidth}px`;
    this.applyBlockStyles(blockType);
    
    // Use binary search to find line breaks
    const lines = this.findLineBreaks(text);
    
    // Calculate total height
    const lineHeight = this.getLineHeight(blockType);
    const totalHeight = lines.length * lineHeight;

    const measurement: BlockMeasurement = {
      blockId,
      lines: lines.map((line, index) => ({
        ...line,
        height: lineHeight
      })),
      totalHeight,
      totalLines: lines.length
    };

    // Log performance in development
    if (process.env.NODE_ENV === 'development') {
      const duration = performance.now() - startTime;
      if (duration > 0.4) {
        console.warn(`Text measurement took ${duration.toFixed(2)}ms for block ${blockId}`);
      }
    }

    return measurement;
  }

  /**
   * Use binary search to efficiently find line break points
   */
  private findLineBreaks(text: string): Omit<LineMeasurement, 'height'>[] {
    if (!this.mirrorDiv || !text) return [];

    const lines: Omit<LineMeasurement, 'height'>[] = [];
    let currentStart = 0;
    const textLength = codeUnitLength(text);

    while (currentStart < textLength) {
      // Binary search for the end of the current line
      let low = currentStart;
      let high = textLength;
      let lineEnd = currentStart;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const testText = sliceByCodeUnits(text, currentStart, mid);
        
        this.mirrorDiv.textContent = testText;
        const isSingleLine = this.isSingleLine();

        if (isSingleLine) {
          lineEnd = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      // Handle word boundaries
      lineEnd = this.adjustToWordBoundary(text, currentStart, lineEnd);

      // Measure the actual line width
      const lineText = sliceByCodeUnits(text, currentStart, lineEnd);
      this.mirrorDiv.textContent = lineText;
      const width = this.mirrorDiv.scrollWidth;

      lines.push({
        start: currentStart,
        end: lineEnd,
        width
      });

      currentStart = lineEnd;
      
      // Skip whitespace at the start of the next line
      while (currentStart < textLength && /\s/.test(text[currentStart])) {
        currentStart++;
      }
    }

    return lines;
  }

  /**
   * Check if content fits in a single line
   */
  private isSingleLine(): boolean {
    if (!this.mirrorDiv) return true;
    
    // In test environment, use scrollHeight directly
    if (typeof document === 'undefined' || !document.body) {
      return this.mirrorDiv.scrollHeight <= 18.4 * 1.1;
    }
    
    // Create a temporary span to measure single line height
    const span = document.createElement('span');
    span.textContent = 'M'; // Use a capital M for consistent measurement
    span.style.visibility = 'hidden';
    this.mirrorDiv.appendChild(span);
    
    const singleLineHeight = span.offsetHeight || 18.4;
    this.mirrorDiv.removeChild(span);
    
    // Check if content height is approximately one line
    return this.mirrorDiv.scrollHeight <= singleLineHeight * 1.1; // 10% tolerance
  }

  /**
   * Adjust line end to avoid breaking words
   */
  private adjustToWordBoundary(text: string, start: number, end: number): number {
    // If we're at the end of the text, return as is
    if (end >= codeUnitLength(text)) return end;

    // Check if we're breaking a word
    const charAtEnd = text[end - 1];
    const charAfterEnd = text[end];

    // If we're already at a word boundary, return as is
    if (/\s/.test(charAtEnd) || /\s/.test(charAfterEnd)) {
      return end;
    }

    // Find the last space before the break point
    let lastSpace = end - 1;
    while (lastSpace > start && !/\s/.test(text[lastSpace])) {
      lastSpace--;
    }

    // If we found a space and it's not too far back, use it
    if (lastSpace > start && end - lastSpace < 20) {
      return lastSpace + 1; // Return position after the space
    }

    // Otherwise, keep the original break point (for very long words)
    return end;
  }

  /**
   * Get line height for a block type
   */
  private getLineHeight(blockType: string): number {
    const heights: Record<string, number> = {
      paragraph: 18.4,
      heading1: 48,    // 2.5rem * 1.2 line-height
      heading2: 38.4,  // 2rem * 1.2
      heading3: 32.64, // 1.7rem * 1.2
      heading4: 26.88, // 1.4rem * 1.2
      heading5: 21.12, // 1.1rem * 1.2
      heading6: 17.28  // 0.9rem * 1.2
    };

    return heights[blockType] || 18.4;
  }

  /**
   * Simple string hash for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Update cache with LRU eviction
   */
  private updateCache(key: string, measurement: BlockMeasurement): void {
    // Remove oldest entries if cache is full
    if (this.measurementCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.findOldestCacheEntry();
      if (oldestKey) {
        this.measurementCache.delete(oldestKey);
      }
    }

    this.measurementCache.set(key, {
      measurement,
      timestamp: Date.now()
    });
  }

  /**
   * Find the oldest cache entry
   */
  private findOldestCacheEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.measurementCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, entry] of this.measurementCache) {
        if (now - entry.timestamp > this.CACHE_TTL) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => this.measurementCache.delete(key));
    }, 60000); // Run cleanup every minute
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    hitRate: number;
    avgMeasurementTime: number;
  } {
    // This would need additional tracking in a real implementation
    return {
      size: this.measurementCache.size,
      hitRate: 0, // Would need to track hits/misses
      avgMeasurementTime: 0 // Would need to track measurement times
    };
  }

  /**
   * Clear all cached measurements
   */
  public clearCache(): void {
    this.measurementCache.clear();
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.mirrorDiv && this.mirrorDiv.parentNode) {
      this.mirrorDiv.parentNode.removeChild(this.mirrorDiv);
    }
    this.measurementCache.clear();
    this.frameCallbacks = [];
  }
}

// Export singleton instance
export const textMeasurementService = new TextMeasurementService();