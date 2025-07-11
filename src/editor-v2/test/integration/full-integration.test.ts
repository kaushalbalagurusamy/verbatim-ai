/**
 * Comprehensive Integration Test Suite for EditorV2
 * Tests the complete flow of all components working together
 * Covers: typing → model update → DOM update → toolbar state → undo/redo
 * Includes virtual scrolling, clipboard operations, selection mapping, and diff tracking
 */

import { DocumentModel } from '../../models/document-model';
import { LineRegistry } from '../../models/line-registry';
import { LineUpdateObserver } from '../../observers/line-update-observer';
import { InputHandlerService } from '../../services/input-handler';
import { DocumentDiffEmitter } from '../../services/document-diff-emitter';
import { UndoRedoManagerV2 } from '../../services/undo-redo-manager-v2';
import { SelectionOffsetMapper } from '../../services/selection-offset-mapper';
import { ToolbarStateService } from '../../services/toolbar-state-service';
import { DOMDecoratorService } from '../../services/dom-decorator';
import { VirtualRenderer } from '../../rendering/virtual-renderer';

describe('EditorV2 Full Integration Test Suite', () => {
  let container: HTMLDivElement;
  let editor: HTMLDivElement;
  let documentModel: DocumentModel;
  let lineRegistry: LineRegistry;
  let lineObserver: LineUpdateObserver;
  let inputHandler: InputHandlerService;
  let diffEmitter: DocumentDiffEmitter;
  let undoRedoManager: UndoRedoManagerV2;
  let selectionMapper: SelectionOffsetMapper;
  let toolbarState: ToolbarStateService;
  let domDecorator: DOMDecoratorService;
  let virtualRenderer: VirtualRenderer;

  beforeEach(() => {
    // Create DOM container
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    // Create editor element
    editor = document.createElement('div');
    editor.contentEditable = 'true';
    editor.className = 'editor-content';
    container.appendChild(editor);

    // Initialize all services
    documentModel = new DocumentModel();
    lineRegistry = new LineRegistry();
    lineObserver = new LineUpdateObserver(lineRegistry, documentModel);
    diffEmitter = new DocumentDiffEmitter(documentModel);
    undoRedoManager = new UndoRedoManagerV2();
    selectionMapper = new SelectionOffsetMapper();
    toolbarState = new ToolbarStateService(documentModel);
    domDecorator = new DOMDecoratorService();
    virtualRenderer = new VirtualRenderer({
      containerHeight: 600,
      lineHeight: 20,
      bufferSize: 10
    });

    // Initialize input handler with all integrations
    inputHandler = new InputHandlerService(documentModel, {
      getSelection: () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        
        const range = sel.getRangeAt(0);
        const mapped = selectionMapper.getDOMSelection(editor);
        
        return mapped ? {
          start: mapped.start,
          end: mapped.end,
          isCollapsed: range.collapsed,
          text: range.toString()
        } : null;
      },
      setSelection: (start: number, end: number) => {
        const domPosition = selectionMapper.getDocumentOffsets(editor, start, end);
        if (domPosition) {
          const range = document.createRange();
          range.setStart(domPosition.startNode, domPosition.startOffset);
          range.setEnd(domPosition.endNode, domPosition.endOffset);
          
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      },
      renderContent: () => renderEditorContent(),
      onChange: (text: string) => {
        // Track changes in undo/redo
        const changes = diffEmitter.getChanges();
        if (changes.length > 0) {
          undoRedoManager.pushChange({
            timestamp: Date.now(),
            changes: changes,
            selectionBefore: inputHandler.getLastSelection(),
            selectionAfter: inputHandler.getLastSelection()
          });
        }
      }
    });

    // Attach observer
    lineObserver.attach(editor);
  });

  afterEach(() => {
    lineObserver.detach();
    document.body.removeChild(container);
  });

  function renderEditorContent() {
    const blocks = documentModel.getBlocks();
    const visibleRange = virtualRenderer.getVisibleRange(blocks.length);
    
    // Apply formatting decorations
    const content = documentModel.getContent();
    domDecorator.applyFormatting(editor, content.formatting);
    
    // Update editor DOM
    editor.innerHTML = blocks
      .slice(visibleRange.start, visibleRange.end)
      .map(block => {
        const blockEl = document.createElement('div');
        blockEl.className = `editor-block editor-block-${block.type}`;
        blockEl.textContent = block.text || '\u200B'; // Zero-width space for empty blocks
        return blockEl.outerHTML;
      })
      .join('');
  }

  describe('Complete Flow Integration', () => {
    test('typing → model update → DOM update → toolbar state → undo/redo', async () => {
      // 1. Initial state verification
      expect(documentModel.getLength()).toBe(0);
      expect(toolbarState.getState().isBold).toBe(false);
      
      // 2. Type some text
      const text = 'Hello, World!';
      documentModel.insertText(0, text);
      renderEditorContent();
      
      // 3. Verify model update
      expect(documentModel.getText()).toBe(text);
      expect(documentModel.getLength()).toBe(text.length);
      
      // 4. Verify DOM update
      const blockEl = editor.querySelector('.editor-block');
      expect(blockEl?.textContent).toBe(text);
      
      // 5. Apply bold formatting
      documentModel.applyFormatting({
        type: 'bold',
        start: 0,
        end: 5,
        id: 'fmt-1'
      });
      
      // 6. Update toolbar state
      toolbarState.updateSelection({ start: 0, end: 5, isCollapsed: false });
      expect(toolbarState.getState().isBold).toBe(true);
      
      // 7. Verify diff tracking
      const changes = diffEmitter.getChanges();
      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0].type).toBe('insert-text');
      
      // 8. Test undo
      const undoOp = undoRedoManager.undo();
      expect(undoOp).toBeDefined();
      
      // 9. Test redo
      const redoOp = undoRedoManager.redo();
      expect(redoOp).toBeDefined();
    });
  });

  describe('Virtual Scrolling Integration', () => {
    test('virtual scrolling works with all features', () => {
      // Add many lines to trigger virtual scrolling
      const lines = Array(1000).fill(0).map((_, i) => `Line ${i + 1}`);
      lines.forEach((line, i) => {
        if (i > 0) documentModel.createBlock(documentModel.getLength());
        documentModel.insertText(documentModel.getLength(), line);
      });
      
      // Test visible range calculation
      const visibleRange = virtualRenderer.getVisibleRange(lines.length);
      expect(visibleRange.start).toBe(0);
      expect(visibleRange.end).toBeLessThan(lines.length);
      
      // Scroll down and verify range update
      virtualRenderer.updateViewport(500, 1100);
      const newRange = virtualRenderer.getVisibleRange(lines.length);
      expect(newRange.start).toBeGreaterThan(0);
      expect(newRange.end).toBeGreaterThan(visibleRange.end);
      
      // Verify line registry tracks visible lines
      lineRegistry.registerLine(25, { index: 25, height: 20, top: 500 });
      const visibleLines = lineRegistry.getVisibleLines(500, 1100);
      expect(visibleLines.length).toBeGreaterThan(0);
    });
  });

  describe('Clipboard Operations', () => {
    test('copy preserves formatting', () => {
      // Insert formatted text
      documentModel.insertText(0, 'Bold and highlighted text');
      documentModel.applyFormatting({
        type: 'bold',
        start: 0,
        end: 4,
        id: 'fmt-1'
      });
      documentModel.applyFormatting({
        type: 'highlight',
        start: 9,
        end: 20,
        id: 'fmt-2',
        color: 'yellow'
      });
      
      // Simulate copy (get formatted content)
      const content = documentModel.getContent();
      const copiedFormatting = content.formatting.filter(f => 
        f.start >= 0 && f.end <= 20
      );
      
      expect(copiedFormatting.length).toBe(2);
      expect(copiedFormatting[0].type).toBe('bold');
      expect(copiedFormatting[1].type).toBe('highlight');
    });
    
    test('paste preserves formatting', () => {
      // Prepare formatted content to paste
      const pasteData = {
        text: 'Pasted text',
        formatting: [
          { type: 'bold', start: 0, end: 6, id: 'paste-1' },
          { type: 'highlight', start: 7, end: 11, id: 'paste-2', color: 'blue' }
        ]
      };
      
      // Insert at position 0
      documentModel.insertText(0, pasteData.text);
      pasteData.formatting.forEach(fmt => {
        documentModel.applyFormatting(fmt);
      });
      
      // Verify formatting was applied
      const formatting = documentModel.getFormattingInRange(0, pasteData.text.length);
      expect(formatting.length).toBe(2);
      expect(formatting[0].type).toBe('bold');
      expect(formatting[1].color).toBe('blue');
    });
  });

  describe('Selection Mapping', () => {
    test('maps selection across all scenarios', () => {
      // Test 1: Simple text selection
      documentModel.insertText(0, 'Simple text');
      const simpleSelection = { start: 0, end: 6 };
      selectionMapper.updateMapping(editor, documentModel);
      const domPos = selectionMapper.getDocumentOffsets(editor, simpleSelection.start, simpleSelection.end);
      expect(domPos).toBeDefined();
      
      // Test 2: Multi-block selection
      documentModel.createBlock(11);
      documentModel.insertText(12, 'Second block');
      const multiBlockSelection = { start: 5, end: 18 };
      selectionMapper.updateMapping(editor, documentModel);
      const multiPos = selectionMapper.getDocumentOffsets(editor, multiBlockSelection.start, multiBlockSelection.end);
      expect(multiPos).toBeDefined();
      
      // Test 3: Selection with formatting
      documentModel.applyFormatting({
        type: 'bold',
        start: 0,
        end: 6,
        id: 'fmt-1'
      });
      const formattedSelection = { start: 2, end: 8 };
      selectionMapper.updateMapping(editor, documentModel);
      const formattedPos = selectionMapper.getDocumentOffsets(editor, formattedSelection.start, formattedSelection.end);
      expect(formattedPos).toBeDefined();
    });
  });

  describe('Diff Emitter Integration', () => {
    test('tracks all changes correctly', () => {
      let changeCount = 0;
      
      // Subscribe to changes
      diffEmitter.subscribe((changes) => {
        changeCount += changes.length;
      });
      
      // Test various operations
      documentModel.insertText(0, 'Initial text');
      expect(changeCount).toBeGreaterThan(0);
      
      const prevCount = changeCount;
      documentModel.deleteText(8, 4);
      expect(changeCount).toBeGreaterThan(prevCount);
      
      documentModel.applyFormatting({
        type: 'bold',
        start: 0,
        end: 7,
        id: 'fmt-1'
      });
      expect(changeCount).toBeGreaterThan(prevCount + 1);
      
      // Verify specific change types
      const allChanges = diffEmitter.getChanges();
      const changeTypes = new Set(allChanges.map(c => c.type));
      expect(changeTypes.has('insert-text')).toBe(true);
      expect(changeTypes.has('delete-text')).toBe(true);
      expect(changeTypes.has('add-formatting')).toBe(true);
    });
  });

  describe('Service Integration Conflicts', () => {
    test('all services integrate without conflicts', () => {
      // Test concurrent operations
      const operations = [
        () => documentModel.insertText(0, 'Test '),
        () => documentModel.applyFormatting({ type: 'bold', start: 0, end: 4, id: 'fmt-1' }),
        () => toolbarState.updateSelection({ start: 0, end: 4, isCollapsed: false }),
        () => diffEmitter.getChanges(),
        () => undoRedoManager.pushChange({
          timestamp: Date.now(),
          changes: diffEmitter.getChanges(),
          selectionBefore: null,
          selectionAfter: null
        }),
        () => lineRegistry.registerLine(0, { index: 0, height: 20, top: 0 }),
        () => selectionMapper.updateMapping(editor, documentModel)
      ];
      
      // Execute all operations - should not throw
      expect(() => {
        operations.forEach(op => op());
      }).not.toThrow();
      
      // Verify state consistency
      expect(documentModel.getText()).toBe('Test ');
      expect(toolbarState.getState().isBold).toBe(true);
      expect(undoRedoManager.canUndo()).toBe(true);
    });
  });
});