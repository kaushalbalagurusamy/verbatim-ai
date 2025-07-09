/**
 * Line Registry - Efficient visual line tracking and spatial indexing
 * Provides O(1) line number lookups and O(log n) position-based queries
 * Supports dynamic line height calculations and viewport optimization
 */

export interface VisualLine {
  lineNumber: number;
  startOffset: number; // Global character offset where line starts
  endOffset: number;   // Global character offset where line ends
  y: number;          // Y position in document
  height: number;     // Line height in pixels
  blockId: string;    // Associated block ID
  indexInBlock: number; // Which visual line within the block
}

export interface ViewportInfo {
  top: number;
  bottom: number;
  firstVisibleLine: number;
  lastVisibleLine: number;
}

interface SpatialNode {
  line: VisualLine;
  left: SpatialNode | null;
  right: SpatialNode | null;
  height: number;
  maxY: number; // Maximum Y value in subtree
}

export class LineRegistry {
  // Primary storage: line number -> line info
  private lineMap: Map<number, VisualLine>;
  
  // Spatial index: BST indexed by Y position for viewport queries
  private spatialRoot: SpatialNode | null;
  
  // Offset index: sorted array for binary search
  private offsetIndex: { offset: number; lineNumber: number }[];
  
  // Cache for viewport calculations
  private viewportCache: Map<string, ViewportInfo>;
  
  // Total document height
  private totalHeight: number;
  
  // Dirty tracking for incremental updates
  private dirtyLines: Set<number>;
  
  constructor() {
    this.lineMap = new Map();
    this.spatialRoot = null;
    this.offsetIndex = [];
    this.viewportCache = new Map();
    this.totalHeight = 0;
    this.dirtyLines = new Set();
  }

  /**
   * Add or update a visual line
   */
  setLine(line: VisualLine): void {
    const existing = this.lineMap.get(line.lineNumber);
    
    if (existing) {
      // Remove from spatial index
      this.spatialRoot = this.removeSpatialNode(this.spatialRoot, existing);
    }
    
    // Add to primary storage
    this.lineMap.set(line.lineNumber, line);
    
    // Add to spatial index
    this.spatialRoot = this.insertSpatialNode(this.spatialRoot, line);
    
    // Mark as dirty for offset index rebuild
    this.dirtyLines.add(line.lineNumber);
    
    // Invalidate viewport cache
    this.viewportCache.clear();
  }

  /**
   * Insert into spatial index (BST by Y position)
   */
  private insertSpatialNode(node: SpatialNode | null, line: VisualLine): SpatialNode {
    if (!node) {
      return {
        line,
        left: null,
        right: null,
        height: 1,
        maxY: line.y + line.height
      };
    }

    if (line.y < node.line.y) {
      node.left = this.insertSpatialNode(node.left, line);
    } else {
      node.right = this.insertSpatialNode(node.right, line);
    }

    // Update height and maxY
    node.height = 1 + Math.max(
      this.getNodeHeight(node.left),
      this.getNodeHeight(node.right)
    );
    
    node.maxY = Math.max(
      line.y + line.height,
      node.left ? node.left.maxY : 0,
      node.right ? node.right.maxY : 0
    );

    // Balance if needed (AVL-style)
    return this.balanceSpatialNode(node);
  }

  /**
   * Remove from spatial index
   */
  private removeSpatialNode(node: SpatialNode | null, line: VisualLine): SpatialNode | null {
    if (!node) return null;

    if (line.y < node.line.y) {
      node.left = this.removeSpatialNode(node.left, line);
    } else if (line.y > node.line.y || line.lineNumber !== node.line.lineNumber) {
      node.right = this.removeSpatialNode(node.right, line);
    } else {
      // Found node to remove
      if (!node.left) return node.right;
      if (!node.right) return node.left;

      // Node has two children - replace with inorder successor
      let minNode = node.right;
      while (minNode.left) {
        minNode = minNode.left;
      }
      
      node.line = minNode.line;
      node.right = this.removeSpatialNode(node.right, minNode.line);
    }

    // Update height and maxY
    node.height = 1 + Math.max(
      this.getNodeHeight(node.left),
      this.getNodeHeight(node.right)
    );
    
    node.maxY = Math.max(
      node.line.y + node.line.height,
      node.left ? node.left.maxY : 0,
      node.right ? node.right.maxY : 0
    );

    return this.balanceSpatialNode(node);
  }

  /**
   * Balance spatial node (AVL-style)
   */
  private balanceSpatialNode(node: SpatialNode): SpatialNode {
    const balance = this.getNodeHeight(node.left) - this.getNodeHeight(node.right);

    // Left heavy
    if (balance > 1) {
      if (node.left && this.getNodeHeight(node.left.left) < this.getNodeHeight(node.left.right)) {
        node.left = this.rotateSpatialLeft(node.left);
      }
      return this.rotateSpatialRight(node);
    }

    // Right heavy
    if (balance < -1) {
      if (node.right && this.getNodeHeight(node.right.right) < this.getNodeHeight(node.right.left)) {
        node.right = this.rotateSpatialRight(node.right);
      }
      return this.rotateSpatialLeft(node);
    }

    return node;
  }

  /**
   * Rotate spatial node left
   */
  private rotateSpatialLeft(node: SpatialNode): SpatialNode {
    const right = node.right!;
    node.right = right.left;
    right.left = node;

    // Update heights and maxY
    node.height = 1 + Math.max(
      this.getNodeHeight(node.left),
      this.getNodeHeight(node.right)
    );
    node.maxY = Math.max(
      node.line.y + node.line.height,
      node.left ? node.left.maxY : 0,
      node.right ? node.right.maxY : 0
    );

    right.height = 1 + Math.max(
      this.getNodeHeight(right.left),
      this.getNodeHeight(right.right)
    );
    right.maxY = Math.max(
      right.line.y + right.line.height,
      right.left ? right.left.maxY : 0,
      right.right ? right.right.maxY : 0
    );

    return right;
  }

  /**
   * Rotate spatial node right
   */
  private rotateSpatialRight(node: SpatialNode): SpatialNode {
    const left = node.left!;
    node.left = left.right;
    left.right = node;

    // Update heights and maxY
    node.height = 1 + Math.max(
      this.getNodeHeight(node.left),
      this.getNodeHeight(node.right)
    );
    node.maxY = Math.max(
      node.line.y + node.line.height,
      node.left ? node.left.maxY : 0,
      node.right ? node.right.maxY : 0
    );

    left.height = 1 + Math.max(
      this.getNodeHeight(left.left),
      this.getNodeHeight(left.right)
    );
    left.maxY = Math.max(
      left.line.y + left.line.height,
      left.left ? left.left.maxY : 0,
      left.right ? left.right.maxY : 0
    );

    return left;
  }

  /**
   * Get node height
   */
  private getNodeHeight(node: SpatialNode | null): number {
    return node ? node.height : 0;
  }

  /**
   * Get line by line number - O(1)
   */
  getLine(lineNumber: number): VisualLine | undefined {
    return this.lineMap.get(lineNumber);
  }

  /**
   * Get line by character offset - O(log n)
   */
  getLineByOffset(offset: number): VisualLine | undefined {
    // Rebuild offset index if dirty
    if (this.dirtyLines.size > 0) {
      this.rebuildOffsetIndex();
    }

    // Binary search in offset index
    let left = 0;
    let right = this.offsetIndex.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const line = this.lineMap.get(this.offsetIndex[mid].lineNumber);
      
      if (!line) break;
      
      if (offset >= line.startOffset && offset <= line.endOffset) {
        return line;
      } else if (offset < line.startOffset) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    
    return undefined;
  }

  /**
   * Get line by Y position - O(log n)
   */
  getLineByPosition(y: number): VisualLine | undefined {
    return this.findLineByY(this.spatialRoot, y);
  }

  /**
   * Find line by Y position in spatial index
   */
  private findLineByY(node: SpatialNode | null, y: number): VisualLine | undefined {
    if (!node) return undefined;

    // Check current node
    if (y >= node.line.y && y < node.line.y + node.line.height) {
      return node.line;
    }

    // Search left subtree
    if (node.left && y < node.line.y) {
      return this.findLineByY(node.left, y);
    }

    // Search right subtree
    if (node.right && y >= node.line.y + node.line.height) {
      return this.findLineByY(node.right, y);
    }

    return undefined;
  }

  /**
   * Get lines in viewport - O(log n + k) where k is number of visible lines
   */
  getLinesInViewport(top: number, bottom: number): VisualLine[] {
    const cacheKey = `${top}-${bottom}`;
    const cached = this.viewportCache.get(cacheKey);
    
    if (cached) {
      const lines: VisualLine[] = [];
      for (let i = cached.firstVisibleLine; i <= cached.lastVisibleLine; i++) {
        const line = this.lineMap.get(i);
        if (line) lines.push(line);
      }
      return lines;
    }

    // Find lines in viewport using spatial index
    const visibleLines: VisualLine[] = [];
    this.collectLinesInRange(this.spatialRoot, top, bottom, visibleLines);
    
    // Sort by line number
    visibleLines.sort((a, b) => a.lineNumber - b.lineNumber);
    
    // Cache viewport info
    if (visibleLines.length > 0) {
      this.viewportCache.set(cacheKey, {
        top,
        bottom,
        firstVisibleLine: visibleLines[0].lineNumber,
        lastVisibleLine: visibleLines[visibleLines.length - 1].lineNumber
      });
    }
    
    return visibleLines;
  }

  /**
   * Collect lines in Y range from spatial index
   */
  private collectLinesInRange(
    node: SpatialNode | null,
    top: number,
    bottom: number,
    result: VisualLine[]
  ): void {
    if (!node) return;

    // Check if subtree might contain lines in range
    if (node.maxY < top) return;
    if (node.line.y > bottom) return;

    // Check current node
    if (node.line.y + node.line.height >= top && node.line.y <= bottom) {
      result.push(node.line);
    }

    // Search children
    if (node.left) {
      this.collectLinesInRange(node.left, top, bottom, result);
    }
    if (node.right) {
      this.collectLinesInRange(node.right, top, bottom, result);
    }
  }

  /**
   * Rebuild offset index for binary search
   */
  private rebuildOffsetIndex(): void {
    this.offsetIndex = [];
    
    // Collect all lines
    const lines = Array.from(this.lineMap.values());
    
    // Sort by start offset
    lines.sort((a, b) => a.startOffset - b.startOffset);
    
    // Build index
    for (const line of lines) {
      this.offsetIndex.push({
        offset: line.startOffset,
        lineNumber: line.lineNumber
      });
    }
    
    // Calculate total height
    this.totalHeight = lines.reduce((max, line) => 
      Math.max(max, line.y + line.height), 0
    );
    
    this.dirtyLines.clear();
  }

  /**
   * Get total line count
   */
  getLineCount(): number {
    return this.lineMap.size;
  }

  /**
   * Get total document height
   */
  getTotalHeight(): number {
    if (this.dirtyLines.size > 0) {
      this.rebuildOffsetIndex();
    }
    return this.totalHeight;
  }

  /**
   * Clear all lines
   */
  clear(): void {
    this.lineMap.clear();
    this.spatialRoot = null;
    this.offsetIndex = [];
    this.viewportCache.clear();
    this.totalHeight = 0;
    this.dirtyLines.clear();
  }

  /**
   * Batch update lines for efficiency
   */
  batchUpdate(lines: VisualLine[]): void {
    // Temporarily disable caching during batch update
    const oldCache = this.viewportCache;
    this.viewportCache = new Map();
    
    for (const line of lines) {
      this.setLine(line);
    }
    
    // Rebuild indices once
    this.rebuildOffsetIndex();
    
    // Restore cache
    this.viewportCache = oldCache;
    this.viewportCache.clear();
  }

  /**
   * Update Y positions after a specific line
   */
  updateYPositions(afterLine: number, deltaY: number): void {
    const lines = Array.from(this.lineMap.values())
      .filter(line => line.lineNumber > afterLine);
    
    for (const line of lines) {
      // Remove from spatial index
      this.spatialRoot = this.removeSpatialNode(this.spatialRoot, line);
      
      // Update Y position
      line.y += deltaY;
      
      // Re-insert into spatial index
      this.spatialRoot = this.insertSpatialNode(this.spatialRoot, line);
    }
    
    // Update total height
    this.totalHeight += deltaY;
    
    // Invalidate cache
    this.viewportCache.clear();
  }
}