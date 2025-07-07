/**
 * Visual Line Calculator - Efficiently calculates visual line counts for wrapped text
 * Uses caching and debouncing for optimal performance
 */

interface VisualLineData {
  blockId: string;
  lineCount: number;
  lastWidth: number;
  contentHash: string;
}

// Cache for visual line calculations
const visualLineCache = new Map<string, VisualLineData>();

/**
 * Calculate a simple hash of content for cache invalidation
 */
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Calculate the number of visual lines a block element takes up
 */
export function calculateVisualLines(blockElement: HTMLElement): number {
  if (!blockElement) return 1;
  
  const blockId = blockElement.dataset.blockId || '';
  const content = blockElement.textContent || '';
  const contentHash = hashContent(content);
  const currentWidth = blockElement.offsetWidth;
  
  // Check cache
  const cached = visualLineCache.get(blockId);
  if (cached && 
      cached.contentHash === contentHash && 
      cached.lastWidth === currentWidth) {
    return cached.lineCount;
  }
  
  // Calculate visual lines
  const computedStyle = getComputedStyle(blockElement);
  const lineHeight = parseFloat(computedStyle.lineHeight) || 16; // fallback to 16px
  const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
  const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
  const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
  const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
  
  // Get the actual content height (excluding padding and border)
  const totalHeight = blockElement.offsetHeight;
  const contentHeight = totalHeight - paddingTop - paddingBottom - borderTop - borderBottom;
  
  // Calculate line count (minimum 1)
  const lineCount = Math.max(1, Math.round(contentHeight / lineHeight));
  
  // Update cache
  visualLineCache.set(blockId, {
    blockId,
    lineCount,
    lastWidth: currentWidth,
    contentHash
  });
  
  return lineCount;
}

/**
 * Calculate visual lines for multiple blocks efficiently
 */
export function calculateVisualLinesForBlocks(blocks: HTMLElement[]): Map<string, number> {
  const results = new Map<string, number>();
  
  // Use requestAnimationFrame for better performance
  blocks.forEach(block => {
    const blockId = block.dataset.blockId;
    if (blockId) {
      results.set(blockId, calculateVisualLines(block));
    }
  });
  
  return results;
}

/**
 * Clear cache for specific block or all blocks
 */
export function clearVisualLineCache(blockId?: string): void {
  if (blockId) {
    visualLineCache.delete(blockId);
  } else {
    visualLineCache.clear();
  }
}

/**
 * Create a debounced version of the calculator for resize events
 */
export function createDebouncedCalculator(delay: number = 100) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (callback: () => void) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback();
      timeoutId = null;
    }, delay);
  };
}