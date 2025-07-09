/**
 * Unified Document Model - Core data structure for the new editor architecture
 * Combines B-tree for content storage with Interval tree for formatting
 * Provides efficient operations for text editing with global character indexing
 */

import { BTree, DocumentContent } from '../data-structures/btree';
import { IntervalTree, TextFormatting } from '../data-structures/interval-tree';

export interface LineInfo {
  lineNumber: number;
  startOffset: number;
  endOffset: number;
  height: number;
  blockId: string;
  visualLineInBlock: number; // Which visual line within its block
}

export interface DocumentRange {
  start: number;
  end: number;
}

export interface DocumentChange {
  offset: number;
  deletedLength: number;
  insertedText: string;
  timestamp: number;
}

export class DocumentModel {
  private content: BTree<DocumentContent>;
  private formatting: IntervalTree<TextFormatting>;
  private lineRegistry: Map<number, LineInfo>;
  private totalLength: number;
  private version: number;
  private changeListeners: ((change: DocumentChange) => void)[];

  constructor() {
    this.content = new BTree<DocumentContent>();
    this.formatting = new IntervalTree<TextFormatting>();
    this.lineRegistry = new Map();
    this.totalLength = 0;
    this.version = 0;
    this.changeListeners = [];
  }

  /**
   * Insert text at a specific position
   */
  insertText(offset: number, text: string, blockType: DocumentContent['type'] = 'paragraph'): void {
    if (offset < 0 || offset > this.totalLength) {
      throw new Error(`Invalid offset: ${offset}. Document length: ${this.totalLength}`);
    }

    // Find the block containing this offset
    const block = this.content.find(offset);
    
    if (block) {
      // Insert within existing block
      const localOffset = offset - block.offset;
      const newText = block.text.slice(0, localOffset) + text + block.text.slice(localOffset);
      
      // Update block
      block.text = newText;
      block.length = newText.length;
      
      // Update formatting positions after this offset
      this.formatting.updateOffsets(offset, text.length);
      
      // Update subsequent block offsets
      this.updateBlockOffsets(block.offset + block.length, text.length);
    } else if (offset === this.totalLength) {
      // Append new block at end
      const newBlock: DocumentContent = {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        offset: offset,
        length: text.length,
        text: text,
        type: blockType
      };
      
      this.content.insert(newBlock);
    }

    this.totalLength += text.length;
    this.version++;
    
    // Notify listeners
    this.notifyChange({
      offset,
      deletedLength: 0,
      insertedText: text,
      timestamp: Date.now()
    });
    
    // Recalculate lines
    this.recalculateLines();
  }

  /**
   * Delete text from a specific range
   */
  deleteText(start: number, end: number): string {
    if (start < 0 || end > this.totalLength || start >= end) {
      throw new Error(`Invalid range: [${start}, ${end}). Document length: ${this.totalLength}`);
    }

    const deletedText: string[] = [];
    const length = end - start;

    // Find all blocks in the range
    const blocks = this.content.toArray();
    const affectedBlocks: DocumentContent[] = [];

    for (const block of blocks) {
      const blockEnd = block.offset + block.length;
      
      // Block is completely within deletion range
      if (block.offset >= start && blockEnd <= end) {
        affectedBlocks.push(block);
        deletedText.push(block.text);
      }
      // Deletion starts within this block
      else if (start >= block.offset && start < blockEnd) {
        const localStart = start - block.offset;
        const localEnd = Math.min(end - block.offset, block.length);
        
        deletedText.push(block.text.slice(localStart, localEnd));
        
        // Update block text
        block.text = block.text.slice(0, localStart) + block.text.slice(localEnd);
        block.length = block.text.length;
        
        if (block.length === 0) {
          affectedBlocks.push(block);
        }
      }
      // Deletion ends within this block
      else if (end > block.offset && end <= blockEnd) {
        const localEnd = end - block.offset;
        
        deletedText.push(block.text.slice(0, localEnd));
        
        // Update block text
        block.text = block.text.slice(localEnd);
        block.length = block.text.length;
        block.offset = start;
        
        if (block.length === 0) {
          affectedBlocks.push(block);
        }
      }
    }

    // Remove empty blocks
    for (const block of affectedBlocks) {
      this.content.delete(block.offset, block.length);
    }

    // Update formatting
    this.formatting.updateOffsets(start, -length);

    // Update subsequent block offsets
    this.updateBlockOffsets(start, -length);

    this.totalLength -= length;
    this.version++;

    const deleted = deletedText.join('');
    
    // Notify listeners
    this.notifyChange({
      offset: start,
      deletedLength: length,
      insertedText: '',
      timestamp: Date.now()
    });
    
    // Recalculate lines
    this.recalculateLines();

    return deleted;
  }

  /**
   * Replace text in a range
   */
  replaceText(start: number, end: number, text: string): void {
    this.deleteText(start, end);
    this.insertText(start, text);
  }

  /**
   * Apply formatting to a range
   */
  applyFormatting(formatting: TextFormatting): void {
    // Remove existing formatting of the same type in the range
    const existing = this.formatting.query(formatting.start, formatting.end);
    for (const fmt of existing) {
      if (fmt.type === formatting.type) {
        this.formatting.delete(fmt);
      }
    }

    // Add new formatting
    this.formatting.insert(formatting);
    this.version++;
  }

  /**
   * Remove formatting from a range
   */
  removeFormatting(start: number, end: number, type?: TextFormatting['type']): void {
    const existing = this.formatting.query(start, end);
    
    for (const fmt of existing) {
      if (!type || fmt.type === type) {
        // Check if formatting needs to be split
        if (fmt.start < start && fmt.end > end) {
          // Split into two parts
          this.formatting.delete(fmt);
          
          // Before part
          this.formatting.insert({
            ...fmt,
            end: start
          });
          
          // After part
          this.formatting.insert({
            ...fmt,
            start: end
          });
        } else if (fmt.start < start) {
          // Trim end
          this.formatting.delete(fmt);
          this.formatting.insert({
            ...fmt,
            end: start
          });
        } else if (fmt.end > end) {
          // Trim start
          this.formatting.delete(fmt);
          this.formatting.insert({
            ...fmt,
            start: end
          });
        } else {
          // Completely within range, delete it
          this.formatting.delete(fmt);
        }
      }
    }
    
    this.version++;
  }

  /**
   * Get formatting at a specific position
   */
  getFormattingAt(offset: number): TextFormatting[] {
    return this.formatting.getFormattingAtPosition(offset);
  }

  /**
   * Get all formatting in a range
   */
  getFormattingInRange(start: number, end: number): TextFormatting[] {
    return this.formatting.query(start, end);
  }

  /**
   * Update block offsets after an insertion/deletion
   */
  private updateBlockOffsets(afterOffset: number, delta: number): void {
    const blocks = this.content.toArray();
    
    for (const block of blocks) {
      if (block.offset >= afterOffset) {
        block.offset += delta;
      }
    }
  }

  /**
   * Recalculate line information
   */
  private recalculateLines(): void {
    this.lineRegistry.clear();
    
    const blocks = this.content.toArray();
    let lineNumber = 1;
    
    for (const block of blocks) {
      const lines = this.calculateBlockLines(block);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        this.lineRegistry.set(lineNumber++, {
          lineNumber: lineNumber - 1,
          startOffset: line.start,
          endOffset: line.end,
          height: this.getLineHeight(block.type),
          blockId: block.id,
          visualLineInBlock: i
        });
      }
    }
  }

  /**
   * Calculate visual lines within a block
   */
  private calculateBlockLines(block: DocumentContent): { start: number; end: number }[] {
    // For now, simple implementation - split by newlines
    // In the full implementation, this would calculate based on width
    const lines: { start: number; end: number }[] = [];
    const text = block.text;
    let lineStart = block.offset;
    
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n' || i === text.length - 1) {
        lines.push({
          start: lineStart,
          end: block.offset + i + (i === text.length - 1 ? 1 : 0)
        });
        lineStart = block.offset + i + 1;
      }
    }
    
    if (lines.length === 0) {
      lines.push({ start: block.offset, end: block.offset });
    }
    
    return lines;
  }

  /**
   * Get line height based on block type
   */
  private getLineHeight(type: DocumentContent['type']): number {
    const heights = {
      paragraph: 18.4, // 1.15rem in pixels
      heading1: 40,
      heading2: 32,
      heading3: 28,
      heading4: 24,
      heading5: 20,
      heading6: 18
    };
    
    return heights[type] || 18.4;
  }

  /**
   * Get line info by line number
   */
  getLine(lineNumber: number): LineInfo | undefined {
    return this.lineRegistry.get(lineNumber);
  }

  /**
   * Get line info by offset
   */
  getLineByOffset(offset: number): LineInfo | undefined {
    for (const [_, line] of this.lineRegistry) {
      if (offset >= line.startOffset && offset <= line.endOffset) {
        return line;
      }
    }
    return undefined;
  }

  /**
   * Get total line count
   */
  getLineCount(): number {
    return this.lineRegistry.size;
  }

  /**
   * Get content as plain text
   */
  getText(start: number = 0, end: number = this.totalLength): string {
    const blocks = this.content.toArray();
    const result: string[] = [];
    
    for (const block of blocks) {
      const blockEnd = block.offset + block.length;
      
      if (blockEnd <= start || block.offset >= end) {
        continue;
      }
      
      const localStart = Math.max(0, start - block.offset);
      const localEnd = Math.min(block.length, end - block.offset);
      
      result.push(block.text.slice(localStart, localEnd));
    }
    
    return result.join('');
  }

  /**
   * Get all blocks
   */
  getBlocks(): DocumentContent[] {
    return this.content.toArray();
  }

  /**
   * Get document length
   */
  getLength(): number {
    return this.totalLength;
  }

  /**
   * Get document version
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Add change listener
   */
  onChange(listener: (change: DocumentChange) => void): () => void {
    this.changeListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index !== -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify change listeners
   */
  private notifyChange(change: DocumentChange): void {
    for (const listener of this.changeListeners) {
      listener(change);
    }
  }

  /**
   * Create a new block at offset
   */
  createBlock(offset: number, type: DocumentContent['type'] = 'paragraph'): void {
    // This will split the current block if offset is in the middle
    const block = this.content.find(offset);
    
    if (block && offset < block.offset + block.length) {
      // Split existing block
      const localOffset = offset - block.offset;
      const beforeText = block.text.slice(0, localOffset);
      const afterText = block.text.slice(localOffset);
      
      // Update current block
      block.text = beforeText;
      block.length = beforeText.length;
      
      // Create new block
      const newBlock: DocumentContent = {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        offset: offset,
        length: afterText.length,
        text: afterText,
        type: type
      };
      
      this.content.insert(newBlock);
      
      // Update subsequent blocks
      this.updateBlockOffsets(offset, 0);
    }
    
    this.recalculateLines();
  }

  /**
   * Merge blocks
   */
  mergeBlocks(firstBlockId: string, secondBlockId: string): void {
    const blocks = this.content.toArray();
    const firstBlock = blocks.find(b => b.id === firstBlockId);
    const secondBlock = blocks.find(b => b.id === secondBlockId);
    
    if (!firstBlock || !secondBlock) return;
    
    // Merge text
    firstBlock.text += secondBlock.text;
    firstBlock.length = firstBlock.text.length;
    
    // Delete second block
    this.content.delete(secondBlock.offset, secondBlock.length);
    
    this.recalculateLines();
  }
}