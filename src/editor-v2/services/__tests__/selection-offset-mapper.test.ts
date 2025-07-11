/**
 * Tests for Selection-Offset Mapping Service
 * Covers all edge cases including collapsed selections, multi-block selections, and boundary conditions
 */

import { SelectionOffsetMapper } from '../selection-offset-mapper';
import { DocumentModel } from '../../models/document-model';
import { DocumentContent } from '../../data-structures/btree';

describe('SelectionOffsetMapper', () => {
  let document: DocumentModel;
  let mapper: SelectionOffsetMapper;
  let container: HTMLElement;
  
  beforeEach(() => {
    document = new DocumentModel();
    mapper = new SelectionOffsetMapper(document);
    container = document.createElement('div');
    container.setAttribute('contenteditable', 'true');
    document.body.appendChild(container);
  });
  
  afterEach(() => {
    document.body.removeChild(container);
  });
  
  /**
   * Helper to create DOM structure matching the editor
   */
  function createEditorDOM(blocks: DocumentContent[]): void {
    container.innerHTML = '';
    
    blocks.forEach(block => {
      const blockEl = document.createElement('div');
      blockEl.className = 'editor-block';
      blockEl.setAttribute('data-block-id', block.id);
      blockEl.textContent = block.text;
      container.appendChild(blockEl);
    });
    
    mapper.setContainer(container);
  }
  
  /**
   * Helper to get text node from block
   */
  function getTextNode(blockId: string): Text | null {
    const blockEl = container.querySelector(`[data-block-id="${blockId}"]`);
    if (!blockEl) return null;
    
    const walker = document.createTreeWalker(
      blockEl,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    return walker.nextNode() as Text;
  }
  
  describe('selectionToGlobalRange', () => {
    it('should handle collapsed selection', () => {
      // Setup document with single block
      document.insertText(0, 'Hello World');
      const blocks = document.getBlocks();
      createEditorDOM(blocks);
      
      const textNode = getTextNode(blocks[0].id);
      expect(textNode).not.toBeNull();
      
      // Collapsed selection at position 5
      const selection = {
        anchorNode: textNode!,
        anchorOffset: 5,
        focusNode: textNode!,
        focusOffset: 5
      };
      
      const range = mapper.selectionToGlobalRange(selection);
      expect(range).toEqual({ start: 5, end: 5 });
    });
    
    it('should handle forward selection within single block', () => {
      document.insertText(0, 'Hello World');
      const blocks = document.getBlocks();
      createEditorDOM(blocks);
      
      const textNode = getTextNode(blocks[0].id);
      
      // Select "World" (positions 6-11)
      const selection = {
        anchorNode: textNode!,
        anchorOffset: 6,
        focusNode: textNode!,
        focusOffset: 11
      };
      
      const range = mapper.selectionToGlobalRange(selection);
      expect(range).toEqual({ start: 6, end: 11 });
    });
    
    it('should handle backward selection within single block', () => {
      document.insertText(0, 'Hello World');
      const blocks = document.getBlocks();
      createEditorDOM(blocks);
      
      const textNode = getTextNode(blocks[0].id);
      
      // Backward selection of "Hello" (positions 5-0)
      const selection = {
        anchorNode: textNode!,
        anchorOffset: 5,
        focusNode: textNode!,
        focusOffset: 0
      };
      
      const range = mapper.selectionToGlobalRange(selection);
      expect(range).toEqual({ start: 0, end: 5 });
    });
    
    it('should handle multi-block selection', () => {
      // Create multiple blocks
      document.insertText(0, 'First block\n\nSecond block\n\nThird block');
      const blocks = document.getBlocks();
      createEditorDOM(blocks);
      
      const firstTextNode = getTextNode(blocks[0].id);
      const thirdTextNode = getTextNode(blocks[2].id);
      
      // Select from middle of first block to middle of third block
      const selection = {
        anchorNode: firstTextNode!,
        anchorOffset: 6, // After "First "
        focusNode: thirdTextNode!,
        focusOffset: 5  // After "Third"
      };
      
      const range = mapper.selectionToGlobalRange(selection);
      const expectedStart = 6;
      const expectedEnd = blocks[2].offset + 5;
      expect(range).toEqual({ start: expectedStart, end: expectedEnd });
    });
    
    it('should handle selection at block boundaries', () => {
      document.insertText(0, 'First\n\nSecond');
      const blocks = document.getBlocks();
      createEditorDOM(blocks);
      
      const firstTextNode = getTextNode(blocks[0].id);
      const secondTextNode = getTextNode(blocks[1].id);
      
      // Select from end of first block to start of second block
      const selection = {
        anchorNode: firstTextNode!,
        anchorOffset: 5, // End of "First"
        focusNode: secondTextNode!,
        focusOffset: 0   // Start of "Second"
      };
      
      const range = mapper.selectionToGlobalRange(selection);
      expect(range).toEqual({ 
        start: 5, 
        end: blocks[1].offset 
      });
    });
    
    it('should handle empty blocks', () => {
      document.insertText(0, 'Before\n\n\n\nAfter');
      const blocks = document.getBlocks();
      
      // Create DOM with empty blocks
      container.innerHTML = '';
      blocks.forEach(block => {
        const blockEl = document.createElement('div');
        blockEl.className = 'editor-block';
        blockEl.setAttribute('data-block-id', block.id);
        if (block.text) {
          blockEl.textContent = block.text;
        } else {
          // Empty block with BR
          blockEl.appendChild(document.createElement('br'));
        }
        container.appendChild(blockEl);
      });
      mapper.setContainer(container);
      
      // Select in empty block
      const emptyBlockEl = container.querySelector(`[data-block-id="${blocks[1].id}"]`);
      const selection = {
        anchorNode: emptyBlockEl!,
        anchorOffset: 0,
        focusNode: emptyBlockEl!,
        focusOffset: 0
      };
      
      const range = mapper.selectionToGlobalRange(selection);
      expect(range).toEqual({ 
        start: blocks[1].offset, 
        end: blocks[1].offset 
      });
    });
  });
  
  describe('globalRangeToSelection', () => {
    it('should convert collapsed range to DOM position', () => {
      document.insertText(0, 'Hello World');
      const blocks = document.getBlocks();
      createEditorDOM(blocks);
      
      const range = { start: 5, end: 5 };
      const selection = mapper.globalRangeToSelection(range);
      
      expect(selection).not.toBeNull();
      expect(selection!.anchorNode.nodeType).toBe(Node.TEXT_NODE);
      expect(selection!.anchorOffset).toBe(5);
      expect(selection!.focusNode).toBe(selection!.anchorNode);
      expect(selection!.focusOffset).toBe(5);
    });
    
    it('should convert range within single block', () => {
      document.insertText(0, 'Hello World');
      const blocks = document.getBlocks();
      createEditorDOM(blocks);
      
      const range = { start: 0, end: 5 };
      const selection = mapper.globalRangeToSelection(range);
      
      expect(selection).not.toBeNull();
      expect(selection!.anchorNode.textContent).toBe('Hello World');
      expect(selection!.anchorOffset).toBe(0);
      expect(selection!.focusOffset).toBe(5);
    });
    
    it('should convert multi-block range', () => {
      document.insertText(0, 'First\n\nSecond\n\nThird');
      const blocks = document.getBlocks();
      createEditorDOM(blocks);
      
      const range = { 
        start: 0, 
        end: blocks[2].offset + blocks[2].length 
      };
      const selection = mapper.globalRangeToSelection(range);
      
      expect(selection).not.toBeNull();
      expect(selection!.anchorNode.textContent).toBe('First');
      expect(selection!.anchorOffset).toBe(0);
      expect(selection!.focusNode.textContent).toBe('Third');
      expect(selection!.focusOffset).toBe(5);
    });
    
    it('should handle offset at block boundary', () => {
      document.insertText(0, 'First\n\nSecond');
      const blocks = document.getBlocks();
      createEditorDOM(blocks);
      
      // Range from end of first block to middle of second
      const range = { 
        start: blocks[0].offset + blocks[0].length,
        end: blocks[1].offset + 3
      };
      const selection = mapper.globalRangeToSelection(range);
      
      expect(selection).not.toBeNull();
      expect(selection!.anchorNode.textContent).toBe('First');
      expect(selection!.anchorOffset).toBe(5);
      expect(selection!.focusNode.textContent).toBe('Second');
      expect(selection!.focusOffset).toBe(3);
    });
  });
  
  describe('handleTripleClickSelection', () => {
    it('should select entire block on triple-click', () => {
      document.insertText(0, 'First block\n\nSecond block\n\nThird block');
      const blocks = document.getBlocks();
      createEditorDOM(blocks);
      
      const range = mapper.handleTripleClickSelection(blocks[1].id);
      
      expect(range).not.toBeNull();
      expect(range!.start).toBe(blocks[1].offset);
      expect(range!.end).toBe(blocks[1].offset + blocks[1].length);
    });
  });
  
  describe('handleShiftEndSelection', () => {
    it('should select to end of current block', () => {
      document.insertText(0, 'First line\n\nSecond line');
      const blocks = document.getBlocks();
      createEditorDOM(blocks);
      
      // Cursor in middle of first block
      const currentOffset = 5;
      const range = mapper.handleShiftEndSelection(currentOffset);
      
      expect(range).not.toBeNull();
      expect(range!.start).toBe(5);
      expect(range!.end).toBe(blocks[0].offset + blocks[0].length);
    });
  });
  
  describe('handleShiftHomeSelection', () => {
    it('should select to start of current block', () => {
      document.insertText(0, 'First line\n\nSecond line');
      const blocks = document.getBlocks();
      createEditorDOM(blocks);
      
      // Cursor in middle of second block
      const currentOffset = blocks[1].offset + 6;
      const range = mapper.handleShiftHomeSelection(currentOffset);
      
      expect(range).not.toBeNull();
      expect(range!.start).toBe(blocks[1].offset);
      expect(range!.end).toBe(currentOffset);
    });
  });
  
  describe('Edge cases', () => {
    it('should handle emojis and surrogate pairs', () => {
      // Emoji takes 2 code units
      document.insertText(0, 'Hello 👋 World');
      const blocks = document.getBlocks();
      createEditorDOM(blocks);
      
      const textNode = getTextNode(blocks[0].id);
      
      // Select after emoji (position 8 in code units)
      const selection = {
        anchorNode: textNode!,
        anchorOffset: 8,
        focusNode: textNode!,
        focusOffset: 13
      };
      
      const range = mapper.selectionToGlobalRange(selection);
      expect(range).toEqual({ start: 8, end: 13 });
      
      // Convert back
      const backSelection = mapper.globalRangeToSelection(range!);
      expect(backSelection).not.toBeNull();
      expect(backSelection!.anchorOffset).toBe(8);
      expect(backSelection!.focusOffset).toBe(13);
    });
    
    it('should handle formatted text spans', () => {
      document.insertText(0, 'Hello World');
      const blocks = document.getBlocks();
      
      // Create DOM with formatting
      container.innerHTML = '';
      const blockEl = document.createElement('div');
      blockEl.className = 'editor-block';
      blockEl.setAttribute('data-block-id', blocks[0].id);
      blockEl.innerHTML = 'Hello <span class="fmt-bold">World</span>';
      container.appendChild(blockEl);
      mapper.setContainer(container);
      
      // Get both text nodes
      const walker = document.createTreeWalker(
        blockEl,
        NodeFilter.SHOW_TEXT,
        null
      );
      const firstText = walker.nextNode() as Text;
      const secondText = walker.nextNode() as Text;
      
      // Selection across both text nodes
      const selection = {
        anchorNode: firstText,
        anchorOffset: 3,
        focusNode: secondText,
        focusOffset: 3
      };
      
      const range = mapper.selectionToGlobalRange(selection);
      expect(range).toEqual({ start: 3, end: 9 }); // "lo Wor"
    });
    
    it('should rebuild index when DOM changes', () => {
      document.insertText(0, 'Initial');
      const blocks = document.getBlocks();
      createEditorDOM(blocks);
      
      // Change DOM content
      const blockEl = container.querySelector(`[data-block-id="${blocks[0].id}"]`);
      blockEl!.textContent = 'Changed';
      
      // Update index
      mapper.updateIndex();
      
      const textNode = getTextNode(blocks[0].id);
      const selection = {
        anchorNode: textNode!,
        anchorOffset: 0,
        focusNode: textNode!,
        focusOffset: 7
      };
      
      const range = mapper.selectionToGlobalRange(selection);
      expect(range).not.toBeNull();
      // Note: This would work with the new DOM content
    });
  });
});