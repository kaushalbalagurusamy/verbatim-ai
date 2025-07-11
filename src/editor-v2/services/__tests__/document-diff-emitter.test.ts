/**
 * Unit tests for DocumentDiffEmitter service
 * Verifies diff operations can recreate exact state transitions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentDiffEmitter, DocumentSnapshot } from '../document-diff-emitter';
import { DocumentModel } from '../../models/document-model';
import { TextFormatting } from '../../data-structures/interval-tree';

describe('DocumentDiffEmitter', () => {
  let diffEmitter: DocumentDiffEmitter;
  let model1: DocumentModel;
  let model2: DocumentModel;

  beforeEach(() => {
    diffEmitter = new DocumentDiffEmitter();
    model1 = new DocumentModel();
    model2 = new DocumentModel();
  });

  describe('createSnapshot', () => {
    it('should create a snapshot of document state', () => {
      model1.insertText(0, 'Hello World');
      const snapshot = diffEmitter.createSnapshot(model1);

      expect(snapshot.version).toBe(1);
      expect(snapshot.totalLength).toBe(11);
      expect(snapshot.blocks).toHaveLength(1);
      expect(snapshot.blocks[0].text).toBe('Hello World');
      expect(snapshot.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should capture formatting in snapshot', () => {
      model1.insertText(0, 'Bold text here');
      model1.applyFormatting({
        start: 0,
        end: 4,
        type: 'bold',
        id: 'fmt-1'
      });

      const snapshot = diffEmitter.createSnapshot(model1);
      expect(snapshot.formatting).toHaveLength(1);
      expect(snapshot.formatting[0]).toMatchObject({
        start: 0,
        end: 4,
        type: 'bold'
      });
    });

    it('should limit number of stored snapshots', () => {
      // Set max snapshots to a smaller number for testing
      const testEmitter = new DocumentDiffEmitter();
      (testEmitter as any).maxSnapshots = 5;

      // Create more than max snapshots
      for (let i = 0; i < 10; i++) {
        model1.insertText(model1.getLength(), `text${i}`);
        testEmitter.createSnapshot(model1);
      }

      // Should only keep the latest 5
      expect((testEmitter as any).snapshots.size).toBe(5);
    });
  });

  describe('diff - text operations', () => {
    it('should detect insert operations', () => {
      model1.insertText(0, 'Hello');
      const snapshot1 = diffEmitter.createSnapshot(model1);

      model1.insertText(5, ' World');
      const snapshot2 = diffEmitter.createSnapshot(model1);

      const diff = diffEmitter.diff(snapshot1, snapshot2);
      
      // Should have at least one operation
      expect(diff.operations.length).toBeGreaterThan(0);
      
      // Find insert operation - DocumentModel creates a new block when appending at end
      const insertOp = diff.operations.find(op => op.type === 'insert-text');
      
      expect(insertOp).toBeDefined();
      expect(insertOp).toMatchObject({
        type: 'insert-text',
        offset: 5,
        text: ' World'
      });
    });

    it('should detect delete operations', () => {
      model1.insertText(0, 'Hello World');
      const snapshot1 = diffEmitter.createSnapshot(model1);

      model1.deleteText(5, 11);
      const snapshot2 = diffEmitter.createSnapshot(model1);

      const diff = diffEmitter.diff(snapshot1, snapshot2);
      
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toMatchObject({
        type: 'delete-text',
        offset: 5,
        length: 6,
        deletedText: ' World'
      });
    });

    it('should detect replace operations', () => {
      model1.insertText(0, 'Hello World');
      const snapshot1 = diffEmitter.createSnapshot(model1);

      // Manually create a snapshot with replaced text to test pure diff logic
      const snapshot2: DocumentSnapshot = {
        version: 2,
        timestamp: Date.now(),
        blocks: [{
          ...snapshot1.blocks[0],
          text: 'Hello Universe',
          length: 14
        }],
        formatting: [],
        totalLength: 14
      };

      const diff = diffEmitter.diff(snapshot1, snapshot2);
      
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toMatchObject({
        type: 'replace-text',
        offset: 6,
        length: 5,
        oldText: 'World',
        newText: 'Universe'
      });
    });

    it('should handle complex text changes with common prefix/suffix', () => {
      model1.insertText(0, 'The quick brown fox');
      const snapshot1 = diffEmitter.createSnapshot(model1);

      // Change to "The slow brown fox"
      model1.replaceText(4, 9, 'slow');
      const snapshot2 = diffEmitter.createSnapshot(model1);

      const diff = diffEmitter.diff(snapshot1, snapshot2);
      
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toMatchObject({
        type: 'replace-text',
        offset: 4,
        oldText: 'quick',
        newText: 'slow'
      });
    });
  });

  describe('diff - formatting operations', () => {
    it('should detect added formatting', () => {
      model1.insertText(0, 'Some text');
      const snapshot1 = diffEmitter.createSnapshot(model1);

      model1.applyFormatting({
        start: 0,
        end: 4,
        type: 'bold',
        id: 'fmt-1'
      });
      const snapshot2 = diffEmitter.createSnapshot(model1);

      const diff = diffEmitter.diff(snapshot1, snapshot2);
      
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toMatchObject({
        type: 'add-formatting',
        formatting: {
          start: 0,
          end: 4,
          type: 'bold'
        }
      });
    });

    it('should detect removed formatting', () => {
      model1.insertText(0, 'Some text');
      model1.applyFormatting({
        start: 0,
        end: 4,
        type: 'bold',
        id: 'fmt-1'
      });
      const snapshot1 = diffEmitter.createSnapshot(model1);

      model1.removeFormatting(0, 4, 'bold');
      const snapshot2 = diffEmitter.createSnapshot(model1);

      const diff = diffEmitter.diff(snapshot1, snapshot2);
      
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toMatchObject({
        type: 'remove-formatting',
        formattingId: 'fmt-1'
      });
    });
  });

  describe('diff - block operations', () => {
    it('should detect block creation', () => {
      model1.insertText(0, 'First block');
      const snapshot1 = diffEmitter.createSnapshot(model1);

      // Create a new block by splitting
      model1.createBlock(5);
      const snapshot2 = diffEmitter.createSnapshot(model1);

      const diff = diffEmitter.diff(snapshot1, snapshot2);
      
      // Should have a create block operation
      const createOps = diff.operations.filter(op => op.type === 'create-block');
      expect(createOps).toHaveLength(1);
    });

    it('should detect block type changes', () => {
      model1.insertText(0, 'Title', 'paragraph');
      const blocks1 = model1.getBlocks();
      const blockId = blocks1[0].id;
      const snapshot1 = diffEmitter.createSnapshot(model1);

      // Manually modify the snapshot to simulate type change
      // (since DocumentModel doesn't have updateBlockType method)
      const snapshot2: DocumentSnapshot = {
        ...snapshot1,
        version: 2,
        blocks: [{
          ...snapshot1.blocks[0],
          type: 'heading1'
        }]
      };

      const diff = diffEmitter.diff(snapshot1, snapshot2);
      
      expect(diff.operations).toHaveLength(1);
      expect(diff.operations[0]).toMatchObject({
        type: 'update-block-type',
        blockId: blockId,
        oldType: 'paragraph',
        newType: 'heading1'
      });
    });
  });

  describe('optimizeOperations', () => {
    it('should combine adjacent insert operations', () => {
      model1.insertText(0, 'Hello');
      const snapshot1 = diffEmitter.createSnapshot(model1);

      // Two adjacent inserts
      model1.insertText(5, ' ');
      model1.insertText(6, 'World');
      const snapshot2 = diffEmitter.createSnapshot(model1);

      // Manually create unoptimized diff
      const unoptimized = {
        operations: [
          {
            type: 'insert-text' as const,
            offset: 5,
            text: ' ',
            timestamp: Date.now()
          },
          {
            type: 'insert-text' as const,
            offset: 6,
            text: 'World',
            timestamp: Date.now()
          }
        ],
        fromVersion: 1,
        toVersion: 2
      };

      const optimized = (diffEmitter as any).optimizeOperations(unoptimized.operations);
      
      expect(optimized).toHaveLength(1);
      expect(optimized[0]).toMatchObject({
        type: 'insert-text',
        offset: 5,
        text: ' World'
      });
    });

    it('should combine adjacent delete operations', () => {
      // Create manual operations to test optimization
      const ops = [
        {
          type: 'delete-text' as const,
          offset: 5,
          length: 3,
          deletedText: 'abc',
          timestamp: Date.now()
        },
        {
          type: 'delete-text' as const,
          offset: 5,
          length: 2,
          deletedText: 'de',
          timestamp: Date.now()
        }
      ];

      const optimized = (diffEmitter as any).optimizeOperations(ops);
      
      expect(optimized).toHaveLength(1);
      expect(optimized[0]).toMatchObject({
        type: 'delete-text',
        offset: 5,
        length: 5,
        deletedText: 'abcde'
      });
    });
  });

  describe('applyOperation', () => {
    it('should apply insert operation', () => {
      model2.insertText(0, 'Hello');
      
      diffEmitter.applyOperation(model2, {
        type: 'insert-text',
        offset: 5,
        text: ' World',
        timestamp: Date.now()
      });

      expect(model2.getText()).toBe('Hello World');
    });

    it('should apply delete operation', () => {
      model2.insertText(0, 'Hello World');
      
      diffEmitter.applyOperation(model2, {
        type: 'delete-text',
        offset: 5,
        length: 6,
        deletedText: ' World',
        timestamp: Date.now()
      });

      expect(model2.getText()).toBe('Hello');
    });

    it('should apply formatting operations', () => {
      model2.insertText(0, 'Some text');
      
      const formatting: TextFormatting = {
        start: 0,
        end: 4,
        type: 'bold',
        id: 'fmt-1'
      };

      diffEmitter.applyOperation(model2, {
        type: 'add-formatting',
        offset: 0,
        formatting,
        timestamp: Date.now()
      });

      const appliedFormatting = model2.getFormattingInRange(0, 4);
      expect(appliedFormatting).toHaveLength(1);
      expect(appliedFormatting[0].type).toBe('bold');
    });
  });

  describe('full reconstruction test', () => {
    it('should recreate exact state transitions through diff operations', () => {
      // Create a complex editing sequence
      const source = new DocumentModel();
      const target = new DocumentModel();

      // Step 1: Initial text
      source.insertText(0, 'The quick brown fox jumps over the lazy dog.');
      const snapshot1 = diffEmitter.createSnapshot(source);
      
      // Apply same to target
      target.insertText(0, 'The quick brown fox jumps over the lazy dog.');

      // Step 2: Make changes
      source.replaceText(4, 9, 'slow'); // quick -> slow
      source.applyFormatting({
        start: 10,
        end: 15,
        type: 'bold',
        id: 'fmt-1'
      });
      source.insertText(15, ' and agile');
      const snapshot2 = diffEmitter.createSnapshot(source);

      // Compute diff
      const diff = diffEmitter.diff(snapshot1, snapshot2);

      // Apply diff to target
      diffEmitter.applyOperations(target, diff.operations);

      // Verify states match
      expect(target.getText()).toBe(source.getText());
      expect(target.getVersion()).toBeGreaterThan(1);
      
      // Verify formatting matches
      const sourceFormatting = source.getFormattingInRange(0, source.getLength());
      const targetFormatting = target.getFormattingInRange(0, target.getLength());
      
      expect(targetFormatting).toHaveLength(sourceFormatting.length);
      expect(targetFormatting[0]).toMatchObject({
        start: 10,
        end: 15,
        type: 'bold'
      });
    });

    it('should handle emoji and unicode correctly', () => {
      const source = new DocumentModel();
      source.insertText(0, 'Hello 👋 World 🌍!');
      const snapshot1 = diffEmitter.createSnapshot(source);

      source.replaceText(6, 8, '🤝'); // Replace wave with handshake
      const snapshot2 = diffEmitter.createSnapshot(source);

      const diff = diffEmitter.diff(snapshot1, snapshot2);
      
      // Apply to fresh model
      const fresh = new DocumentModel();
      fresh.insertText(0, 'Hello 👋 World 🌍!');
      diffEmitter.applyOperations(fresh, diff.operations);

      expect(fresh.getText()).toBe('Hello 🤝 World 🌍!');
    });
  });

  describe('getSnapshot', () => {
    it('should retrieve snapshot by version', () => {
      model1.insertText(0, 'Version 1');
      const snap1 = diffEmitter.createSnapshot(model1);

      model1.insertText(9, ' - Updated');
      const snap2 = diffEmitter.createSnapshot(model1);

      expect(diffEmitter.getSnapshot(1)).toEqual(snap1);
      expect(diffEmitter.getSnapshot(2)).toEqual(snap2);
      expect(diffEmitter.getSnapshot(3)).toBeUndefined();
    });
  });

  describe('clearSnapshots', () => {
    it('should clear all stored snapshots', () => {
      model1.insertText(0, 'Test');
      diffEmitter.createSnapshot(model1);
      
      expect(diffEmitter.getSnapshot(1)).toBeDefined();
      
      diffEmitter.clearSnapshots();
      
      expect(diffEmitter.getSnapshot(1)).toBeUndefined();
    });
  });
});