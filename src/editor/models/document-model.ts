/**
 * Unified Document Model - Core data structure for the new editor architecture
 * Combines B-tree for content storage with Interval tree for formatting
 * Provides efficient operations for text editing with global character indexing
 */

import { BTree, DocumentContent } from '../data-structures/btree';
import { IntervalTree, TextFormatting } from '../data-structures/interval-tree';
import { codeUnitLength, sliceByCodeUnits, safeSubstring } from '../utils/string-utils';
import { textMeasurementService } from '../utils/text-measurement';

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
    
    // Initialize with empty block if document is empty
    this.initializeEmptyDocument();
  }
  
  /**
   * Initialize document with a single empty block
   */
  private initializeEmptyDocument(): void {
    if (this.totalLength === 0) {
      const emptyBlock: DocumentContent = {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        offset: 0,
        length: 0,
        text: '',
        type: 'paragraph'
      };
      
      this.content.insert(emptyBlock);
      this.recalculateLines();
    }
  }

  /**
   * Insert text at a specific position
   */
  insertText(offset: number, text: string, blockType: DocumentContent['type'] = 'paragraph'): void {
    if (offset < 0 || offset > this.totalLength) {
      throw new Error(`Invalid offset: ${offset}. Document length: ${this.totalLength}`);
    }

    // Special case: empty document or first block
    const blocks = this.content.toArray();
    if (blocks.length === 0 || (blocks.length === 1 && blocks[0].length === 0 && offset === 0)) {
      if (blocks.length === 1) {
        // Update existing empty block
        const emptyBlock = blocks[0];
        emptyBlock.text = text;
        emptyBlock.length = codeUnitLength(text);
        emptyBlock.type = blockType;
      } else {
        // Create new block
        const newBlock: DocumentContent = {
          id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          offset: 0,
          length: codeUnitLength(text),
          text: text,
          type: blockType
        };
        this.content.insert(newBlock);
      }
      
      this.totalLength = codeUnitLength(text);
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
      return;
    }

    // Find the block containing this offset
    const block = this.content.find(offset);
    
    if (block) {
      // Insert within existing block
      const localOffset = offset - block.offset;
      const newText = sliceByCodeUnits(block.text, 0, localOffset) + text + sliceByCodeUnits(block.text, localOffset);
      
      // Update block
      block.text = newText;
      block.length = codeUnitLength(newText);
      
      // Update formatting positions after this offset
      this.formatting.updateOffsets(offset, codeUnitLength(text));
      
      // Update subsequent block offsets
      this.updateBlockOffsets(block.offset + block.length, codeUnitLength(text));
    } else if (offset === this.totalLength) {
      // Append new block at end
      const newBlock: DocumentContent = {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        offset: offset,
        length: codeUnitLength(text),
        text: text,
        type: blockType
      };
      
      this.content.insert(newBlock);
    }

    this.totalLength += codeUnitLength(text);
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
    if (start < 0 || end > this.totalLength || start > end) {
      throw new Error(`Invalid range: [${start}, ${end}). Document length: ${this.totalLength}`);
    }
    
    // Handle empty range
    if (start === end) {
      return '';
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
        
        deletedText.push(sliceByCodeUnits(block.text, localStart, localEnd));
        
        // Update block text
        block.text = sliceByCodeUnits(block.text, 0, localStart) + sliceByCodeUnits(block.text, localEnd);
        block.length = codeUnitLength(block.text);
        
        if (block.length === 0) {
          affectedBlocks.push(block);
        }
      }
      // Deletion ends within this block
      else if (end > block.offset && end <= blockEnd) {
        const localEnd = end - block.offset;
        
        deletedText.push(sliceByCodeUnits(block.text, 0, localEnd));
        
        // Update block text
        block.text = sliceByCodeUnits(block.text, localEnd);
        block.length = codeUnitLength(block.text);
        block.offset = start;
        
        if (block.length === 0) {
          affectedBlocks.push(block);
        }
      }
    }

    // Remove empty blocks but ensure at least one block remains
    if (affectedBlocks.length < blocks.length) {
      for (const block of affectedBlocks) {
        this.content.delete(block.offset, block.length);
      }
    } else {
      // If all blocks would be deleted, keep one empty block
      const emptyBlock: DocumentContent = {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        offset: 0,
        length: 0,
        text: '',
        type: 'paragraph'
      };
      
      // Clear all blocks
      for (const block of affectedBlocks) {
        this.content.delete(block.offset, block.length);
      }
      
      // Insert empty block
      this.content.insert(emptyBlock);
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
   * Calculate visual lines within a block using text measurement service
   */
  private calculateBlockLines(block: DocumentContent): { start: number; end: number }[] {
    // Use text measurement service for accurate line calculation
    const measurement = textMeasurementService.measureBlock(
      block.id,
      block.text,
      block.type,
      600 // Default editor width, should be configurable
    );
    
    // Convert measurement lines to document offsets
    return measurement.lines.map(line => ({
      start: block.offset + line.start,
      end: block.offset + line.end
    }));
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
      
      result.push(sliceByCodeUnits(block.text, localStart, localEnd));
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
    // This will split the current block if offset is in the middle or at the end
    const block = this.content.find(offset);
    
    if (block && offset <= block.offset + block.length) {
      // Split existing block
      const localOffset = Math.min(offset - block.offset, block.length);
      const beforeText = sliceByCodeUnits(block.text, 0, localOffset);
      const afterText = sliceByCodeUnits(block.text, localOffset);
      
      // Update current block
      block.text = beforeText;
      block.length = codeUnitLength(beforeText);
      
      // Create new block
      const newBlock: DocumentContent = {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        offset: offset,
        length: codeUnitLength(afterText),
        text: afterText,
        type: type
      };
      
      this.content.insert(newBlock);
      
      // Update subsequent blocks
      this.updateBlockOffsets(offset, 0);
    } else if (offset === this.totalLength) {
      // Handle the case where offset is at the very end and no block was found
      const newBlock: DocumentContent = {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        offset: offset,
        length: 0,
        text: '',
        type: type
      };
      this.content.insert(newBlock);
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
    firstBlock.length = codeUnitLength(firstBlock.text);
    
    // Delete second block
    this.content.delete(secondBlock.offset, secondBlock.length);
    
    this.recalculateLines();
  }
}