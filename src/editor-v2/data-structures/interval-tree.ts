/**
 * Interval Tree implementation for efficient formatting range storage and queries
 * Provides O(log n) performance for range queries and insertions
 * Optimized for overlapping text formatting ranges
 */

export interface Interval {
  start: number;
  end: number;
}

export interface TextFormatting extends Interval {
  type: 'bold' | 'highlight' | 'minimize';
  color?: 'yellow' | 'blue' | 'green' | 'pink'; // For highlights
  id: string;
}

interface IntervalNode<T extends Interval> {
  interval: T;
  max: number; // Maximum end value in this subtree
  left: IntervalNode<T> | null;
  right: IntervalNode<T> | null;
  height: number;
}

export class IntervalTree<T extends Interval> {
  private root: IntervalNode<T> | null = null;
  private idCounter = 0;

  /**
   * Insert a new interval into the tree
   */
  insert(interval: T): void {
    // Assign ID if it's a TextFormatting without one
    if ('type' in interval && !('id' in interval)) {
      (interval as any).id = `fmt-${this.idCounter++}`;
    }
    this.root = this.insertNode(this.root, interval);
  }

  /**
   * Insert node recursively
   */
  private insertNode(node: IntervalNode<T> | null, interval: T): IntervalNode<T> {
    if (!node) {
      return {
        interval,
        max: interval.end,
        left: null,
        right: null,
        height: 1
      };
    }

    // Insert based on start position
    if (interval.start < node.interval.start) {
      node.left = this.insertNode(node.left, interval);
    } else {
      node.right = this.insertNode(node.right, interval);
    }

    // Update height and max
    node.height = 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
    node.max = Math.max(
      node.interval.end,
      node.left ? node.left.max : 0,
      node.right ? node.right.max : 0
    );

    // Balance the tree
    return this.balance(node);
  }

  /**
   * Balance the tree using AVL rotations
   */
  private balance(node: IntervalNode<T>): IntervalNode<T> {
    const balanceFactor = this.getBalanceFactor(node);

    // Left heavy
    if (balanceFactor > 1) {
      if (node.left && this.getBalanceFactor(node.left) < 0) {
        node.left = this.rotateLeft(node.left);
      }
      return this.rotateRight(node);
    }

    // Right heavy
    if (balanceFactor < -1) {
      if (node.right && this.getBalanceFactor(node.right) > 0) {
        node.right = this.rotateRight(node.right);
      }
      return this.rotateLeft(node);
    }

    return node;
  }

  /**
   * Rotate left
   */
  private rotateLeft(node: IntervalNode<T>): IntervalNode<T> {
    const right = node.right!;
    node.right = right.left;
    right.left = node;

    // Update heights
    node.height = 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
    right.height = 1 + Math.max(this.getHeight(right.left), this.getHeight(right.right));

    // Update max values
    node.max = Math.max(
      node.interval.end,
      node.left ? node.left.max : 0,
      node.right ? node.right.max : 0
    );
    right.max = Math.max(
      right.interval.end,
      right.left ? right.left.max : 0,
      right.right ? right.right.max : 0
    );

    return right;
  }

  /**
   * Rotate right
   */
  private rotateRight(node: IntervalNode<T>): IntervalNode<T> {
    const left = node.left!;
    node.left = left.right;
    left.right = node;

    // Update heights
    node.height = 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
    left.height = 1 + Math.max(this.getHeight(left.left), this.getHeight(left.right));

    // Update max values
    node.max = Math.max(
      node.interval.end,
      node.left ? node.left.max : 0,
      node.right ? node.right.max : 0
    );
    left.max = Math.max(
      left.interval.end,
      left.left ? left.left.max : 0,
      left.right ? left.right.max : 0
    );

    return left;
  }

  /**
   * Get node height
   */
  private getHeight(node: IntervalNode<T> | null): number {
    return node ? node.height : 0;
  }

  /**
   * Get balance factor
   */
  private getBalanceFactor(node: IntervalNode<T>): number {
    return this.getHeight(node.left) - this.getHeight(node.right);
  }

  /**
   * Delete an interval from the tree
   */
  delete(interval: T): boolean {
    const result = { deleted: false };
    this.root = this.deleteNode(this.root, interval, result);
    return result.deleted;
  }

  /**
   * Delete node recursively
   */
  private deleteNode(
    node: IntervalNode<T> | null,
    interval: T,
    result: { deleted: boolean }
  ): IntervalNode<T> | null {
    if (!node) return null;

    // Compare intervals
    if (interval.start < node.interval.start) {
      node.left = this.deleteNode(node.left, interval, result);
    } else if (interval.start > node.interval.start) {
      node.right = this.deleteNode(node.right, interval, result);
    } else if (interval.end === node.interval.end) {
      // Found the interval to delete
      result.deleted = true;

      if (!node.left) return node.right;
      if (!node.right) return node.left;

      // Node has two children, find inorder successor
      let minNode = node.right;
      while (minNode.left) {
        minNode = minNode.left;
      }

      node.interval = minNode.interval;
      node.right = this.deleteNode(node.right, minNode.interval, { deleted: false });
    } else {
      // Same start but different end, continue searching
      node.right = this.deleteNode(node.right, interval, result);
    }

    if (!node) return null;

    // Update height and max
    node.height = 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
    node.max = Math.max(
      node.interval.end,
      node.left ? node.left.max : 0,
      node.right ? node.right.max : 0
    );

    return this.balance(node);
  }

  /**
   * Query all intervals that overlap with a given range
   */
  query(start: number, end: number): T[] {
    const results: T[] = [];
    this.queryNode(this.root, start, end, results);
    return results;
  }

  /**
   * Query node recursively
   */
  private queryNode(
    node: IntervalNode<T> | null,
    start: number,
    end: number,
    results: T[]
  ): void {
    if (!node) return;

    // Check if current interval overlaps
    if (this.overlaps(node.interval, start, end)) {
      results.push(node.interval);
    }

    // Search left subtree if it might contain overlapping intervals
    if (node.left && node.left.max >= start) {
      this.queryNode(node.left, start, end, results);
    }

    // Search right subtree if it might contain overlapping intervals
    if (node.right && node.interval.start <= end) {
      this.queryNode(node.right, start, end, results);
    }
  }

  /**
   * Query all intervals that contain a specific point
   */
  queryPoint(point: number): T[] {
    return this.query(point, point);
  }

  /**
   * Check if two intervals overlap
   */
  private overlaps(interval: Interval, start: number, end: number): boolean {
    return interval.start <= end && interval.end >= start;
  }

  /**
   * Update offsets after text insertion/deletion
   */
  updateOffsets(position: number, delta: number): void {
    const allIntervals = this.toArray();
    this.root = null;

    for (const interval of allIntervals) {
      if (interval.start >= position) {
        interval.start += delta;
        interval.end += delta;
      } else if (interval.end > position) {
        // Interval spans the position
        interval.end += delta;
        
        // If deletion makes interval invalid, skip it
        if (interval.end <= interval.start) {
          continue;
        }
      }
      
      this.insert(interval);
    }
  }

  /**
   * Get all intervals in sorted order
   */
  toArray(): T[] {
    const results: T[] = [];
    this.inorderTraversal(this.root, results);
    return results;
  }

  /**
   * Inorder traversal
   */
  private inorderTraversal(node: IntervalNode<T> | null, results: T[]): void {
    if (!node) return;

    this.inorderTraversal(node.left, results);
    results.push(node.interval);
    this.inorderTraversal(node.right, results);
  }

  /**
   * Clear all intervals
   */
  clear(): void {
    this.root = null;
  }

  /**
   * Get formatting at a specific position with priority rules
   */
  getFormattingAtPosition(position: number): TextFormatting[] {
    const formatting = this.queryPoint(position) as TextFormatting[];
    
    // Sort by priority: minimize > highlight > bold
    return formatting.sort((a, b) => {
      const priority = { minimize: 3, highlight: 2, bold: 1 };
      return priority[b.type] - priority[a.type];
    });
  }

  /**
   * Merge overlapping intervals of the same type
   */
  mergeOverlapping(): void {
    const intervals = this.toArray() as TextFormatting[];
    this.root = null;

    // Group by type and color
    const grouped = new Map<string, TextFormatting[]>();
    
    for (const interval of intervals) {
      const key = interval.type + (interval.color || '');
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(interval);
    }

    // Merge each group
    for (const [key, group] of grouped) {
      // Sort by start position
      group.sort((a, b) => a.start - b.start);

      let current = group[0];
      for (let i = 1; i < group.length; i++) {
        const next = group[i];
        
        // Check if intervals overlap or are adjacent
        if (current.end >= next.start - 1) {
          // Merge intervals
          current.end = Math.max(current.end, next.end);
        } else {
          // Add current and start new
          this.insert(current);
          current = next;
        }
      }
      
      this.insert(current);
    }
  }
}