/**
 * Example usage of DocumentDiffEmitter service for undo/redo and collaborative editing
 */

import { DocumentModel } from '../models/document-model';
import { DocumentDiffEmitter, DiffOp } from './document-diff-emitter';

// Example: Basic Undo/Redo System
export class UndoRedoManager {
  private model: DocumentModel;
  private diffEmitter: DocumentDiffEmitter;
  private undoStack: DiffOp[][] = [];
  private redoStack: DiffOp[][] = [];
  private lastSnapshotVersion: number = 0;

  constructor(model: DocumentModel) {
    this.model = model;
    this.diffEmitter = new DocumentDiffEmitter();
    
    // Take initial snapshot
    this.diffEmitter.createSnapshot(model);
    this.lastSnapshotVersion = model.getVersion();
    
    // Listen for changes
    model.onChange(() => {
      this.captureChange();
    });
  }

  private captureChange(): void {
    const currentVersion = this.model.getVersion();
    
    // Get snapshots
    const prevSnapshot = this.diffEmitter.getSnapshot(this.lastSnapshotVersion);
    const currentSnapshot = this.diffEmitter.createSnapshot(this.model);
    
    if (prevSnapshot) {
      // Compute diff
      const diff = this.diffEmitter.diff(prevSnapshot, currentSnapshot);
      
      // Add to undo stack
      this.undoStack.push(diff.operations);
      
      // Clear redo stack on new change
      this.redoStack = [];
    }
    
    this.lastSnapshotVersion = currentVersion;
  }

  undo(): void {
    const operations = this.undoStack.pop();
    if (!operations) return;
    
    // Create inverse operations (simplified - real implementation would be more complex)
    const inverseOps = this.createInverseOperations(operations);
    
    // Apply inverse operations
    this.diffEmitter.applyOperations(this.model, inverseOps);
    
    // Add to redo stack
    this.redoStack.push(operations);
  }

  redo(): void {
    const operations = this.redoStack.pop();
    if (!operations) return;
    
    // Re-apply operations
    this.diffEmitter.applyOperations(this.model, operations);
    
    // Add back to undo stack
    this.undoStack.push(operations);
  }

  private createInverseOperations(operations: DiffOp[]): DiffOp[] {
    // Simplified inverse operation creation
    // Real implementation would handle all operation types
    return operations.reverse().map(op => {
      switch (op.type) {
        case 'insert-text':
          return {
            type: 'delete-text',
            offset: op.offset,
            length: op.text.length,
            deletedText: op.text,
            timestamp: Date.now()
          };
        case 'delete-text':
          return {
            type: 'insert-text',
            offset: op.offset,
            text: op.deletedText,
            timestamp: Date.now()
          };
        default:
          // Other operations would need proper inverse implementations
          return op;
      }
    });
  }
}

// Example: Collaborative Editing Change Propagation
export class CollaborativeEditor {
  private model: DocumentModel;
  private diffEmitter: DocumentDiffEmitter;
  private localVersion: number = 0;

  constructor(model: DocumentModel) {
    this.model = model;
    this.diffEmitter = new DocumentDiffEmitter();
    this.localVersion = model.getVersion();
  }

  // Get changes to send to other collaborators
  getLocalChanges(): DiffOp[] {
    const prevSnapshot = this.diffEmitter.getSnapshot(this.localVersion);
    const currentSnapshot = this.diffEmitter.createSnapshot(this.model);
    
    if (!prevSnapshot) return [];
    
    const diff = this.diffEmitter.diff(prevSnapshot, currentSnapshot);
    this.localVersion = currentSnapshot.version;
    
    return diff.operations;
  }

  // Apply changes from other collaborators
  applyRemoteChanges(operations: DiffOp[]): void {
    // In real implementation, would need operational transformation
    // to handle concurrent edits
    this.diffEmitter.applyOperations(this.model, operations);
  }
}

// Example usage
function demonstrateDiffEmitter() {
  const model = new DocumentModel();
  const undoRedo = new UndoRedoManager(model);
  
  // Make some edits
  model.insertText(0, 'Hello World');
  model.applyFormatting({
    start: 0,
    end: 5,
    type: 'bold',
    id: 'fmt-1'
  });
  
  // Undo last change
  undoRedo.undo();
  
  // Redo
  undoRedo.redo();
  
  // Collaborative editing
  const collab = new CollaborativeEditor(model);
  
  // Get changes to send
  const changes = collab.getLocalChanges();
  console.log('Changes to propagate:', changes);
}