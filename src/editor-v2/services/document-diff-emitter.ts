/**
 * Document Diff Emitter Service - Computes minimal diffs between DocumentModel versions
 * Provides versioning of DocumentModel state snapshots and generates diff operations
 * Used for undo/redo functionality and collaborative editing support
 */

import { DocumentModel, DocumentContent } from '../models/document-model';
import { TextFormatting } from '../data-structures/interval-tree';
import { codeUnitLength } from '../utils/string-utils';

export type DiffOperationType = 
  | 'insert-text'
  | 'delete-text'
  | 'replace-text'
  | 'add-formatting'
  | 'remove-formatting'
  | 'create-block'
  | 'delete-block'
  | 'merge-blocks'
  | 'update-block-type';

export interface DiffOperation {
  type: DiffOperationType;
  offset: number;
  timestamp: number;
}

export interface InsertTextOp extends DiffOperation {
  type: 'insert-text';
  text: string;
  blockId?: string;
}

export interface DeleteTextOp extends DiffOperation {
  type: 'delete-text';
  length: number;
  deletedText: string;
}

export interface ReplaceTextOp extends DiffOperation {
  type: 'replace-text';
  length: number;
  oldText: string;
  newText: string;
}

export interface AddFormattingOp extends DiffOperation {
  type: 'add-formatting';
  formatting: TextFormatting;
}

export interface RemoveFormattingOp extends DiffOperation {
  type: 'remove-formatting';
  formattingId: string;
}

export interface CreateBlockOp extends DiffOperation {
  type: 'create-block';
  block: DocumentContent;
}

export interface DeleteBlockOp extends DiffOperation {
  type: 'delete-block';
  blockId: string;
  block: DocumentContent;
}

export interface MergeBlocksOp extends DiffOperation {
  type: 'merge-blocks';
  firstBlockId: string;
  secondBlockId: string;
  mergedContent: string;
}

export interface UpdateBlockTypeOp extends DiffOperation {
  type: 'update-block-type';
  blockId: string;
  oldType: DocumentContent['type'];
  newType: DocumentContent['type'];
}

export type DiffOp = 
  | InsertTextOp 
  | DeleteTextOp 
  | ReplaceTextOp 
  | AddFormattingOp 
  | RemoveFormattingOp
  | CreateBlockOp
  | DeleteBlockOp
  | MergeBlocksOp
  | UpdateBlockTypeOp;

export interface DocumentSnapshot {
  version: number;
  timestamp: number;
  blocks: DocumentContent[];
  formatting: TextFormatting[];
  totalLength: number;
}

export interface DiffResult {
  operations: DiffOp[];
  fromVersion: number;
  toVersion: number;
}

/**
 * Service for computing diffs between DocumentModel states
 */
export class DocumentDiffEmitter {
  private snapshots: Map<number, DocumentSnapshot> = new Map();
  private maxSnapshots: number = 100;

  /**
   * Create a snapshot of the current DocumentModel state
   */
  createSnapshot(model: DocumentModel): DocumentSnapshot {
    const blocks = model.getBlocks().map(block => ({ ...block }));
    const formatting = model.getFormattingInRange(0, model.getLength()).map(fmt => ({ ...fmt }));
    
    const snapshot: DocumentSnapshot = {
      version: model.getVersion(),
      timestamp: Date.now(),
      blocks,
      formatting,
      totalLength: model.getLength()
    };

    // Store snapshot with version as key
    this.snapshots.set(snapshot.version, snapshot);
    
    // Clean up old snapshots if exceeded limit
    if (this.snapshots.size > this.maxSnapshots) {
      const versions = Array.from(this.snapshots.keys()).sort((a, b) => a - b);
      const toDelete = versions.slice(0, versions.length - this.maxSnapshots);
      toDelete.forEach(v => this.snapshots.delete(v));
    }

    return snapshot;
  }

  /**
   * Compute minimal diff between two DocumentModel snapshots
   */
  diff(prev: DocumentSnapshot, next: DocumentSnapshot): DiffResult {
    const operations: DiffOp[] = [];
    
    // 1. Compute block differences
    const blockOps = this.computeBlockDiffs(prev.blocks, next.blocks);
    operations.push(...blockOps);
    
    // 2. Compute text content differences
    const textOps = this.computeTextDiffs(prev, next, blockOps);
    operations.push(...textOps);
    
    // 3. Compute formatting differences
    const formattingOps = this.computeFormattingDiffs(prev.formatting, next.formatting);
    operations.push(...formattingOps);
    
    return {
      operations: this.optimizeOperations(operations),
      fromVersion: prev.version,
      toVersion: next.version
    };
  }

  /**
   * Compute differences in blocks (create, delete, type changes)
   */
  private computeBlockDiffs(prevBlocks: DocumentContent[], nextBlocks: DocumentContent[]): DiffOp[] {
    const ops: DiffOp[] = [];
    const prevById = new Map(prevBlocks.map(b => [b.id, b]));
    const nextById = new Map(nextBlocks.map(b => [b.id, b]));
    
    // Find deleted blocks
    for (const [id, block] of prevById) {
      if (!nextById.has(id)) {
        ops.push({
          type: 'delete-block',
          blockId: id,
          block: { ...block },
          offset: block.offset,
          timestamp: Date.now()
        } as DeleteBlockOp);
      }
    }
    
    // Find new blocks and type changes
    for (const [id, block] of nextById) {
      const prevBlock = prevById.get(id);
      if (!prevBlock) {
        ops.push({
          type: 'create-block',
          block: { ...block },
          offset: block.offset,
          timestamp: Date.now()
        } as CreateBlockOp);
      } else if (prevBlock.type !== block.type) {
        ops.push({
          type: 'update-block-type',
          blockId: id,
          oldType: prevBlock.type,
          newType: block.type,
          offset: block.offset,
          timestamp: Date.now()
        } as UpdateBlockTypeOp);
      }
    }
    
    return ops;
  }

  /**
   * Compute text content differences using Myers' diff algorithm
   */
  private computeTextDiffs(
    prev: DocumentSnapshot, 
    next: DocumentSnapshot,
    blockOps: DiffOp[]
  ): DiffOp[] {
    const ops: DiffOp[] = [];
    
    // Skip text diff for blocks that were created/deleted
    const skipBlockIds = new Set(
      blockOps
        .filter(op => op.type === 'create-block' || op.type === 'delete-block')
        .map(op => op.type === 'create-block' ? 
          (op as CreateBlockOp).block.id : 
          (op as DeleteBlockOp).blockId
        )
    );
    
    // Compare text in existing blocks
    const prevById = new Map(prev.blocks.map(b => [b.id, b]));
    const nextById = new Map(next.blocks.map(b => [b.id, b]));
    
    for (const [id, nextBlock] of nextById) {
      if (skipBlockIds.has(id)) continue;
      
      const prevBlock = prevById.get(id);
      if (!prevBlock) continue;
      
      if (prevBlock.text !== nextBlock.text) {
        // Simple implementation - can be optimized with Myers' algorithm
        const textOp = this.createTextDiffOp(prevBlock, nextBlock);
        if (textOp) ops.push(textOp);
      }
    }
    
    return ops;
  }

  /**
   * Create text diff operation for a single block
   */
  private createTextDiffOp(prev: DocumentContent, next: DocumentContent): DiffOp | null {
    // Find the common prefix
    let prefixLen = 0;
    const minLen = Math.min(prev.text.length, next.text.length);
    
    while (prefixLen < minLen && prev.text[prefixLen] === next.text[prefixLen]) {
      prefixLen++;
    }
    
    // Find the common suffix
    let suffixLen = 0;
    const maxSuffix = minLen - prefixLen;
    
    while (suffixLen < maxSuffix && 
           prev.text[prev.text.length - 1 - suffixLen] === 
           next.text[next.text.length - 1 - suffixLen]) {
      suffixLen++;
    }
    
    const deleteStart = prefixLen;
    const deleteEnd = prev.text.length - suffixLen;
    const insertStart = prefixLen;
    const insertEnd = next.text.length - suffixLen;
    
    const deletedText = prev.text.substring(deleteStart, deleteEnd);
    const insertedText = next.text.substring(insertStart, insertEnd);
    
    if (deletedText.length === 0 && insertedText.length > 0) {
      return {
        type: 'insert-text',
        offset: prev.offset + prefixLen,
        text: insertedText,
        blockId: prev.id,
        timestamp: Date.now()
      } as InsertTextOp;
    } else if (deletedText.length > 0 && insertedText.length === 0) {
      return {
        type: 'delete-text',
        offset: prev.offset + prefixLen,
        length: codeUnitLength(deletedText),
        deletedText,
        timestamp: Date.now()
      } as DeleteTextOp;
    } else if (deletedText.length > 0 && insertedText.length > 0) {
      return {
        type: 'replace-text',
        offset: prev.offset + prefixLen,
        length: codeUnitLength(deletedText),
        oldText: deletedText,
        newText: insertedText,
        timestamp: Date.now()
      } as ReplaceTextOp;
    }
    
    return null;
  }

  /**
   * Compute formatting differences
   */
  private computeFormattingDiffs(
    prevFormatting: TextFormatting[], 
    nextFormatting: TextFormatting[]
  ): DiffOp[] {
    const ops: DiffOp[] = [];
    const prevById = new Map(prevFormatting.map(f => [f.id, f]));
    const nextById = new Map(nextFormatting.map(f => [f.id, f]));
    
    // Find removed formatting
    for (const [id, fmt] of prevById) {
      if (!nextById.has(id)) {
        ops.push({
          type: 'remove-formatting',
          formattingId: id,
          offset: fmt.start,
          timestamp: Date.now()
        } as RemoveFormattingOp);
      }
    }
    
    // Find added formatting
    for (const [id, fmt] of nextById) {
      if (!prevById.has(id)) {
        ops.push({
          type: 'add-formatting',
          formatting: { ...fmt },
          offset: fmt.start,
          timestamp: Date.now()
        } as AddFormattingOp);
      }
    }
    
    return ops;
  }

  /**
   * Optimize operations by combining adjacent ops where possible
   */
  private optimizeOperations(operations: DiffOp[]): DiffOp[] {
    if (operations.length <= 1) return operations;
    
    const optimized: DiffOp[] = [];
    let i = 0;
    
    while (i < operations.length) {
      const current = operations[i];
      
      // Try to combine adjacent insert operations
      if (current.type === 'insert-text' && i + 1 < operations.length) {
        const next = operations[i + 1];
        if (next.type === 'insert-text' && 
            next.offset === current.offset + codeUnitLength(current.text)) {
          // Combine the operations
          optimized.push({
            ...current,
            text: current.text + next.text
          });
          i += 2;
          continue;
        }
      }
      
      // Try to combine adjacent delete operations
      if (current.type === 'delete-text' && i + 1 < operations.length) {
        const next = operations[i + 1];
        if (next.type === 'delete-text' && next.offset === current.offset) {
          // Combine the operations
          optimized.push({
            ...current,
            length: current.length + next.length,
            deletedText: current.deletedText + next.deletedText
          });
          i += 2;
          continue;
        }
      }
      
      optimized.push(current);
      i++;
    }
    
    return optimized;
  }

  /**
   * Apply a diff operation to a DocumentModel
   */
  applyOperation(model: DocumentModel, operation: DiffOp): void {
    switch (operation.type) {
      case 'insert-text':
        model.insertText(operation.offset, operation.text);
        break;
        
      case 'delete-text':
        model.deleteText(operation.offset, operation.offset + operation.length);
        break;
        
      case 'replace-text':
        model.replaceText(
          operation.offset, 
          operation.offset + operation.length, 
          operation.newText
        );
        break;
        
      case 'add-formatting':
        model.applyFormatting(operation.formatting);
        break;
        
      case 'remove-formatting':
        // Need to find formatting by ID and remove it
        const formatting = model.getFormattingInRange(0, model.getLength())
          .find(f => f.id === operation.formattingId);
        if (formatting) {
          model.removeFormatting(formatting.start, formatting.end, formatting.type);
        }
        break;
        
      case 'create-block':
        model.createBlock(operation.offset, operation.block.type);
        break;
        
      case 'merge-blocks':
        model.mergeBlocks(operation.firstBlockId, operation.secondBlockId);
        break;
        
      // Note: delete-block and update-block-type would need to be implemented in DocumentModel
    }
  }

  /**
   * Apply multiple operations in sequence
   */
  applyOperations(model: DocumentModel, operations: DiffOp[]): void {
    for (const op of operations) {
      this.applyOperation(model, op);
    }
  }

  /**
   * Get a snapshot by version number
   */
  getSnapshot(version: number): DocumentSnapshot | undefined {
    return this.snapshots.get(version);
  }

  /**
   * Clear all stored snapshots
   */
  clearSnapshots(): void {
    this.snapshots.clear();
  }
}