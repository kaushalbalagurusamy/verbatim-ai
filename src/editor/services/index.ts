/**
 * Export all services from the editor-v2 services directory
 */

export { InputHandlerService } from './input-handler';
export { DocumentDiffEmitter } from './document-diff-emitter';
export { UndoRedoManagerV2 as UndoRedoManager } from './undo-redo-manager-v2';
export { SelectionOffsetMapper } from './selection-offset-mapper';
export type { 
  InputHandlerConfig,
  EditorSelection
} from './input-handler';
export type { 
  DiffOperationType,
  DiffOperation,
  InsertTextOp,
  DeleteTextOp,
  ReplaceTextOp,
  AddFormattingOp,
  RemoveFormattingOp,
  CreateBlockOp,
  DeleteBlockOp,
  MergeBlocksOp,
  UpdateBlockTypeOp,
  DiffOp,
  DocumentSnapshot,
  DiffResult
} from './document-diff-emitter';
export type {
  UndoRedoConfig,
  HistoryEntry
} from './undo-redo-manager-v2';