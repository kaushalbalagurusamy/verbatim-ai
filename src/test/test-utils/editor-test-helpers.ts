/**
 * Editor Test Helpers - Utilities for testing contentEditable interactions
 * Provides functions for setting up test scenarios and verifying behavior
 */

import { vi } from 'vitest';
import type { ContentBlock } from '@/types/document.types';

/**
 * Create mock content blocks for testing
 */
export function createMockContentBlocks(texts: string[]): ContentBlock[] {
  return texts.map((text, index) => ({
    id: `test-block-${index}`,
    type: 'paragraph' as const,
    content: text,
    formatting: []
  }));
}

/**
 * Setup a contentEditable element with initial content
 */
export function setupContentEditable(container: HTMLElement, content: string): HTMLDivElement {
  const editor = document.createElement('div');
  editor.contentEditable = 'true';
  editor.textContent = content;
  editor.setAttribute('role', 'textbox');
  editor.setAttribute('aria-multiline', 'true');
  container.appendChild(editor);
  return editor;
}

/**
 * Get text content from editor, preserving line breaks
 */
export function getEditorText(editor: HTMLElement): string {
  // Walk through all nodes and preserve structure
  const walker = document.createTreeWalker(
    editor,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          return NodeFilter.FILTER_ACCEPT;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          // Accept block elements that create line breaks
          if (['DIV', 'P', 'BR'].includes(element.tagName)) {
            return NodeFilter.FILTER_ACCEPT;
          }
        }
        return NodeFilter.FILTER_SKIP;
      }
    }
  );

  let text = '';
  let lastWasBlock = false;
  let node = walker.nextNode();
  
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
      lastWasBlock = false;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.tagName === 'BR') {
        text += '\n';
        lastWasBlock = true;
      } else if (['DIV', 'P'].includes(element.tagName) && !lastWasBlock && text.length > 0) {
        text += '\n';
        lastWasBlock = true;
      }
    }
    node = walker.nextNode();
  }
  
  return text;
}

/**
 * Set cursor position in editor
 * @param container - Can be the editor element or a block element
 * @param offset - Character offset within the container
 */
export function setCursorPosition(container: HTMLElement, offset: number): void {
  const selection = window.getSelection();
  if (!selection) return;
  
  // If this is a block element, find the editor container
  let editor = container;
  if (container.hasAttribute('data-block-id')) {
    editor = container.closest('.editor-content') || container;
  }
  
  const walker = document.createTreeWalker(
    editor,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let currentOffset = 0;
  let node = walker.nextNode();
  
  while (node) {
    const length = node.textContent?.length || 0;
    
    if (currentOffset + length >= offset) {
      const range = document.createRange();
      range.setStart(node, offset - currentOffset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    
    currentOffset += length;
    node = walker.nextNode();
  }
}

/**
 * Set text selection in editor
 */
export function setSelection(editor: HTMLElement, start: number, end: number): void {
  const selection = window.getSelection();
  if (!selection) return;
  
  const walker = document.createTreeWalker(
    editor,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let currentOffset = 0;
  let startNode: Node | null = null;
  let startOffset = 0;
  let endNode: Node | null = null;
  let endOffset = 0;
  
  let node = walker.nextNode();
  
  while (node) {
    const length = node.textContent?.length || 0;
    
    // Find start position
    if (!startNode && currentOffset + length >= start) {
      startNode = node;
      startOffset = start - currentOffset;
    }
    
    // Find end position
    if (!endNode && currentOffset + length >= end) {
      endNode = node;
      endOffset = end - currentOffset;
      break;
    }
    
    currentOffset += length;
    node = walker.nextNode();
  }
  
  if (startNode && endNode) {
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

/**
 * Get current selection info
 */
export function getSelectionInfo(): { start: number; end: number; text: string } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
    ? range.commonAncestorContainer.parentElement
    : range.commonAncestorContainer as HTMLElement;
  
  if (!container) return null;
  
  // Calculate offsets
  const start = getOffsetInContainer(container, range.startContainer, range.startOffset);
  const end = getOffsetInContainer(container, range.endContainer, range.endOffset);
  
  return {
    start,
    end,
    text: selection.toString()
  };
}

/**
 * Calculate offset within container
 */
function getOffsetInContainer(container: HTMLElement, node: Node, offset: number): number {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let currentOffset = 0;
  let currentNode = walker.nextNode();
  
  while (currentNode) {
    if (currentNode === node) {
      return currentOffset + offset;
    }
    currentOffset += currentNode.textContent?.length || 0;
    currentNode = walker.nextNode();
  }
  
  return currentOffset;
}

/**
 * Simulate typing text at current cursor position
 */
export function typeText(editor: HTMLElement, text: string): void {
  editor.focus();
  
  // Insert text at cursor
  document.execCommand('insertText', false, text);
  
  // Trigger input event
  const inputEvent = new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    data: text
  });
  editor.dispatchEvent(inputEvent);
}

/**
 * Check if element has formatting class
 */
export function hasFormattingClass(element: Element, formatType: string): boolean {
  return element.classList.contains(`fmt-${formatType}`) ||
    !!element.querySelector(`.fmt-${formatType}`);
}

/**
 * Get all formatted spans in editor
 */
export function getFormattedSpans(editor: HTMLElement, formatType?: string): HTMLElement[] {
  const selector = formatType ? `.fmt-${formatType}` : '[class*="fmt-"]';
  return Array.from(editor.querySelectorAll(selector));
}

/**
 * Wait for DOM updates
 */
export function waitForDOMUpdate(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

/**
 * Create a mock document for testing
 */
export function createMockDocument(title: string = 'Test Document') {
  return {
    id: 'test-doc-1',
    title,
    content: {
      blocks: [],
      version: 1
    },
    version: 1,
    isModified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}