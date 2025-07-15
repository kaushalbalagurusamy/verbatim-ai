# Change Tracking and History Management

## Why Track Changes?

Modern editors need to track document changes for several critical features:

1. **Undo/Redo**: Revert and reapply user actions
2. **Collaboration**: Share changes between users
3. **Autosave**: Store only incremental changes
4. **History**: Show document evolution over time
5. **Conflict Resolution**: Merge concurrent edits

## DocumentDiffEmitter Architecture

The DocumentDiffEmitter service provides comprehensive change tracking by:

### 1. Snapshot Management

Creates immutable snapshots of document state:

```typescript
interface DocumentSnapshot {
  version: number;      // Incrementing version number
  timestamp: number;    // When snapshot was created
  blocks: DocumentContent[];     // All blocks at this point
  formatting: TextFormatting[];  // All formatting at this point
  totalLength: number;  // Document length for validation
}
```

### 2. Diff Computation

Computes minimal diffs between any two snapshots:

```typescript
interface DiffOperation {
  type: 'insert-text' | 'delete-text' | 'add-formatting' | ...;
  offset: number;       // Where the change occurred
  timestamp: number;    // When it occurred
  // Operation-specific data
  text?: string;
  formatting?: TextFormatting;
  blockId?: string;
}
```

### 3. Operation Application

Applies diffs to recreate state transitions:

```typescript
// Apply diff to move from version 1 to version 2
const diff = computeDiff(snapshot1, snapshot2);
const result = applyDiff(snapshot1, diff.operations);
// result equals snapshot2
```

## How It Works

### Text Diffing Algorithm

For efficient text change detection:

1. **Common Prefix Detection**: Find unchanged start
2. **Common Suffix Detection**: Find unchanged end  
3. **Middle Diff**: Identify minimal change in between

```typescript
function computeTextDiff(oldText: string, newText: string) {
  // Find common prefix
  let prefixLen = 0;
  while (prefixLen < Math.min(oldText.length, newText.length) &&
         oldText[prefixLen] === newText[prefixLen]) {
    prefixLen++;
  }
  
  // Find common suffix
  let suffixLen = 0;
  while (suffixLen < Math.min(oldText.length - prefixLen, 
                              newText.length - prefixLen) &&
         oldText[oldText.length - 1 - suffixLen] === 
         newText[newText.length - 1 - suffixLen]) {
    suffixLen++;
  }
  
  // Extract the change
  const deleteStart = prefixLen;
  const deleteEnd = oldText.length - suffixLen;
  const insertText = newText.slice(prefixLen, newText.length - suffixLen);
  
  return { deleteStart, deleteEnd, insertText };
}
```

### Operation Optimization

Adjacent operations are automatically combined:

```typescript
// These operations:
{ type: 'insert-text', offset: 5, text: 'Hello' }
{ type: 'insert-text', offset: 10, text: ' World' }

// Become:
{ type: 'insert-text', offset: 5, text: 'Hello World' }
```

### Block Change Detection

Handles complex block operations:

1. **Block Creation**: When text creates new blocks
2. **Block Deletion**: When blocks are removed
3. **Block Merging**: When blocks combine
4. **Type Changes**: When block types change

## Supported Operations

### Text Operations
- `insert-text`: Add text at position
- `delete-text`: Remove text range
- `replace-text`: Replace text range

### Formatting Operations
- `add-formatting`: Apply format to range
- `remove-formatting`: Remove format from range
- `update-formatting`: Change format attributes

### Block Operations
- `create-block`: Add new block
- `delete-block`: Remove block
- `merge-blocks`: Combine two blocks
- `split-block`: Divide block at position
- `update-block-type`: Change block type

## Usage Examples

### Implementing Undo/Redo

```typescript
class UndoRedoManager {
  private diffEmitter: DocumentDiffEmitter;
  private currentVersion: number = 0;
  
  undo(): void {
    if (this.currentVersion > 0) {
      // Get diff to previous version
      const diff = this.diffEmitter.getDiff(
        this.currentVersion,
        this.currentVersion - 1
      );
      
      // Apply inverse operations
      const inverseDiff = this.invertDiff(diff);
      this.applyDiff(inverseDiff);
      
      this.currentVersion--;
    }
  }
  
  redo(): void {
    const maxVersion = this.diffEmitter.getLatestVersion();
    if (this.currentVersion < maxVersion) {
      // Get diff to next version
      const diff = this.diffEmitter.getDiff(
        this.currentVersion,
        this.currentVersion + 1
      );
      
      // Apply operations
      this.applyDiff(diff);
      
      this.currentVersion++;
    }
  }
}
```

### Collaborative Editing

```typescript
class CollaborativeEditor {
  private diffEmitter: DocumentDiffEmitter;
  
  onLocalChange(): void {
    // Get changes since last sync
    const diff = this.diffEmitter.getDiff(
      this.lastSyncVersion,
      this.diffEmitter.getLatestVersion()
    );
    
    // Send to other users
    this.broadcastChanges(diff.operations);
    
    this.lastSyncVersion = this.diffEmitter.getLatestVersion();
  }
  
  onRemoteChange(operations: DiffOperation[]): void {
    // Transform operations against local changes
    const transformed = this.transformOperations(operations);
    
    // Apply to document
    this.applyOperations(transformed);
  }
}
```

## Performance Characteristics

### Memory Usage
- **Snapshots**: O(n) where n is document size
- **Snapshot Limit**: Configurable max snapshots (default 100)
- **Old Snapshot Removal**: FIFO when limit reached

### Time Complexity
- **Snapshot Creation**: O(n) - requires deep copy
- **Text Diff**: O(n) - linear scan for common prefix/suffix
- **Operation Application**: O(m) where m is operation count
- **Optimization**: O(m) - single pass to combine operations

### Optimization Strategies

1. **Snapshot Intervals**: Don't snapshot every change
2. **Compression**: Store diffs instead of full snapshots
3. **Lazy Computation**: Compute diffs only when needed
4. **Batch Operations**: Group related changes

## Edge Cases Handled

### Block Creation on Append
When DocumentModel auto-creates blocks for appended text, the diff emitter correctly identifies this as an insert operation rather than a block creation.

### Empty Documents
Handles operations on empty documents without special cases.

### Unicode and Emoji
Full UTF-16 support including surrogate pairs - diffs are computed at code unit boundaries.

### Operation Ordering
Ensures operations are applied in correct order to maintain consistency.

## Future Enhancements

### Operational Transformation
For true collaborative editing, implement OT to handle concurrent edits:
- Transform operations against each other
- Maintain convergence across all clients
- Handle conflict resolution

### Compression
Reduce storage and bandwidth:
- Delta compression for snapshots
- Operation batching
- Binary diff format

### Persistence Layer
Store history permanently:
- Database integration
- Efficient storage format
- Fast history queries

### Advanced Features
- Branch and merge for drafts
- Blame/annotation tracking
- Semantic diff visualization