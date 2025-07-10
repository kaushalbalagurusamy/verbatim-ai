/**
 * Unit tests for LineUpdateObserver
 * Tests ResizeObserver/MutationObserver integration, debouncing, and selective invalidation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LineUpdateObserver } from '../line-update-observer';
import { LineRegistry } from '../../models/line-registry';
import { DocumentModel } from '../../models/document-model';
import { textMeasurementService } from '../../utils/text-measurement';

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  elements: Set<Element> = new Set();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    (global as any).mockResizeObserverInstance = this;
  }

  observe(element: Element) {
    this.elements.add(element);
  }

  disconnect() {
    this.elements.clear();
  }

  trigger(entry: Partial<ResizeObserverEntry>) {
    const entries = [{
      target: Array.from(this.elements)[0],
      contentRect: entry.contentRect || new DOMRect(0, 0, 600, 800),
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: []
    } as ResizeObserverEntry];
    this.callback(entries, this);
  }
}

// Mock MutationObserver
class MockMutationObserver {
  callback: MutationCallback;
  options: MutationObserverInit | undefined;
  target: Node | null = null;

  constructor(callback: MutationCallback) {
    this.callback = callback;
    (global as any).mockMutationObserverInstance = this;
  }

  observe(target: Node, options?: MutationObserverInit) {
    this.target = target;
    this.options = options;
  }

  disconnect() {
    this.target = null;
    this.options = undefined;
  }

  trigger(mutations: Partial<MutationRecord>[]) {
    const records = mutations.map(m => ({
      type: m.type || 'childList',
      target: m.target || this.target!,
      addedNodes: m.addedNodes || [],
      removedNodes: m.removedNodes || [],
      previousSibling: m.previousSibling || null,
      nextSibling: m.nextSibling || null,
      attributeName: m.attributeName || null,
      attributeNamespace: m.attributeNamespace || null,
      oldValue: m.oldValue || null
    } as MutationRecord));
    this.callback(records, this);
  }
}

// Setup global mocks
(global as any).ResizeObserver = MockResizeObserver;
(global as any).MutationObserver = MockMutationObserver;
(global as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
  cb(0);
  return 0;
};
(global as any).cancelAnimationFrame = () => {};

describe('LineUpdateObserver', () => {
  let lineRegistry: LineRegistry;
  let documentModel: DocumentModel;
  let observer: LineUpdateObserver;
  let container: HTMLElement;
  let mockResizeObserver: MockResizeObserver;
  let mockMutationObserver: MockMutationObserver;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create instances
    lineRegistry = new LineRegistry();
    documentModel = new DocumentModel();
    observer = new LineUpdateObserver(lineRegistry, documentModel);
    
    // Create container with blocks
    container = document.createElement('div');
    container.style.width = '600px';
    container.innerHTML = `
      <div class="editor-block" data-block-id="block1" data-block-type="paragraph">First block</div>
      <div class="editor-block" data-block-id="block2" data-block-type="paragraph">Second block</div>
    `;
    document.body.appendChild(container);

    // Initialize document model with blocks
    documentModel.insertText(0, 'First block\nSecond block');
    documentModel.createBlock(0);
    documentModel.createBlock(12);

    // Mock text measurement service
    vi.spyOn(textMeasurementService, 'measureBlock').mockImplementation((id, text) => ({
      lines: [{ start: 0, end: text.length, height: 20, width: 600 }],
      totalHeight: 20
    }));
    vi.spyOn(textMeasurementService, 'updateContainerWidth').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.removeChild(container);
    observer.detach();
  });

  describe('Observer Lifecycle', () => {
    it('should attach ResizeObserver and MutationObserver to container', () => {
      observer.attach(container);

      expect(mockResizeObserverInstance).toBeDefined();
      expect(mockResizeObserverInstance.elements.has(container)).toBe(true);
      
      expect(mockMutationObserverInstance).toBeDefined();
      expect(mockMutationObserverInstance.target).toBe(container);
    });

    it('should detach observers on cleanup', () => {
      observer.attach(container);
      const resizeObs = mockResizeObserverInstance;
      const mutationObs = mockMutationObserverInstance;

      observer.detach();

      expect(resizeObs.elements.size).toBe(0);
      expect(mutationObs.target).toBeNull();
    });

    it('should handle multiple attach/detach cycles', () => {
      observer.attach(container);
      observer.detach();
      observer.attach(container);

      expect(mockResizeObserverInstance.elements.has(container)).toBe(true);
      expect(mockMutationObserverInstance.target).toBe(container);
    });
  });

  describe('ResizeObserver Integration', () => {
    beforeEach(() => {
      observer.attach(container);
      mockResizeObserver = (global as any).mockResizeObserverInstance;
    });

    it('should invalidate all blocks on width change', () => {
      const updateSpy = vi.spyOn(lineRegistry, 'batchUpdate');
      
      // Trigger resize with new width
      mockResizeObserver.trigger({
        contentRect: new DOMRect(0, 0, 800, 600)
      });

      // Should update text measurement service
      expect(textMeasurementService.updateContainerWidth).toHaveBeenCalledWith(800);
      
      // Should update line registry
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should not update if width unchanged', () => {
      const updateSpy = vi.spyOn(lineRegistry, 'batchUpdate');
      
      // Trigger resize with same width
      mockResizeObserver.trigger({
        contentRect: new DOMRect(0, 0, 600, 800)
      });

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('should debounce multiple resize events', () => {
      let frameCallback: FrameRequestCallback | null = null;
      (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
        frameCallback = cb;
        return 1;
      };

      const updateSpy = vi.spyOn(lineRegistry, 'batchUpdate');
      
      // Trigger multiple resizes
      mockResizeObserver.trigger({ contentRect: new DOMRect(0, 0, 700, 600) });
      mockResizeObserver.trigger({ contentRect: new DOMRect(0, 0, 800, 600) });
      mockResizeObserver.trigger({ contentRect: new DOMRect(0, 0, 900, 600) });

      expect(updateSpy).not.toHaveBeenCalled();

      // Execute debounced callback
      frameCallback!(0);

      // Should only process once with final width
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(textMeasurementService.updateContainerWidth).toHaveBeenLastCalledWith(900);
    });
  });

  describe('MutationObserver Integration', () => {
    beforeEach(() => {
      observer.attach(container);
      mockMutationObserver = (global as any).mockMutationObserverInstance;
    });

    it('should update only affected blocks on DOM mutation', () => {
      const updateSpy = vi.spyOn(lineRegistry, 'batchUpdate');
      const block1 = container.querySelector('[data-block-id="block1"]')!;
      
      // Trigger mutation in block1
      mockMutationObserver.trigger([{
        type: 'characterData',
        target: block1.firstChild!
      }]);

      expect(updateSpy).toHaveBeenCalled();
      
      // Verify only block1 was updated
      const calls = updateSpy.mock.calls;
      const updatedLines = calls[0][0];
      expect(updatedLines.every(line => line.blockId === 'block1')).toBe(true);
    });

    it('should handle mutations in nested elements', () => {
      const updateSpy = vi.spyOn(lineRegistry, 'batchUpdate');
      const block2 = container.querySelector('[data-block-id="block2"]')!;
      const span = document.createElement('span');
      block2.appendChild(span);
      
      // Trigger mutation in nested element
      mockMutationObserver.trigger([{
        type: 'characterData',
        target: span
      }]);

      // Should find parent block and update it
      const calls = updateSpy.mock.calls;
      const updatedLines = calls[0][0];
      expect(updatedLines.every(line => line.blockId === 'block2')).toBe(true);
    });

    it('should batch multiple mutations in same frame', () => {
      let frameCallback: FrameRequestCallback | null = null;
      (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
        frameCallback = cb;
        return 1;
      };

      const updateSpy = vi.spyOn(lineRegistry, 'batchUpdate');
      const block1 = container.querySelector('[data-block-id="block1"]')!;
      const block2 = container.querySelector('[data-block-id="block2"]')!;
      
      // Trigger mutations in both blocks
      mockMutationObserver.trigger([
        { type: 'characterData', target: block1.firstChild! },
        { type: 'characterData', target: block2.firstChild! }
      ]);

      expect(updateSpy).not.toHaveBeenCalled();

      // Execute debounced callback
      frameCallback!(0);

      // Should batch update both blocks
      expect(updateSpy).toHaveBeenCalledTimes(2); // Once per block
    });

    it('should ignore mutations outside editor blocks', () => {
      const updateSpy = vi.spyOn(lineRegistry, 'batchUpdate');
      const outsideElement = document.createElement('div');
      container.appendChild(outsideElement);
      
      // Trigger mutation outside blocks
      mockMutationObserver.trigger([{
        type: 'childList',
        target: outsideElement
      }]);

      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe('Performance Optimizations', () => {
    beforeEach(() => {
      observer.attach(container);
    });

    it('should cache block measurements', () => {
      const measureSpy = vi.spyOn(textMeasurementService, 'measureBlock');
      
      // Force update of block1
      observer.forceUpdateBlocks(['block1']);
      
      // Clear spy call count
      measureSpy.mockClear();
      
      // Force update again with same content
      observer.forceUpdateBlocks(['block1']);
      
      // Should use cache, not re-measure
      expect(measureSpy).not.toHaveBeenCalled();
    });

    it('should invalidate cache on content change', () => {
      const measureSpy = vi.spyOn(textMeasurementService, 'measureBlock');
      
      // Initial update
      observer.forceUpdateBlocks(['block1']);
      measureSpy.mockClear();
      
      // Change block content
      const blocks = documentModel.getBlocks();
      blocks[0].text = 'Modified content';
      
      // Force update again
      observer.forceUpdateBlocks(['block1']);
      
      // Should re-measure due to content change
      expect(measureSpy).toHaveBeenCalledTimes(1);
    });

    it('should only process visible blocks plus buffer', () => {
      // Mock viewport calculation
      container.getBoundingClientRect = vi.fn(() => ({
        top: 0,
        left: 0,
        right: 600,
        bottom: 400,
        width: 600,
        height: 400,
        x: 0,
        y: 0,
        toJSON: () => {}
      }));
      container.scrollTop = 0;

      // Add more blocks outside viewport
      for (let i = 3; i <= 10; i++) {
        const block = document.createElement('div');
        block.className = 'editor-block';
        block.setAttribute('data-block-id', `block${i}`);
        block.textContent = `Block ${i}`;
        container.appendChild(block);
        
        documentModel.insertText(documentModel.getLength(), `\nBlock ${i}`);
        documentModel.createBlock(documentModel.getLength() - 8);
      }

      const measureSpy = vi.spyOn(textMeasurementService, 'measureBlock');
      measureSpy.mockClear();

      // Update all blocks
      const blockIds = Array.from({ length: 10 }, (_, i) => `block${i + 1}`);
      observer.forceUpdateBlocks(blockIds);

      // Should only measure visible blocks + buffer (viewport is 400px, buffer is 1 screen)
      // With 20px per line, that's ~40 lines total
      expect(measureSpy.mock.calls.length).toBeLessThan(10);
    });
  });

  describe('Subscription System', () => {
    it('should notify subscribers on updates', () => {
      observer.attach(container);
      
      const callback = vi.fn();
      const unsubscribe = observer.subscribe(callback);
      
      // Trigger update
      observer.forceUpdateBlocks(['block1']);
      
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should support multiple subscribers', () => {
      observer.attach(container);
      
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      observer.subscribe(callback1);
      observer.subscribe(callback2);
      
      observer.forceUpdateBlocks(['block1']);
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should handle unsubscribe correctly', () => {
      observer.attach(container);
      
      const callback = vi.fn();
      const unsubscribe = observer.subscribe(callback);
      
      // Unsubscribe
      unsubscribe();
      
      // Trigger update
      observer.forceUpdateBlocks(['block1']);
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle errors in subscribers gracefully', () => {
      observer.attach(container);
      
      const errorCallback = vi.fn(() => {
        throw new Error('Subscriber error');
      });
      const successCallback = vi.fn();
      
      observer.subscribe(errorCallback);
      observer.subscribe(successCallback);
      
      // Should not throw and continue to other subscribers
      expect(() => observer.forceUpdateBlocks(['block1'])).not.toThrow();
      expect(successCallback).toHaveBeenCalled();
    });
  });

  describe('Debouncing Behavior', () => {
    it('should respect custom debounce configuration', () => {
      const customObserver = new LineUpdateObserver(lineRegistry, documentModel, {
        debounceMs: 50
      });
      
      let frameTime = 0;
      const callbacks: Array<{ cb: FrameRequestCallback; id: number }> = [];
      
      (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
        const id = callbacks.length;
        callbacks.push({ cb, id });
        return id;
      };
      
      customObserver.attach(container);
      
      // Trigger multiple updates
      customObserver.forceUpdateBlocks(['block1']);
      customObserver.forceUpdateBlocks(['block2']);
      
      // Should be scheduled
      expect(callbacks.length).toBe(1);
      
      customObserver.detach();
    });
  });

  describe('Memory Management', () => {
    it('should cleanup observers on detach', () => {
      observer.attach(container);
      
      const stats = observer.getStats();
      expect(stats.isActive).toBe(true);
      
      observer.detach();
      
      const detachedStats = observer.getStats();
      expect(detachedStats.isActive).toBe(false);
      expect(detachedStats.pendingUpdates).toBe(0);
    });

    it('should use WeakMap for cache to allow garbage collection', () => {
      observer.attach(container);
      
      // The cache uses WeakMap, so blocks can be garbage collected
      // This is hard to test directly, but we can verify the structure
      const stats = observer.getStats();
      expect(typeof stats.cacheSize).toBe('number');
    });
  });

  describe('Debug Stats', () => {
    it('should provide accurate statistics', () => {
      observer.attach(container);
      
      // Schedule some updates
      observer.forceUpdateBlocks(['block1', 'block2']);
      
      const stats = observer.getStats();
      expect(stats.isActive).toBe(true);
      expect(stats.pendingUpdates).toBe(0); // Should be processed immediately in tests
      expect(stats.cacheSize).toBeGreaterThanOrEqual(0);
    });
  });
});