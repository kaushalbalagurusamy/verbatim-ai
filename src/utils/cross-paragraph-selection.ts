/**
 * Cross-paragraph selection handler - Enables mouse selection across multiple blocks
 * Tracks mouse drag state and creates selections spanning multiple paragraphs
 */

interface DragState {
  isSelecting: boolean;
  startBlock: HTMLElement | null;
  startOffset: number;
  startContainer: Node | null;
}

let dragState: DragState = {
  isSelecting: false,
  startBlock: null,
  startOffset: 0,
  startContainer: null
};

/**
 * Start tracking a cross-paragraph selection
 */
export function startCrossParagraphSelection(
  e: MouseEvent,
  editorRef: React.RefObject<HTMLDivElement>
): void {
  if (!editorRef.current) return;
  
  const selection = window.getSelection();
  if (!selection) return;
  
  // Clear existing selection
  selection.removeAllRanges();
  
  // Find the block and position where selection started
  const target = e.target as Node;
  const block = findBlockFromNode(target);
  
  if (block) {
    const position = getPositionFromMouseEvent(e, block);
    if (position) {
      dragState = {
        isSelecting: true,
        startBlock: block,
        startContainer: position.container,
        startOffset: position.offset
      };
    }
  }
}

/**
 * Update selection during mouse drag
 */
export function updateCrossParagraphSelection(
  e: MouseEvent,
  editorRef: React.RefObject<HTMLDivElement>
): void {
  if (!dragState.isSelecting || !dragState.startContainer || !editorRef.current) return;
  
  const selection = window.getSelection();
  if (!selection) return;
  
  // Find current position
  const target = e.target as Node;
  const currentBlock = findBlockFromNode(target);
  
  if (currentBlock) {
    const position = getPositionFromMouseEvent(e, currentBlock);
    if (position) {
      const range = document.createRange();
      
      // Determine selection direction
      const startIndex = parseInt(dragState.startBlock?.dataset.blockIndex || '0');
      const currentIndex = parseInt(currentBlock.dataset.blockIndex || '0');
      
      if (startIndex === currentIndex) {
        // Same block selection
        const startOffset = dragState.startOffset;
        const currentOffset = position.offset;
        
        if (startOffset <= currentOffset) {
          range.setStart(dragState.startContainer, startOffset);
          range.setEnd(position.container, currentOffset);
        } else {
          range.setStart(position.container, currentOffset);
          range.setEnd(dragState.startContainer, startOffset);
        }
      } else if (startIndex < currentIndex) {
        // Forward selection
        range.setStart(dragState.startContainer, dragState.startOffset);
        range.setEnd(position.container, position.offset);
      } else {
        // Backward selection
        range.setStart(position.container, position.offset);
        range.setEnd(dragState.startContainer, dragState.startOffset);
      }
      
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
}

/**
 * End cross-paragraph selection
 */
export function endCrossParagraphSelection(): void {
  dragState = {
    isSelecting: false,
    startBlock: null,
    startOffset: 0,
    startContainer: null
  };
}

/**
 * Check if currently selecting
 */
export function isSelectingCrossParagraph(): boolean {
  return dragState.isSelecting;
}

/**
 * Find block element from a node
 */
function findBlockFromNode(node: Node): HTMLElement | null {
  let current: Node | null = node;
  
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current as HTMLElement;
      if (element.dataset.blockId) {
        return element;
      }
    }
    current = current.parentNode;
  }
  
  return null;
}

/**
 * Get text position from mouse event
 */
function getPositionFromMouseEvent(
  e: MouseEvent,
  block: HTMLElement
): { container: Node; offset: number } | null {
  const range = document.caretRangeFromPoint(e.clientX, e.clientY);
  if (!range) return null;
  
  // Ensure the range is within the block
  if (!block.contains(range.startContainer)) return null;
  
  return {
    container: range.startContainer,
    offset: range.startOffset
  };
}