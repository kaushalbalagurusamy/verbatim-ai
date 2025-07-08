/**
 * Visual Line Calculator - Accurately calculates visual line counts for wrapped text
 * Uses Range API for precise line break detection
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
 * Get all text nodes within an element
 */
function getTextNodes(element: Node): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let node = walker.nextNode();
  while (node) {
    if (node.nodeValue && node.nodeValue.trim()) {
      textNodes.push(node as Text);
    }
    node = walker.nextNode();
  }
  
  return textNodes;
}

/**
 * Calculate the number of visual lines using Range API for accuracy
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
  
  // If block is empty or hidden, return 1
  if (!content.trim() || blockElement.offsetHeight === 0) {
    visualLineCache.set(blockId, {
      blockId,
      lineCount: 1,
      lastWidth: currentWidth,
      contentHash
    });
    return 1;
  }
  
  // Use Range API to accurately count visual lines
  let lineCount = 1;
  
  try {
    const textNodes = getTextNodes(blockElement);
    if (textNodes.length === 0) {
      // No text nodes, but block exists, so count as 1 line
      visualLineCache.set(blockId, {
        blockId,
        lineCount: 1,
        lastWidth: currentWidth,
        contentHash
      });
      return 1;
    }
    
    // Create ranges for each character position and check Y coordinates
    const lineYPositions = new Set<number>();
    
    textNodes.forEach(textNode => {
      const text = textNode.nodeValue || '';
      for (let i = 0; i < text.length; i++) {
        // Skip whitespace-only positions
        if (text[i].trim() === '') continue;
        
        const range = document.createRange();
        range.setStart(textNode, i);
        range.setEnd(textNode, Math.min(i + 1, text.length));
        
        const rect = range.getBoundingClientRect();
        if (rect.height > 0) {
          // Round to avoid floating point precision issues
          lineYPositions.add(Math.round(rect.top));
        }
      }
    });
    
    // Number of unique Y positions = number of visual lines
    lineCount = Math.max(1, lineYPositions.size);
    
  } catch (error) {
    // Fallback to height-based calculation if Range API fails
    console.warn('Range API calculation failed, using fallback:', error);
    const computedStyle = getComputedStyle(blockElement);
    const lineHeight = parseFloat(computedStyle.lineHeight) || 
                      parseFloat(computedStyle.fontSize) * 1.15 || 
                      16;
    
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
    
    const totalHeight = blockElement.offsetHeight;
    const contentHeight = totalHeight - paddingTop - paddingBottom - borderTop - borderBottom;
    
    // Use ceil instead of round to avoid underestimating
    lineCount = Math.max(1, Math.ceil(contentHeight / lineHeight));
  }
  
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
export function createDebouncedCalculator(delay: number = 50) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;
  
  return (callback: () => void) => {
    if (timeoutId) clearTimeout(timeoutId);
    if (rafId) cancelAnimationFrame(rafId);
    
    timeoutId = setTimeout(() => {
      rafId = requestAnimationFrame(() => {
        callback();
        timeoutId = null;
        rafId = null;
      });
    }, delay);
  };
}