/**
 * Test setup for EditorV2 integration tests
 * Configures JSDOM environment and global mocks
 */

// Mock browser APIs
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

global.MutationObserver = class MutationObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  disconnect() {}
  takeRecords() { return []; }
};

// Mock getComputedStyle
global.getComputedStyle = (element) => {
  return {
    getPropertyValue: (prop) => {
      switch (prop) {
        case 'font-family': return 'monospace';
        case 'font-size': return '14px';
        case 'line-height': return '21px';
        case 'font-weight': return 'normal';
        default: return '';
      }
    }
  };
};

// Mock selection API
global.getSelection = () => {
  let range = null;
  return {
    rangeCount: range ? 1 : 0,
    getRangeAt: () => range,
    removeAllRanges: () => { range = null; },
    addRange: (r) => { range = r; },
    toString: () => range ? range.toString() : ''
  };
};

// Mock Range
global.Range = class Range {
  constructor() {
    this.startContainer = null;
    this.startOffset = 0;
    this.endContainer = null;
    this.endOffset = 0;
    this.collapsed = true;
  }
  
  setStart(node, offset) {
    this.startContainer = node;
    this.startOffset = offset;
  }
  
  setEnd(node, offset) {
    this.endContainer = node;
    this.endOffset = offset;
    this.collapsed = (this.startContainer === this.endContainer && 
                      this.startOffset === this.endOffset);
  }
  
  toString() {
    if (!this.startContainer || !this.endContainer) return '';
    if (this.startContainer === this.endContainer) {
      const text = this.startContainer.textContent || '';
      return text.substring(this.startOffset, this.endOffset);
    }
    return ''; // Simplified for testing
  }
};

// Mock canvas for text measurement
HTMLCanvasElement.prototype.getContext = function() {
  return {
    measureText: (text) => ({
      width: text.length * 8, // Approximate width
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 4
    }),
    font: '',
    fillText: () => {},
    fillRect: () => {}
  };
};

// Performance API
global.performance = {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {}
};