/**
 * Selection-Offset Mapping Service - Provides bidirectional mapping between DOM selections and document offsets
 * Builds a reverse index from TextNode to {blockId, localOffset} for efficient lookup
 * Handles all edge cases including collapsed selections, multi-block selections, and selections at block boundaries
 */

import { DocumentModel } from '../models/document-model';
import { codeUnitLength, sliceByCodeUnits } from '../utils/string-utils';

export interface NodeMapping {
  node: Node;
  blockId: string;
  localOffset: number;
  globalOffset: number;
  length: number;
}

export interface GlobalRange {
  start: number;
  end: number;
}

export interface SelectionInfo {
  anchorNode: Node;
  anchorOffset: number;
  focusNode: Node;
  focusOffset: number;
}

export class SelectionOffsetMapper {
  private document: DocumentModel;
  private container: HTMLElement | null;
  private nodeMap: Map<Node, NodeMapping>;
  private blockMap: Map<string, Node[]>;
  
  constructor(document: DocumentModel) {
    this.document = document;
    this.container = null;
    this.nodeMap = new Map();
    this.blockMap = new Map();
  }
  
  /**
   * Initialize with editor container
   */
  setContainer(container: HTMLElement): void {
    this.container = container;
    this.buildNodeIndex();
  }
  
  /**
   * Build reverse index from TextNodes to block information
   */
  private buildNodeIndex(): void {
    if (!this.container) return;
    
    this.nodeMap.clear();
    this.blockMap.clear();
    
    const blocks = this.container.querySelectorAll('[data-block-id]');
    
    blocks.forEach(blockEl => {
      const blockId = blockEl.getAttribute('data-block-id');
      if (!blockId) return;
      
      const blockNodes: Node[] = [];
      const walker = document.createTreeWalker(
        blockEl,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let localOffset = 0;
      let node = walker.nextNode();
      
      while (node) {
        const text = node.textContent || '';
        const length = codeUnitLength(text);
        
        // Get global offset for this block
        const block = this.document.getBlocks().find(b => b.id === blockId);
        if (!block) {
          node = walker.nextNode();
          continue;
        }
        
        const mapping: NodeMapping = {
          node,
          blockId,
          localOffset,
          globalOffset: block.offset + localOffset,
          length
        };
        
        this.nodeMap.set(node, mapping);
        blockNodes.push(node);
        
        localOffset += length;
        node = walker.nextNode();
      }
      
      this.blockMap.set(blockId, blockNodes);
    });
  }
  
  /**
   * Convert DOM selection to global document range
   */
  selectionToGlobalRange(selection: Selection | SelectionInfo): GlobalRange | null {
    if (!this.container) return null;
    
    // Handle both native Selection and custom SelectionInfo
    const anchorNode = 'anchorNode' in selection ? selection.anchorNode : selection.anchorNode;
    const anchorOffset = 'anchorOffset' in selection ? selection.anchorOffset : selection.anchorOffset;
    const focusNode = 'focusNode' in selection ? selection.focusNode : selection.focusNode;
    const focusOffset = 'focusOffset' in selection ? selection.focusOffset : selection.focusOffset;
    
    if (!anchorNode || !focusNode) return null;
    
    const anchorGlobal = this.domPositionToGlobalOffset(anchorNode, anchorOffset);
    const focusGlobal = this.domPositionToGlobalOffset(focusNode, focusOffset);
    
    if (anchorGlobal === null || focusGlobal === null) return null;
    
    return {
      start: Math.min(anchorGlobal, focusGlobal),
      end: Math.max(anchorGlobal, focusGlobal)
    };
  }
  
  /**
   * Convert global document range to DOM selection
   */
  globalRangeToSelection(range: GlobalRange): SelectionInfo | null {
    if (!this.container) return null;
    
    const startPos = this.globalOffsetToDomPosition(range.start);
    const endPos = this.globalOffsetToDomPosition(range.end);
    
    if (!startPos || !endPos) return null;
    
    return {
      anchorNode: startPos.node,
      anchorOffset: startPos.offset,
      focusNode: endPos.node,
      focusOffset: endPos.offset
    };
  }
  
  /**
   * Convert DOM position to global offset
   */
  private domPositionToGlobalOffset(node: Node, offset: number): number | null {
    // Handle text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      const mapping = this.nodeMap.get(node);
      if (!mapping) {
        // Try to rebuild index in case DOM changed
        this.buildNodeIndex();
        const retryMapping = this.nodeMap.get(node);
        if (!retryMapping) return null;
        return retryMapping.globalOffset + offset;
      }
      return mapping.globalOffset + offset;
    }
    
    // Handle element nodes - find the text node at the given child offset
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      
      // Special case for empty blocks
      if (element.childNodes.length === 0) {
        const blockId = element.getAttribute('data-block-id');
        if (blockId) {
          const block = this.document.getBlocks().find(b => b.id === blockId);
          return block ? block.offset : null;
        }
      }
      
      // Find the child node at the given offset
      let textNodeIndex = 0;
      let currentNode: Node | null = null;
      
      for (let i = 0; i < element.childNodes.length && textNodeIndex <= offset; i++) {
        const child = element.childNodes[i];
        if (child.nodeType === Node.TEXT_NODE) {
          if (textNodeIndex === offset) {
            // Selection is at the start of this text node
            return this.domPositionToGlobalOffset(child, 0);
          }
          currentNode = child;
          textNodeIndex++;
        } else {
          // For element nodes, find all text nodes within
          const textNodes = this.getTextNodesInElement(child as Element);
          if (textNodeIndex + textNodes.length >= offset) {
            // Selection is within this element
            const relativeOffset = offset - textNodeIndex;
            if (relativeOffset < textNodes.length) {
              return this.domPositionToGlobalOffset(textNodes[relativeOffset], 0);
            }
          }
          textNodeIndex += textNodes.length;
        }
      }
      
      // If offset is at the end, return end of last text node
      if (currentNode) {
        const text = currentNode.textContent || '';
        return this.domPositionToGlobalOffset(currentNode, codeUnitLength(text));
      }
    }
    
    return null;
  }
  
  /**
   * Convert global offset to DOM position
   */
  private globalOffsetToDomPosition(globalOffset: number): { node: Node; offset: number } | null {
    if (!this.container) return null;
    
    // Find the block containing this offset
    const blocks = this.document.getBlocks();
    let targetBlock = null;
    
    for (const block of blocks) {
      if (globalOffset >= block.offset && globalOffset <= block.offset + block.length) {
        targetBlock = block;
        break;
      }
    }
    
    if (!targetBlock) return null;
    
    // Find nodes in this block
    const blockNodes = this.blockMap.get(targetBlock.id);
    if (!blockNodes || blockNodes.length === 0) {
      // Empty block - return block element
      const blockEl = this.container.querySelector(`[data-block-id="${targetBlock.id}"]`);
      return blockEl ? { node: blockEl, offset: 0 } : null;
    }
    
    // Find the text node containing this offset
    const localOffset = globalOffset - targetBlock.offset;
    let currentOffset = 0;
    
    for (const node of blockNodes) {
      const mapping = this.nodeMap.get(node);
      if (!mapping) continue;
      
      if (currentOffset + mapping.length >= localOffset) {
        // This node contains our offset
        return {
          node,
          offset: localOffset - currentOffset
        };
      }
      
      currentOffset += mapping.length;
    }
    
    // If we're at the end of the block, return end of last node
    const lastNode = blockNodes[blockNodes.length - 1];
    const lastMapping = this.nodeMap.get(lastNode);
    
    return lastMapping ? { node: lastNode, offset: lastMapping.length } : null;
  }
  
  /**
   * Get all text nodes within an element
   */
  private getTextNodesInElement(element: Element): Node[] {
    const textNodes: Node[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node = walker.nextNode();
    while (node) {
      textNodes.push(node);
      node = walker.nextNode();
    }
    
    return textNodes;
  }
  
  /**
   * Update index after DOM changes
   */
  updateIndex(): void {
    this.buildNodeIndex();
  }
  
  /**
   * Get node mapping for a text node
   */
  getNodeMapping(node: Node): NodeMapping | null {
    return this.nodeMap.get(node) || null;
  }
  
  /**
   * Handle triple-click selection (select entire block)
   */
  handleTripleClickSelection(blockId: string): GlobalRange | null {
    const block = this.document.getBlocks().find(b => b.id === blockId);
    if (!block) return null;
    
    return {
      start: block.offset,
      end: block.offset + block.length
    };
  }
  
  /**
   * Handle Shift+End selection (select to end of line)
   */
  handleShiftEndSelection(currentOffset: number): GlobalRange | null {
    const blocks = this.document.getBlocks();
    
    // Find current block
    const currentBlock = blocks.find(b => 
      currentOffset >= b.offset && currentOffset < b.offset + b.length
    );
    
    if (!currentBlock) return null;
    
    // For single-line blocks, select to end of block
    // For multi-line blocks, this would need line information
    return {
      start: currentOffset,
      end: currentBlock.offset + currentBlock.length
    };
  }
  
  /**
   * Handle Shift+Home selection (select to start of line)
   */
  handleShiftHomeSelection(currentOffset: number): GlobalRange | null {
    const blocks = this.document.getBlocks();
    
    // Find current block
    const currentBlock = blocks.find(b => 
      currentOffset >= b.offset && currentOffset <= b.offset + b.length
    );
    
    if (!currentBlock) return null;
    
    // For single-line blocks, select to start of block
    // For multi-line blocks, this would need line information
    return {
      start: currentBlock.offset,
      end: currentOffset
    };
  }
  
  /**
   * Debug: Print current node index
   */
  debugPrintIndex(): void {
    console.log('=== Selection Offset Mapper Index ===');
    console.log('Node mappings:', this.nodeMap.size);
    
    this.nodeMap.forEach((mapping, node) => {
      const text = node.textContent || '';
      console.log(`Node: "${text.substring(0, 20)}..."`, {
        blockId: mapping.blockId,
        localOffset: mapping.localOffset,
        globalOffset: mapping.globalOffset,
        length: mapping.length
      });
    });
    
    console.log('\nBlock mappings:', this.blockMap.size);
    this.blockMap.forEach((nodes, blockId) => {
      console.log(`Block ${blockId}: ${nodes.length} text nodes`);
    });
  }
}