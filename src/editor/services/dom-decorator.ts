/**
 * DOM Decorator Service - Manages formatting spans and visual presentation
 * Wraps formatted text with appropriate <span> elements and handles span recycling
 * Supports nested formatting, iOS plaintext-only mode, and HTML paste normalization
 */

import { TextFormatting } from '../data-structures/interval-tree';
import { DocumentModel } from '../models/document-model';
import { DocumentContent } from '../data-structures/btree';
import { sliceByCodeUnits } from '../utils/string-utils';

export interface FormattingSpan {
  element: HTMLSpanElement;
  formatting: TextFormatting;
  inUse: boolean;
}

export interface DecoratorOptions {
  useShadowDOM?: boolean; // For iOS plaintext-only mode
  container: HTMLElement;
}

export class DOMDecoratorService {
  private spanPool: Map<string, FormattingSpan> = new Map();
  private shadowRoot: ShadowRoot | null = null;
  private container: HTMLElement;
  private documentModel: DocumentModel;
  private recycledSpans: HTMLSpanElement[] = [];

  constructor(documentModel: DocumentModel, options: DecoratorOptions) {
    this.documentModel = documentModel;
    this.container = options.container;

    if (options.useShadowDOM && this.container.attachShadow) {
      this.shadowRoot = this.container.attachShadow({ mode: 'open' });
      this.injectStyles();
    }
  }

  /**
   * Decorate a block with formatting spans
   */
  decorateBlock(block: DocumentContent, blockElement: HTMLElement): void {
    const formatting = this.documentModel.getFormattingInRange(
      block.offset,
      block.offset + block.length
    );

    if (formatting.length === 0) {
      blockElement.textContent = block.text;
      return;
    }

    // Clear existing content
    blockElement.innerHTML = '';

    // Sort formatting by start position and priority
    const sorted = this.sortFormatting(formatting);
    
    // Build formatted content
    const fragments = this.buildFormattedFragments(block, sorted);
    
    // Append fragments to block
    fragments.forEach(fragment => blockElement.appendChild(fragment));
  }

  /**
   * Build formatted fragments for a block
   */
  private buildFormattedFragments(block: DocumentContent, formatting: TextFormatting[]): DocumentFragment[] {
    const fragments: DocumentFragment[] = [];
    const fragment = document.createDocumentFragment();
    
    let lastOffset = block.offset;
    const openFormats: TextFormatting[] = [];

    // Process each character position
    for (let pos = block.offset; pos <= block.offset + block.length; pos++) {
      // Check for formats ending at this position
      const ending = openFormats.filter(f => f.end === pos);
      const continuing = openFormats.filter(f => f.end > pos);
      
      // Check for formats starting at this position
      const starting = formatting.filter(f => f.start === pos && f.end > pos);
      
      // If we have changes, output text up to this point
      if ((ending.length > 0 || starting.length > 0) && pos > lastOffset) {
        const text = sliceByCodeUnits(block.text, lastOffset - block.offset, pos - block.offset);
        
        if (openFormats.length === 0) {
          fragment.appendChild(document.createTextNode(text));
        } else {
          const span = this.createNestedSpan(text, openFormats);
          fragment.appendChild(span);
        }
        
        lastOffset = pos;
      }
      
      // Update open formats
      ending.forEach(f => {
        const index = openFormats.indexOf(f);
        if (index !== -1) openFormats.splice(index, 1);
      });
      
      starting.forEach(f => openFormats.push(f));
    }
    
    // Handle remaining text
    if (lastOffset < block.offset + block.length) {
      const text = sliceByCodeUnits(block.text, lastOffset - block.offset);
      
      if (openFormats.length === 0) {
        fragment.appendChild(document.createTextNode(text));
      } else {
        const span = this.createNestedSpan(text, openFormats);
        fragment.appendChild(span);
      }
    }
    
    fragments.push(fragment);
    return fragments;
  }

  /**
   * Create nested span for multiple formatting
   */
  private createNestedSpan(text: string, formats: TextFormatting[]): HTMLSpanElement {
    // Sort by priority (minimize > highlight > bold)
    const sorted = formats.sort((a, b) => {
      const priority = { minimize: 3, highlight: 2, bold: 1 };
      return priority[b.type] - priority[a.type];
    });
    
    let current: HTMLSpanElement | null = null;
    let innermost: HTMLSpanElement | null = null;
    
    // Create nested spans
    for (const format of sorted) {
      const span = this.getOrCreateSpan(format);
      
      if (!current) {
        current = span;
        innermost = span;
      } else {
        innermost!.appendChild(span);
        innermost = span;
      }
    }
    
    // Add text to innermost span
    if (innermost) {
      innermost.textContent = text;
    }
    
    return current!;
  }

  /**
   * Get or create a span for formatting
   */
  private getOrCreateSpan(formatting: TextFormatting): HTMLSpanElement {
    // Try to get from pool
    const pooled = this.spanPool.get(formatting.id);
    if (pooled && !pooled.inUse) {
      pooled.inUse = true;
      pooled.element.textContent = '';
      return pooled.element;
    }
    
    // Try to get recycled span
    const recycled = this.recycledSpans.pop();
    const span = recycled || document.createElement('span');
    
    // Apply formatting classes
    span.className = this.getFormattingClasses(formatting);
    span.setAttribute('data-fmt-id', formatting.id);
    
    // Add to pool
    this.spanPool.set(formatting.id, {
      element: span,
      formatting,
      inUse: true
    });
    
    return span;
  }

  /**
   * Get CSS classes for formatting
   */
  private getFormattingClasses(formatting: TextFormatting): string {
    const classes = [`fmt-${formatting.type}`];
    
    if (formatting.type === 'highlight' && formatting.color) {
      classes.push(`fmt-highlight-${formatting.color}`);
    }
    
    return classes.join(' ');
  }

  /**
   * Sort formatting by start position and priority
   */
  private sortFormatting(formatting: TextFormatting[]): TextFormatting[] {
    return formatting.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      // Priority: minimize > highlight > bold
      const priority = { minimize: 3, highlight: 2, bold: 1 };
      return priority[b.type] - priority[a.type];
    });
  }

  /**
   * Release unused spans back to pool
   */
  releaseUnusedSpans(): void {
    for (const [id, span] of this.spanPool) {
      if (span.inUse) {
        span.inUse = false;
      } else {
        // Move to recycled pool
        span.element.textContent = '';
        span.element.className = '';
        this.recycledSpans.push(span.element);
        this.spanPool.delete(id);
      }
    }
    
    // Limit recycled pool size
    if (this.recycledSpans.length > 100) {
      this.recycledSpans = this.recycledSpans.slice(0, 100);
    }
  }

  /**
   * Normalize HTML for paste operations
   */
  normalizeHTML(html: string): { text: string; formatting: TextFormatting[] } {
    const div = document.createElement('div');
    div.innerHTML = html;
    
    const text: string[] = [];
    const formatting: TextFormatting[] = [];
    let offset = 0;
    
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const content = node.textContent || '';
        text.push(content);
        offset += content.length;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as HTMLElement;
        const tagName = elem.tagName.toLowerCase();
        
        const startOffset = offset;
        
        // Process children first
        for (const child of Array.from(node.childNodes)) {
          walk(child);
        }
        
        const endOffset = offset;
        
        // Apply formatting based on tag
        if (startOffset < endOffset) {
          if (tagName === 'b' || tagName === 'strong' || 
              (tagName === 'span' && elem.style.fontWeight === 'bold')) {
            formatting.push({
              type: 'bold',
              start: startOffset,
              end: endOffset,
              id: `fmt-paste-${Date.now()}-${Math.random()}`
            });
          } else if (tagName === 'i' || tagName === 'em' || 
                     (tagName === 'span' && elem.style.fontStyle === 'italic')) {
            // Currently only supporting bold, but structure allows for italic
          } else if (tagName === 'mark' || 
                     (tagName === 'span' && elem.style.backgroundColor)) {
            const bgColor = elem.style.backgroundColor;
            let color: TextFormatting['color'] = 'yellow';
            
            if (bgColor.includes('blue')) color = 'blue';
            else if (bgColor.includes('green')) color = 'green';
            else if (bgColor.includes('pink')) color = 'pink';
            
            formatting.push({
              type: 'highlight',
              color,
              start: startOffset,
              end: endOffset,
              id: `fmt-paste-${Date.now()}-${Math.random()}`
            });
          }
        }
      }
    };
    
    walk(div);
    
    return {
      text: text.join(''),
      formatting
    };
  }

  /**
   * Inject styles for shadow DOM mode
   */
  private injectStyles(): void {
    if (!this.shadowRoot) return;
    
    const style = document.createElement('style');
    style.textContent = `
      .fmt-bold {
        font-weight: 600;
      }
      
      .fmt-highlight {
        padding: 0 2px;
        border-radius: 2px;
      }
      
      .fmt-highlight-yellow {
        background-color: rgba(255, 235, 59, 0.3);
      }
      
      .fmt-highlight-blue {
        background-color: rgba(33, 150, 243, 0.3);
      }
      
      .fmt-highlight-green {
        background-color: rgba(76, 175, 80, 0.3);
      }
      
      .fmt-highlight-pink {
        background-color: rgba(233, 30, 99, 0.3);
      }
      
      .fmt-minimize {
        opacity: 0.4;
        font-size: 0.9em;
      }
    `;
    
    this.shadowRoot.appendChild(style);
  }

  /**
   * Get shadow root if using shadow DOM
   */
  getShadowRoot(): ShadowRoot | null {
    return this.shadowRoot;
  }

  /**
   * Clear all spans and reset pools
   */
  clear(): void {
    this.spanPool.clear();
    this.recycledSpans = [];
  }
}