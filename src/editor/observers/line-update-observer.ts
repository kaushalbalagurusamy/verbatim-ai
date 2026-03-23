/**
 * Line Update Observer - Event-driven line registry updates using ResizeObserver and MutationObserver
 * Replaces polling-based updates with efficient, reactive observer pattern
 * Handles container resizing and DOM mutations with performance optimizations
 */

import { LineRegistry, VisualLine } from '../models/line-registry';
import { DocumentModel } from '../models/document-model';
import { textMeasurementService } from '../utils/text-measurement';
import { DocumentContent } from '../data-structures/btree';

export interface ObserverConfig {
  debounceMs?: number;
  viewportBuffer?: number; // Extra screens to process beyond viewport
}

interface BlockMeasurement {
  blockId: string;
  text: string;
  type: string;
  width: number;
  timestamp: number;
}

export class LineUpdateObserver {
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private lineRegistry: LineRegistry;
  private documentModel: DocumentModel;
  private container: HTMLElement | null = null;
  private measurementCache: WeakMap<DocumentContent, BlockMeasurement> = new WeakMap();
  private pendingUpdates: Set<string> = new Set(); // Block IDs pending update
  private updateFrame: number | null = null;
  private config: Required<ObserverConfig>;
  private lastContainerWidth: number = 0;
  private updateCallbacks: Set<() => void> = new Set();

  constructor(
    lineRegistry: LineRegistry,
    documentModel: DocumentModel,
    config: ObserverConfig = {}
  ) {
    this.lineRegistry = lineRegistry;
    this.documentModel = documentModel;
    this.config = {
      debounceMs: config.debounceMs ?? 16, // Default to one frame
      viewportBuffer: config.viewportBuffer ?? 1
    };
  }

  /**
   * Attach observers to container element
   */
  attach(container: HTMLElement): void {
    if (this.container) {
      this.detach();
    }

    this.container = container;
    this.lastContainerWidth = container.clientWidth;

    // Setup ResizeObserver
    this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
    this.resizeObserver.observe(container);

    // Setup MutationObserver
    this.mutationObserver = new MutationObserver(this.handleMutations.bind(this));
    this.mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: true
    });

    // Initial measurement
    this.updateAllLines();
  }

  /**
   * Detach observers and cleanup
   */
  detach(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.updateFrame) {
      cancelAnimationFrame(this.updateFrame);
      this.updateFrame = null;
    }

    this.container = null;
    this.pendingUpdates.clear();
    this.updateCallbacks.clear();
  }

  /**
   * Subscribe to line updates
   */
  subscribe(callback: () => void): () => void {
    this.updateCallbacks.add(callback);
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  /**
   * Handle container resize
   */
  private handleResize(entries: ResizeObserverEntry[]): void {
    for (const entry of entries) {
      const width = entry.contentRect.width;
      
      if (width !== this.lastContainerWidth) {
        this.lastContainerWidth = width;
        
        // Invalidate all cached measurements for old width
        this.measurementCache = new WeakMap();
        
        // Update text measurement service
        textMeasurementService.updateContainerWidth(width);
        
        // Mark all blocks as dirty
        const blocks = this.documentModel.getBlocks();
        blocks.forEach(block => this.pendingUpdates.add(block.id));
        
        this.scheduleUpdate();
      }
    }
  }

  /**
   * Handle DOM mutations
   */
  private handleMutations(mutations: MutationRecord[]): void {
    const dirtyBlocks = new Set<string>();

    for (const mutation of mutations) {
      // Find the block that contains this mutation
      const blockElement = this.findBlockElement(mutation.target);
      if (blockElement) {
        const blockId = blockElement.getAttribute('data-block-id');
        if (blockId) {
          dirtyBlocks.add(blockId);
        }
      }
    }

    // Mark dirty blocks for update
    dirtyBlocks.forEach(blockId => this.pendingUpdates.add(blockId));
    
    if (dirtyBlocks.size > 0) {
      this.scheduleUpdate();
    }
  }

  /**
   * Find the block element containing a node
   */
  private findBlockElement(node: Node): HTMLElement | null {
    let current: Node | null = node;
    
    while (current && current !== this.container) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        const element = current as HTMLElement;
        if (element.classList.contains('editor-block')) {
          return element;
        }
      }
      current = current.parentNode;
    }
    
    return null;
  }

  /**
   * Schedule debounced update
   */
  private scheduleUpdate(): void {
    if (this.updateFrame) {
      cancelAnimationFrame(this.updateFrame);
    }

    this.updateFrame = requestAnimationFrame(() => {
      this.updateFrame = null;
      this.processPendingUpdates();
    });
  }

  /**
   * Process pending block updates
   */
  private processPendingUpdates(): void {
    if (!this.container) return;

    const blocks = this.documentModel.getBlocks();
    const visibleBlocks = this.getVisibleBlocks(blocks);
    const updatedBlocks: string[] = [];

    // Process only visible blocks + buffer
    for (const block of visibleBlocks) {
      if (this.pendingUpdates.has(block.id) || !this.isCacheValid(block)) {
        this.updateBlockLines(block);
        updatedBlocks.push(block.id);
        this.pendingUpdates.delete(block.id);
      }
    }

    // Clear processed updates
    this.pendingUpdates.clear();

    // Notify subscribers if any blocks were updated
    if (updatedBlocks.length > 0) {
      this.notifySubscribers();
    }
  }

  /**
   * Get blocks within viewport + buffer
   */
  private getVisibleBlocks(blocks: DocumentContent[]): DocumentContent[] {
    if (!this.container) return blocks;

    const containerRect = this.container.getBoundingClientRect();
    const scrollTop = this.container.scrollTop;
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerRect.height;
    const bufferSize = containerRect.height * this.config.viewportBuffer;

    const expandedTop = viewportTop - bufferSize;
    const expandedBottom = viewportBottom + bufferSize;

    // Get lines in expanded viewport
    const visibleLines = this.lineRegistry.getLinesInViewport(expandedTop, expandedBottom);
    const visibleBlockIds = new Set(visibleLines.map(line => line.blockId));

    return blocks.filter(block => visibleBlockIds.has(block.id));
  }

  /**
   * Check if cached measurement is valid
   */
  private isCacheValid(block: DocumentContent): boolean {
    const cached = this.measurementCache.get(block);
    if (!cached) return false;

    return (
      cached.blockId === block.id &&
      cached.text === block.text &&
      cached.type === block.type &&
      cached.width === this.lastContainerWidth &&
      Date.now() - cached.timestamp < 60000 // Cache for 1 minute
    );
  }

  /**
   * Update lines for a specific block
   */
  private updateBlockLines(block: DocumentContent): void {
    if (!this.container) return;

    // Measure block
    const measurement = textMeasurementService.measureBlock(
      block.id,
      block.text,
      block.type,
      this.lastContainerWidth
    );

    // Cache measurement
    this.measurementCache.set(block, {
      blockId: block.id,
      text: block.text,
      type: block.type,
      width: this.lastContainerWidth,
      timestamp: Date.now()
    });

    // Get block element for Y position
    const blockElement = this.container.querySelector(`[data-block-id="${block.id}"]`);
    if (!blockElement) return;

    const blockRect = blockElement.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    const blockY = blockRect.top - containerRect.top + this.container.scrollTop;

    // Update line registry with new visual lines
    const lines: VisualLine[] = [];
    let currentY = blockY;
    let lineNumber = this.calculateStartingLineNumber(block);

    measurement.lines.forEach((measuredLine, index) => {
      const line: VisualLine = {
        lineNumber: lineNumber++,
        startOffset: block.offset + measuredLine.start,
        endOffset: block.offset + measuredLine.end,
        y: currentY,
        height: measuredLine.height,
        blockId: block.id,
        indexInBlock: index
      };

      lines.push(line);
      currentY += measuredLine.height;
    });

    // Batch update lines for this block
    this.lineRegistry.batchUpdate(lines);
  }

  /**
   * Calculate starting line number for a block
   */
  private calculateStartingLineNumber(block: DocumentContent): number {
    const blocks = this.documentModel.getBlocks();
    let lineNumber = 1;

    for (const b of blocks) {
      if (b.id === block.id) break;

      // Count lines in previous blocks
      const cached = this.measurementCache.get(b);
      if (cached) {
        const measurement = textMeasurementService.measureBlock(
          b.id,
          b.text,
          b.type,
          this.lastContainerWidth
        );
        lineNumber += measurement.lines.length;
      } else {
        // Estimate based on text length if not cached
        lineNumber += Math.max(1, Math.ceil(b.text.length / 80));
      }
    }

    return lineNumber;
  }

  /**
   * Update all lines (initial load or full refresh)
   */
  private updateAllLines(): void {
    const blocks = this.documentModel.getBlocks();
    blocks.forEach(block => this.pendingUpdates.add(block.id));
    this.scheduleUpdate();
  }

  /**
   * Notify all subscribers of updates
   */
  private notifySubscribers(): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in line update callback:', error);
      }
    });
  }

  /**
   * Force update specific blocks
   */
  forceUpdateBlocks(blockIds: string[]): void {
    blockIds.forEach(id => this.pendingUpdates.add(id));
    this.scheduleUpdate();
  }

  /**
   * Get observer statistics for debugging
   */
  getStats(): {
    pendingUpdates: number;
    cacheSize: number;
    isActive: boolean;
  } {
    return {
      pendingUpdates: this.pendingUpdates.size,
      cacheSize: this.documentModel.getBlocks().filter(b => 
        this.measurementCache.has(b)
      ).length,
      isActive: this.resizeObserver !== null && this.mutationObserver !== null
    };
  }
}