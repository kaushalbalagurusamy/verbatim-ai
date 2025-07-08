/**
 * Selection State Manager - Tracks multi-paragraph selection state
 * Maintains anchor point for extended selections
 */

interface SelectionState {
  anchorBlock: HTMLElement | null;
  anchorOffset: number;
  anchorContainer: Node | null;
  isExtending: boolean;
}

let selectionState: SelectionState = {
  anchorBlock: null,
  anchorOffset: 0,
  anchorContainer: null,
  isExtending: false
};

/**
 * Save the current anchor point for extended selections
 */
export function saveSelectionAnchor(
  block: HTMLElement,
  container: Node,
  offset: number
): void {
  selectionState = {
    anchorBlock: block,
    anchorContainer: container,
    anchorOffset: offset,
    isExtending: true
  };
}

/**
 * Get the saved selection anchor
 */
export function getSelectionAnchor(): SelectionState {
  return selectionState;
}

/**
 * Clear the selection anchor
 */
export function clearSelectionAnchor(): void {
  selectionState = {
    anchorBlock: null,
    anchorOffset: 0,
    anchorContainer: null,
    isExtending: false
  };
}

/**
 * Check if we're currently extending a selection
 */
export function isExtendingSelection(): boolean {
  return selectionState.isExtending;
}