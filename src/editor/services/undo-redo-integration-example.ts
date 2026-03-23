/**
 * Integration example showing how to use UndoRedoManager with the editor
 * Demonstrates keyboard shortcuts and UI integration
 */

import { DocumentModel } from '../models/document-model';
import { InputHandlerService } from './input-handler';
import { UndoRedoManager } from './undo-redo-manager';

// Example integration with an editor component
export class EditorWithUndoRedo {
  private document: DocumentModel;
  private inputHandler: InputHandlerService;
  private undoRedoManager: UndoRedoManager;
  private editorElement: HTMLElement;
  
  constructor(editorElement: HTMLElement) {
    this.editorElement = editorElement;
    this.document = new DocumentModel();
    
    // Initialize input handler with configuration
    this.inputHandler = new InputHandlerService(this.document, {
      getSelection: () => this.getEditorSelection(),
      setSelection: (start, end) => this.setEditorSelection(start, end),
      renderContent: () => this.renderContent(),
      onChange: (content) => this.handleContentChange(content)
    });
    
    // Get undo/redo manager from input handler
    this.undoRedoManager = this.inputHandler.getUndoRedoManager();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Set up UI controls
    this.setupUndoRedoUI();
  }
  
  private setupEventListeners(): void {
    // Handle keyboard shortcuts for undo/redo
    this.editorElement.addEventListener('keydown', (event) => {
      // Let input handler process undo/redo shortcuts
      if (this.inputHandler.handleKeyDown(event)) {
        event.preventDefault();
        return;
      }
      
      // Handle other keyboard events...
    });
    
    // Handle beforeinput events
    this.editorElement.addEventListener('beforeinput', (event) => {
      this.inputHandler.handleBeforeInput(event);
    });
    
    // Handle composition events
    this.editorElement.addEventListener('compositionstart', (event) => {
      this.inputHandler.handleCompositionStart(event);
    });
    
    this.editorElement.addEventListener('compositionupdate', (event) => {
      this.inputHandler.handleCompositionUpdate(event);
    });
    
    this.editorElement.addEventListener('compositionend', (event) => {
      this.inputHandler.handleCompositionEnd(event);
    });
  }
  
  private setupUndoRedoUI(): void {
    // Create undo/redo buttons
    const toolbar = document.createElement('div');
    toolbar.className = 'editor-toolbar';
    
    const undoButton = document.createElement('button');
    undoButton.textContent = 'Undo';
    undoButton.title = 'Undo (Ctrl/Cmd+Z)';
    undoButton.addEventListener('click', () => this.undo());
    
    const redoButton = document.createElement('button');
    redoButton.textContent = 'Redo';
    redoButton.title = 'Redo (Ctrl/Cmd+Shift+Z)';
    redoButton.addEventListener('click', () => this.redo());
    
    // Update button states
    const updateButtons = (canUndo: boolean, canRedo: boolean) => {
      undoButton.disabled = !canUndo;
      redoButton.disabled = !canRedo;
    };
    
    // Configure undo/redo manager to update UI
    this.undoRedoManager = new UndoRedoManager(this.document, {
      maxActions: 100,
      maxMemoryMB: 10,
      onChange: updateButtons
    });
    
    // Initial state
    updateButtons(false, false);
    
    toolbar.appendChild(undoButton);
    toolbar.appendChild(redoButton);
    this.editorElement.parentElement?.insertBefore(toolbar, this.editorElement);
  }
  
  private undo(): void {
    if (this.undoRedoManager.undo()) {
      this.renderContent();
    }
  }
  
  private redo(): void {
    if (this.undoRedoManager.redo()) {
      this.renderContent();
    }
  }
  
  private getEditorSelection(): any {
    // Implementation depends on your editor setup
    // This is a simplified example
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }
    
    const range = selection.getRangeAt(0);
    return {
      start: 0, // Calculate actual offset
      end: 0,   // Calculate actual offset
      isCollapsed: range.collapsed,
      text: range.toString()
    };
  }
  
  private setEditorSelection(start: number, end: number): void {
    // Implementation depends on your editor setup
    // This would update the actual DOM selection
  }
  
  private renderContent(): void {
    // Render document content to the editor
    const html = this.document.toHTML();
    this.editorElement.innerHTML = html;
  }
  
  private handleContentChange(content: string): void {
    // Handle content changes, emit events, etc.
    console.log('Content changed:', content.length, 'characters');
  }
}

// Example usage
export function createEditorWithUndoRedo(): void {
  const editorElement = document.getElementById('editor');
  if (!editorElement) {
    throw new Error('Editor element not found');
  }
  
  const editor = new EditorWithUndoRedo(editorElement);
  
  // Expose for debugging
  (window as any).editor = editor;
}

// Advanced usage with custom configuration
export function createAdvancedEditor(): void {
  const document = new DocumentModel();
  
  // Create undo/redo manager with custom limits
  const undoRedoManager = new UndoRedoManager(document, {
    maxActions: 50,      // Limit to 50 actions
    maxMemoryMB: 5,      // Limit to 5MB
    onChange: (canUndo, canRedo) => {
      // Update UI state
      console.log(`Undo: ${canUndo}, Redo: ${canRedo}`);
      
      // Update menu items
      const undoMenuItem = document.getElementById('menu-undo');
      const redoMenuItem = document.getElementById('menu-redo');
      
      if (undoMenuItem) {
        undoMenuItem.classList.toggle('disabled', !canUndo);
      }
      if (redoMenuItem) {
        redoMenuItem.classList.toggle('disabled', !canRedo);
      }
    }
  });
  
  // Example: Batch operations for undo
  function performBatchOperation(): void {
    // Multiple operations that should be undone as one
    document.insertText(0, 'Header\n');
    document.applyFormatting({
      type: 'bold',
      start: 0,
      end: 6,
      id: 'fmt-header'
    });
    document.createBlock(7, 'heading');
    
    // Record as single action
    undoRedoManager.recordActionImmediate();
  }
  
  // Example: Check memory usage
  function checkMemoryUsage(): void {
    const memoryMB = undoRedoManager.getMemoryUsage() / (1024 * 1024);
    console.log(`Undo history using ${memoryMB.toFixed(2)}MB`);
    console.log(`${undoRedoManager.getUndoCount()} undo actions available`);
    console.log(`${undoRedoManager.getRedoCount()} redo actions available`);
  }
  
  // Expose functions
  return {
    document,
    undoRedoManager,
    performBatchOperation,
    checkMemoryUsage
  };
}