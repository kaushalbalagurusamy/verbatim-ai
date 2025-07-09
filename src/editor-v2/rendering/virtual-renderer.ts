/**
 * Virtual Renderer - Efficient rendering system for large documents
 * Only renders visible content with configurable buffer zones
 * Handles incremental updates and smooth scrolling
 */

import { DocumentModel } from '../models/document-model';
import { LineRegistry, VisualLine } from '../models/line-registry';
import { TextFormatting } from '../data-structures/interval-tree';
import { DocumentContent } from '../data-structures/btree';

export interface RenderOptions {
  viewportTop: number;
  viewportHeight: number;
  bufferSize: number; // Lines to render above/below viewport
  lineHeight: number;
}

export interface RenderResult {
  html: string;
  visibleRange: {
    startLine: number;
    endLine: number;
    startOffset: number;
    endOffset: number;
  };
  totalHeight: number;
  blocks: RenderedBlock[];
}

export interface RenderedBlock {
  id: string;
  type: DocumentContent['type'];
  offsetY: number;
  height: number;
  html: string;
}

export class VirtualRenderer {
  private document: DocumentModel;
  private lineRegistry: LineRegistry;
  private renderCache: Map<string, RenderedBlock>;
  private lastRenderVersion: number;

  constructor(document: DocumentModel, lineRegistry: LineRegistry) {
    this.document = document;
    this.lineRegistry = lineRegistry;
    this.renderCache = new Map();
    this.lastRenderVersion = -1;
  }

  /**
   * Render visible content with virtual scrolling
   */
  render(options: RenderOptions): RenderResult {
    const { viewportTop, viewportHeight, bufferSize, lineHeight } = options;
    
    // Calculate visible range with buffer
    const startY = Math.max(0, viewportTop - bufferSize * lineHeight);
    const endY = viewportTop + viewportHeight + bufferSize * lineHeight;
    
    // Get visible lines
    const visibleLines = this.lineRegistry.getLinesInViewport(startY, endY);
    
    if (visibleLines.length === 0) {
      return {
        html: '',
        visibleRange: { startLine: 0, endLine: 0, startOffset: 0, endOffset: 0 },
        totalHeight: 0,
        blocks: []
      };
    }
    
    // Group lines by block
    const blockGroups = this.groupLinesByBlock(visibleLines);
    
    // Render blocks
    const renderedBlocks: RenderedBlock[] = [];
    let html = '';
    
    // Check if we need to invalidate cache
    const currentVersion = this.document.getVersion();
    if (currentVersion !== this.lastRenderVersion) {
      this.renderCache.clear();
      this.lastRenderVersion = currentVersion;
    }
    
    for (const [blockId, lines] of blockGroups) {
      const block = this.document.getBlocks().find(b => b.id === blockId);
      if (!block) continue;
      
      // Check cache
      const cacheKey = `${blockId}-${block.offset}-${block.length}`;
      let renderedBlock = this.renderCache.get(cacheKey);
      
      if (!renderedBlock) {
        // Render block
        renderedBlock = this.renderBlock(block, lines);
        this.renderCache.set(cacheKey, renderedBlock);
      }
      
      renderedBlocks.push(renderedBlock);
      html += this.wrapBlockHtml(renderedBlock);
    }
    
    // Create spacers for content above and below
    const topSpacer = startY > 0 ? `<div style="height: ${startY}px;"></div>` : '';
    const totalHeight = this.lineRegistry.getTotalHeight();
    const bottomHeight = totalHeight - endY;
    const bottomSpacer = bottomHeight > 0 ? `<div style="height: ${bottomHeight}px;"></div>` : '';
    
    return {
      html: topSpacer + html + bottomSpacer,
      visibleRange: {
        startLine: visibleLines[0].lineNumber,
        endLine: visibleLines[visibleLines.length - 1].lineNumber,
        startOffset: visibleLines[0].startOffset,
        endOffset: visibleLines[visibleLines.length - 1].endOffset
      },
      totalHeight,
      blocks: renderedBlocks
    };
  }

  /**
   * Group lines by their block ID
   */
  private groupLinesByBlock(lines: VisualLine[]): Map<string, VisualLine[]> {
    const groups = new Map<string, VisualLine[]>();
    
    for (const line of lines) {
      if (!groups.has(line.blockId)) {
        groups.set(line.blockId, []);
      }
      groups.get(line.blockId)!.push(line);
    }
    
    return groups;
  }

  /**
   * Render a single block
   */
  private renderBlock(block: DocumentContent, lines: VisualLine[]): RenderedBlock {
    // Get formatting for this block
    const formatting = this.document.getFormattingInRange(
      block.offset,
      block.offset + block.length
    );
    
    // Render text with formatting
    const html = this.renderFormattedText(block, formatting);
    
    // Calculate block position and height
    const offsetY = lines[0].y;
    const height = lines.reduce((sum, line) => sum + line.height, 0);
    
    return {
      id: block.id,
      type: block.type,
      offsetY,
      height,
      html
    };
  }

  /**
   * Render formatted text for a block
   */
  private renderFormattedText(block: DocumentContent, formatting: TextFormatting[]): string {
    if (formatting.length === 0) {
      return this.escapeHtml(block.text);
    }
    
    // Build formatting spans
    const spans = this.buildFormattingSpans(block, formatting);
    
    // Render spans to HTML
    let html = '';
    let lastOffset = 0;
    
    for (const span of spans) {
      // Add unformatted text before this span
      if (span.start > lastOffset) {
        html += this.escapeHtml(block.text.slice(lastOffset, span.start));
      }
      
      // Add formatted span
      const text = block.text.slice(span.start, span.end);
      html += this.wrapWithFormatting(text, span.formatting);
      
      lastOffset = span.end;
    }
    
    // Add remaining unformatted text
    if (lastOffset < block.text.length) {
      html += this.escapeHtml(block.text.slice(lastOffset));
    }
    
    return html;
  }

  /**
   * Build non-overlapping formatting spans
   */
  private buildFormattingSpans(
    block: DocumentContent, 
    formatting: TextFormatting[]
  ): Array<{ start: number; end: number; formatting: TextFormatting[] }> {
    // Convert to block-relative positions
    const blockFormatting = formatting.map(fmt => ({
      ...fmt,
      start: Math.max(0, fmt.start - block.offset),
      end: Math.min(block.text.length, fmt.end - block.offset)
    })).filter(fmt => fmt.start < fmt.end);
    
    // Find all unique positions
    const positions = new Set<number>([0, block.text.length]);
    for (const fmt of blockFormatting) {
      positions.add(fmt.start);
      positions.add(fmt.end);
    }
    
    const sortedPositions = Array.from(positions).sort((a, b) => a - b);
    
    // Build spans between positions
    const spans: Array<{ start: number; end: number; formatting: TextFormatting[] }> = [];
    
    for (let i = 0; i < sortedPositions.length - 1; i++) {
      const start = sortedPositions[i];
      const end = sortedPositions[i + 1];
      
      // Find all formatting that applies to this span
      const spanFormatting = blockFormatting.filter(
        fmt => fmt.start <= start && fmt.end >= end
      );
      
      if (spanFormatting.length > 0) {
        // Sort by priority: minimize > highlight > bold
        spanFormatting.sort((a, b) => {
          const priority = { minimize: 3, highlight: 2, bold: 1 };
          return priority[b.type] - priority[a.type];
        });
        
        spans.push({ start, end, formatting: spanFormatting });
      }
    }
    
    return spans;
  }

  /**
   * Wrap text with formatting spans
   */
  private wrapWithFormatting(text: string, formatting: TextFormatting[]): string {
    if (formatting.length === 0) {
      return this.escapeHtml(text);
    }
    
    let html = this.escapeHtml(text);
    
    // Apply formatting in reverse order (innermost first)
    for (let i = formatting.length - 1; i >= 0; i--) {
      const fmt = formatting[i];
      const classes = [`fmt-${fmt.type}`];
      
      if (fmt.type === 'highlight' && fmt.color) {
        classes.push(`fmt-highlight-${fmt.color}`);
      }
      
      html = `<span class="${classes.join(' ')}" data-fmt-id="${fmt.id}">${html}</span>`;
    }
    
    return html;
  }

  /**
   * Wrap block HTML with container
   */
  private wrapBlockHtml(block: RenderedBlock): string {
    const classes = ['editor-block', `editor-block-${block.type}`];
    
    return `<div 
      class="${classes.join(' ')}" 
      data-block-id="${block.id}"
      data-block-type="${block.type}"
      style="transform: translateY(${block.offsetY}px); height: ${block.height}px;"
    >${block.html}</div>`;
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Update render cache for specific blocks
   */
  invalidateBlocks(blockIds: string[]): void {
    for (const id of blockIds) {
      // Remove all cache entries for this block
      const keysToRemove: string[] = [];
      for (const key of this.renderCache.keys()) {
        if (key.startsWith(id)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => this.renderCache.delete(key));
    }
  }

  /**
   * Clear entire render cache
   */
  clearCache(): void {
    this.renderCache.clear();
  }

  /**
   * Get estimated memory usage
   */
  getCacheSize(): number {
    return this.renderCache.size;
  }
}

/**
 * Incremental update tracker
 */
export class IncrementalUpdater {
  private dirtyBlocks: Set<string>;
  private pendingUpdate: number | null;
  private updateCallback: () => void;

  constructor(updateCallback: () => void) {
    this.dirtyBlocks = new Set();
    this.pendingUpdate = null;
    this.updateCallback = updateCallback;
  }

  /**
   * Mark blocks as dirty
   */
  markDirty(blockIds: string[]): void {
    for (const id of blockIds) {
      this.dirtyBlocks.add(id);
    }
    
    this.scheduleUpdate();
  }

  /**
   * Schedule an update
   */
  private scheduleUpdate(): void {
    if (this.pendingUpdate !== null) return;
    
    this.pendingUpdate = requestAnimationFrame(() => {
      this.pendingUpdate = null;
      
      if (this.dirtyBlocks.size > 0) {
        this.updateCallback();
        this.dirtyBlocks.clear();
      }
    });
  }

  /**
   * Get dirty blocks
   */
  getDirtyBlocks(): string[] {
    return Array.from(this.dirtyBlocks);
  }

  /**
   * Cancel pending update
   */
  cancel(): void {
    if (this.pendingUpdate !== null) {
      cancelAnimationFrame(this.pendingUpdate);
      this.pendingUpdate = null;
    }
    this.dirtyBlocks.clear();
  }
}