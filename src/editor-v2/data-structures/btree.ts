/**
 * B-tree implementation for efficient document content storage and manipulation
 * Provides O(log n) performance for insertions, deletions, and searches
 * Optimized for text editing operations with character offset tracking
 */

export interface BTreeNode<T> {
  keys: T[];
  children: BTreeNode<T>[];
  isLeaf: boolean;
  parent?: BTreeNode<T>;
}

export interface DocumentContent {
  id: string;
  offset: number; // Global character offset
  length: number; // Character count
  text: string;
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'heading5' | 'heading6';
}

export class BTree<T extends DocumentContent> {
  private root: BTreeNode<T>;
  private minDegree: number;
  private compareFn: (a: T, b: T) => number;

  constructor(minDegree: number = 16) {
    this.minDegree = minDegree;
    this.root = this.createNode(true);
    this.compareFn = (a, b) => a.offset - b.offset;
  }

  /**
   * Create a new B-tree node
   */
  private createNode(isLeaf: boolean): BTreeNode<T> {
    return {
      keys: [],
      children: [],
      isLeaf
    };
  }

  /**
   * Insert a new content block into the tree
   * @param content The content to insert
   */
  insert(content: T): void {
    const root = this.root;
    
    if (root.keys.length === 2 * this.minDegree - 1) {
      // Root is full, split it
      const newRoot = this.createNode(false);
      newRoot.children.push(root);
      this.splitChild(newRoot, 0);
      this.root = newRoot;
      root.parent = newRoot;
      this.insertNonFull(newRoot, content);
    } else {
      this.insertNonFull(root, content);
    }
    
    // Update offsets after insertion
    this.updateOffsets(content.offset);
  }

  /**
   * Insert into a non-full node
   */
  private insertNonFull(node: BTreeNode<T>, content: T): void {
    let i = node.keys.length - 1;
    
    if (node.isLeaf) {
      // Find the location where new key must be inserted
      while (i >= 0 && this.compareFn(content, node.keys[i]) < 0) {
        i--;
      }
      
      // Insert the new key at found location
      node.keys.splice(i + 1, 0, content);
    } else {
      // Find the child which is going to have the new key
      while (i >= 0 && this.compareFn(content, node.keys[i]) < 0) {
        i--;
      }
      i++;
      
      const child = node.children[i];
      if (child.keys.length === 2 * this.minDegree - 1) {
        // Child is full, split it
        this.splitChild(node, i);
        
        // After split, decide which of the two children to insert into
        if (this.compareFn(content, node.keys[i]) > 0) {
          i++;
        }
      }
      
      this.insertNonFull(node.children[i], content);
    }
  }

  /**
   * Split a full child node
   */
  private splitChild(parent: BTreeNode<T>, index: number): void {
    const fullChild = parent.children[index];
    const newChild = this.createNode(fullChild.isLeaf);
    
    // Move the second half of keys to new child
    const midIndex = this.minDegree - 1;
    newChild.keys = fullChild.keys.splice(midIndex + 1);
    
    if (!fullChild.isLeaf) {
      // Move the second half of children to new child
      newChild.children = fullChild.children.splice(midIndex + 1);
      // Update parent references
      newChild.children.forEach(child => child.parent = newChild);
    }
    
    // Move the middle key up to parent
    const middleKey = fullChild.keys.pop()!;
    parent.keys.splice(index, 0, middleKey);
    parent.children.splice(index + 1, 0, newChild);
    
    newChild.parent = parent;
  }

  /**
   * Delete content at a specific offset
   */
  delete(offset: number, length: number): T | null {
    const deleted = this.deleteFromNode(this.root, offset, length);
    
    if (deleted) {
      // Update offsets after deletion
      this.updateOffsets(offset, -length);
    }
    
    // If root becomes empty after deletion, make its only child the new root
    if (this.root.keys.length === 0 && !this.root.isLeaf) {
      this.root = this.root.children[0];
      delete this.root.parent;
    }
    
    return deleted;
  }

  /**
   * Delete from a specific node
   */
  private deleteFromNode(node: BTreeNode<T>, offset: number, length: number): T | null {
    let i = 0;
    
    // Find the first key greater than or equal to offset
    while (i < node.keys.length && node.keys[i].offset < offset) {
      i++;
    }
    
    if (i < node.keys.length && node.keys[i].offset === offset) {
      // Key found in this node
      if (node.isLeaf) {
        return node.keys.splice(i, 1)[0];
      } else {
        return this.deleteFromInternalNode(node, i);
      }
    } else if (!node.isLeaf) {
      // Key might be in subtree
      const isInLastChild = (i === node.keys.length);
      const child = node.children[i];
      
      if (child.keys.length < this.minDegree) {
        // Child has minimum number of keys, fill it first
        this.fillChild(node, i);
        
        // After filling, key position might have changed
        if (isInLastChild && i > node.keys.length) {
          return this.deleteFromNode(node.children[i - 1], offset, length);
        } else {
          return this.deleteFromNode(node.children[i], offset, length);
        }
      } else {
        return this.deleteFromNode(child, offset, length);
      }
    }
    
    return null;
  }

  /**
   * Delete from internal node
   */
  private deleteFromInternalNode(node: BTreeNode<T>, index: number): T {
    const key = node.keys[index];
    
    if (node.children[index].keys.length >= this.minDegree) {
      // Replace with predecessor
      const pred = this.getPredecessor(node, index);
      node.keys[index] = pred;
      return this.deleteFromNode(node.children[index], pred.offset, pred.length) || key;
    } else if (node.children[index + 1].keys.length >= this.minDegree) {
      // Replace with successor
      const succ = this.getSuccessor(node, index);
      node.keys[index] = succ;
      return this.deleteFromNode(node.children[index + 1], succ.offset, succ.length) || key;
    } else {
      // Merge with sibling
      this.merge(node, index);
      return this.deleteFromNode(node.children[index], key.offset, key.length) || key;
    }
  }

  /**
   * Get predecessor key
   */
  private getPredecessor(node: BTreeNode<T>, index: number): T {
    let current = node.children[index];
    while (!current.isLeaf) {
      current = current.children[current.children.length - 1];
    }
    return current.keys[current.keys.length - 1];
  }

  /**
   * Get successor key
   */
  private getSuccessor(node: BTreeNode<T>, index: number): T {
    let current = node.children[index + 1];
    while (!current.isLeaf) {
      current = current.children[0];
    }
    return current.keys[0];
  }

  /**
   * Fill child node that has fewer than minDegree-1 keys
   */
  private fillChild(parent: BTreeNode<T>, index: number): void {
    // Try to borrow from previous sibling
    if (index !== 0 && parent.children[index - 1].keys.length >= this.minDegree) {
      this.borrowFromPrev(parent, index);
    }
    // Try to borrow from next sibling
    else if (index !== parent.children.length - 1 && parent.children[index + 1].keys.length >= this.minDegree) {
      this.borrowFromNext(parent, index);
    }
    // Merge with sibling
    else {
      if (index !== parent.children.length - 1) {
        this.merge(parent, index);
      } else {
        this.merge(parent, index - 1);
      }
    }
  }

  /**
   * Borrow a key from previous sibling
   */
  private borrowFromPrev(parent: BTreeNode<T>, childIndex: number): void {
    const child = parent.children[childIndex];
    const sibling = parent.children[childIndex - 1];
    
    // Move a key from parent to child
    child.keys.unshift(parent.keys[childIndex - 1]);
    
    // Move a key from sibling to parent
    parent.keys[childIndex - 1] = sibling.keys.pop()!;
    
    // Move child pointer if not leaf
    if (!child.isLeaf) {
      const borrowedChild = sibling.children.pop()!;
      borrowedChild.parent = child;
      child.children.unshift(borrowedChild);
    }
  }

  /**
   * Borrow a key from next sibling
   */
  private borrowFromNext(parent: BTreeNode<T>, childIndex: number): void {
    const child = parent.children[childIndex];
    const sibling = parent.children[childIndex + 1];
    
    // Move a key from parent to child
    child.keys.push(parent.keys[childIndex]);
    
    // Move a key from sibling to parent
    parent.keys[childIndex] = sibling.keys.shift()!;
    
    // Move child pointer if not leaf
    if (!child.isLeaf) {
      const borrowedChild = sibling.children.shift()!;
      borrowedChild.parent = child;
      child.children.push(borrowedChild);
    }
  }

  /**
   * Merge child with its sibling
   */
  private merge(parent: BTreeNode<T>, index: number): void {
    const child = parent.children[index];
    const sibling = parent.children[index + 1];
    
    // Pull key from parent and merge with right sibling
    child.keys.push(parent.keys[index]);
    child.keys.push(...sibling.keys);
    
    // Copy child pointers if not leaf
    if (!child.isLeaf) {
      child.children.push(...sibling.children);
      sibling.children.forEach(c => c.parent = child);
    }
    
    // Remove the key from parent and remove sibling
    parent.keys.splice(index, 1);
    parent.children.splice(index + 1, 1);
  }

  /**
   * Update offsets after insertion or deletion
   */
  private updateOffsets(startOffset: number, delta: number = 0): void {
    this.updateNodeOffsets(this.root, startOffset, delta);
  }

  /**
   * Recursively update offsets in nodes
   */
  private updateNodeOffsets(node: BTreeNode<T>, startOffset: number, delta: number): void {
    for (let i = 0; i < node.keys.length; i++) {
      if (node.keys[i].offset > startOffset) {
        node.keys[i].offset += delta;
      }
    }
    
    if (!node.isLeaf) {
      for (const child of node.children) {
        this.updateNodeOffsets(child, startOffset, delta);
      }
    }
  }

  /**
   * Find content at a specific offset
   */
  find(offset: number): T | null {
    return this.findInNode(this.root, offset);
  }

  /**
   * Find in a specific node
   */
  private findInNode(node: BTreeNode<T>, offset: number): T | null {
    let i = 0;
    
    // Find the first key where offset is within range
    while (i < node.keys.length) {
      const key = node.keys[i];
      if (offset >= key.offset && offset < key.offset + key.length) {
        return key;
      }
      if (offset < key.offset) {
        break;
      }
      i++;
    }
    
    if (node.isLeaf) {
      return null;
    }
    
    return this.findInNode(node.children[i], offset);
  }

  /**
   * Get all content in order
   */
  toArray(): T[] {
    const result: T[] = [];
    this.inorderTraversal(this.root, result);
    return result;
  }

  /**
   * Inorder traversal to collect all content
   */
  private inorderTraversal(node: BTreeNode<T>, result: T[]): void {
    let i = 0;
    
    for (; i < node.keys.length; i++) {
      if (!node.isLeaf) {
        this.inorderTraversal(node.children[i], result);
      }
      result.push(node.keys[i]);
    }
    
    if (!node.isLeaf) {
      this.inorderTraversal(node.children[i], result);
    }
  }
}