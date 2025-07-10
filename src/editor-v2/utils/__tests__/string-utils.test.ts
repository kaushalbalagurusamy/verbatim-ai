/**
 * Comprehensive tests for UTF-16 aware string utilities
 * Tests cover emoji, surrogate pairs, and various Unicode characters
 */

import {
  codeUnitLength,
  codePointAt,
  codePointCount,
  indexFromCodePoint,
  sliceByCodeUnits,
  isSurrogatePair,
  getGraphemeAt,
  safeSubstring,
  findAllCodeUnitOffsets,
  offsetAfterInsert,
  offsetAfterDelete
} from '../string-utils';

describe('String Utils - UTF-16 Support', () => {
  // Test strings with various Unicode characters
  const testCases = {
    ascii: 'Hello World',
    emoji: '👨‍👩‍👧‍👦🎉😀', // Family emoji (ZWJ sequence), party popper, grinning face
    surrogatePair: '𝐀𝐁𝐂', // Mathematical bold capital letters
    mixed: 'Hello 👋 World 🌍!',
    zwjSequence: '👨‍💻', // Man technologist (ZWJ sequence)
    variationSelector: '☀️', // Sun with emoji presentation
    combining: 'é', // e with acute accent (could be single char or combining)
  };

  describe('codeUnitLength', () => {
    it('should return correct length for ASCII', () => {
      expect(codeUnitLength(testCases.ascii)).toBe(11);
    });

    it('should count surrogate pairs as 2 code units', () => {
      expect(codeUnitLength(testCases.surrogatePair)).toBe(6); // 3 chars × 2 units each
    });

    it('should count emoji correctly', () => {
      expect(codeUnitLength('👋')).toBe(2); // Single emoji
      expect(codeUnitLength(testCases.zwjSequence)).toBe(5); // 👨(2) + ZWJ(1) + 💻(2)
    });

    it('should handle family emoji sequence', () => {
      const family = '👨‍👩‍👧‍👦';
      // 👨(2) + ZWJ(1) + 👩(2) + ZWJ(1) + 👧(2) + ZWJ(1) + 👦(2) = 11
      expect(codeUnitLength(family)).toBe(11);
    });
  });

  describe('codePointAt', () => {
    it('should get correct code points for ASCII', () => {
      expect(codePointAt('ABC', 0)).toBe(65); // 'A'
      expect(codePointAt('ABC', 1)).toBe(66); // 'B'
      expect(codePointAt('ABC', 2)).toBe(67); // 'C'
    });

    it('should handle surrogate pairs correctly', () => {
      const str = '𝐀'; // U+1D400
      expect(codePointAt(str, 0)).toBe(0x1D400);
      expect(codePointAt(str, 1)).toBe(0xDC00); // Low surrogate
    });

    it('should return undefined for out of bounds', () => {
      expect(codePointAt('ABC', -1)).toBeUndefined();
      expect(codePointAt('ABC', 3)).toBeUndefined();
    });
  });

  describe('codePointCount', () => {
    it('should count ASCII characters correctly', () => {
      expect(codePointCount(testCases.ascii)).toBe(11);
    });

    it('should count surrogate pairs as single code points', () => {
      expect(codePointCount(testCases.surrogatePair)).toBe(3);
    });

    it('should count emoji sequences correctly', () => {
      expect(codePointCount('👋')).toBe(1);
      expect(codePointCount('👨‍👩‍👧‍👦')).toBe(7); // 4 emoji + 3 ZWJ
    });
  });

  describe('indexFromCodePoint', () => {
    it('should convert code point index to code unit index', () => {
      const str = 'A𝐀B';
      expect(indexFromCodePoint(str, 0)).toBe(0); // 'A'
      expect(indexFromCodePoint(str, 1)).toBe(1); // '𝐀'
      expect(indexFromCodePoint(str, 2)).toBe(3); // 'B' (after 2-unit char)
    });

    it('should handle out of bounds indices', () => {
      expect(indexFromCodePoint('ABC', -1)).toBe(0);
      expect(indexFromCodePoint('ABC', 10)).toBe(3);
    });
  });

  describe('isSurrogatePair', () => {
    it('should identify high surrogates', () => {
      const str = '𝐀';
      const result = isSurrogatePair(str, 0);
      expect(result.isHighSurrogate).toBe(true);
      expect(result.isLowSurrogate).toBe(false);
      expect(result.isCompletePair).toBe(true);
    });

    it('should identify low surrogates', () => {
      const str = '𝐀';
      const result = isSurrogatePair(str, 1);
      expect(result.isHighSurrogate).toBe(false);
      expect(result.isLowSurrogate).toBe(true);
      expect(result.isCompletePair).toBe(true);
    });

    it('should identify incomplete pairs', () => {
      // Create an invalid string with just a high surrogate
      const str = String.fromCharCode(0xD800);
      const result = isSurrogatePair(str, 0);
      expect(result.isHighSurrogate).toBe(true);
      expect(result.isCompletePair).toBe(false);
    });
  });

  describe('getGraphemeAt', () => {
    it('should get ASCII characters', () => {
      const result = getGraphemeAt('ABC', 1);
      expect(result).toEqual({ grapheme: 'B', length: 1 });
    });

    it('should get complete surrogate pairs', () => {
      const result = getGraphemeAt('𝐀', 0);
      expect(result).toEqual({ grapheme: '𝐀', length: 2 });
    });

    it('should handle low surrogate offset correctly', () => {
      const result = getGraphemeAt('𝐀', 1);
      expect(result).toEqual({ grapheme: '𝐀', length: 2 });
    });

    it('should get ZWJ sequences', () => {
      const str = '👨‍💻';
      const result = getGraphemeAt(str, 0);
      expect(result).toEqual({ grapheme: '👨‍💻', length: 5 });
    });

    it('should handle variation selectors', () => {
      const str = '☀️';
      const result = getGraphemeAt(str, 0);
      expect(result?.length).toBeGreaterThanOrEqual(2);
    });

    it('should return null for out of bounds', () => {
      expect(getGraphemeAt('ABC', -1)).toBeNull();
      expect(getGraphemeAt('ABC', 3)).toBeNull();
    });
  });

  describe('safeSubstring', () => {
    it('should handle ASCII normally', () => {
      expect(safeSubstring('ABCDEF', 1, 3)).toBe('BCD');
    });

    it('should not break surrogate pairs at start', () => {
      const str = 'A𝐀B';
      // Starting at low surrogate should adjust to high surrogate
      expect(safeSubstring(str, 2, 2)).toBe('𝐀');
    });

    it('should not break surrogate pairs at end', () => {
      const str = 'A𝐀B';
      // Ending in middle of surrogate pair should exclude it
      expect(safeSubstring(str, 0, 2)).toBe('A');
    });

    it('should handle edge cases', () => {
      expect(safeSubstring('ABC', -1, 2)).toBe('');
      expect(safeSubstring('ABC', 0, 0)).toBe('');
      expect(safeSubstring('ABC', 10, 2)).toBe('');
    });
  });

  describe('findAllCodeUnitOffsets', () => {
    it('should find all occurrences in ASCII', () => {
      expect(findAllCodeUnitOffsets('abcabcabc', 'abc')).toEqual([0, 3, 6]);
    });

    it('should find emoji correctly', () => {
      const str = 'Hello 👋 and 👋 again';
      expect(findAllCodeUnitOffsets(str, '👋')).toEqual([6, 13]);
    });

    it('should handle overlapping patterns', () => {
      expect(findAllCodeUnitOffsets('aaaa', 'aa')).toEqual([0, 2]);
    });

    it('should return empty array when not found', () => {
      expect(findAllCodeUnitOffsets('abc', 'xyz')).toEqual([]);
    });
  });

  describe('offsetAfterInsert', () => {
    it('should not affect offsets before insertion', () => {
      expect(offsetAfterInsert(5, 10, 3)).toBe(5);
    });

    it('should shift offsets after insertion', () => {
      expect(offsetAfterInsert(15, 10, 3)).toBe(18);
    });

    it('should handle insertion at offset', () => {
      expect(offsetAfterInsert(10, 10, 3)).toBe(10);
    });
  });

  describe('offsetAfterDelete', () => {
    it('should not affect offsets before deletion', () => {
      expect(offsetAfterDelete(5, 10, 15)).toBe(5);
    });

    it('should shift offsets after deletion', () => {
      expect(offsetAfterDelete(20, 10, 15)).toBe(15);
    });

    it('should collapse offsets within deletion range', () => {
      expect(offsetAfterDelete(12, 10, 15)).toBe(10);
    });
  });

  describe('Property tests', () => {
    it('should maintain totalLength === Σ(block.length)', () => {
      // Simulate document blocks
      const blocks = [
        { text: 'Hello 👋 ', length: 0 },
        { text: 'World 🌍', length: 0 },
        { text: '! 👨‍👩‍👧‍👦', length: 0 }
      ];

      // Calculate lengths using our utility
      blocks.forEach(block => {
        block.length = codeUnitLength(block.text);
      });

      const totalLength = blocks.reduce((sum, block) => sum + block.length, 0);
      const concatenated = blocks.map(b => b.text).join('');
      
      expect(totalLength).toBe(codeUnitLength(concatenated));
    });

    it('should handle insert/delete operations correctly', () => {
      let text = 'Hello 👋 World';
      const originalLength = codeUnitLength(text);
      
      // Insert emoji
      const insertPos = 6;
      const insertText = '🎉';
      text = text.slice(0, insertPos) + insertText + text.slice(insertPos);
      
      expect(codeUnitLength(text)).toBe(originalLength + codeUnitLength(insertText));
      
      // Delete part including emoji
      const deleteStart = 5;
      const deleteEnd = 10; // Includes both emojis
      text = text.slice(0, deleteStart) + text.slice(deleteEnd);
      
      expect(codeUnitLength(text)).toBe(
        originalLength + codeUnitLength(insertText) - (deleteEnd - deleteStart)
      );
    });
  });
});

describe('Edge Cases and Browser Compatibility', () => {
  it('should handle empty strings', () => {
    expect(codeUnitLength('')).toBe(0);
    expect(codePointCount('')).toBe(0);
    expect(getGraphemeAt('', 0)).toBeNull();
  });

  it('should handle invalid surrogate sequences gracefully', () => {
    // Lone high surrogate
    const invalidHigh = String.fromCharCode(0xD800);
    expect(codeUnitLength(invalidHigh)).toBe(1);
    expect(codePointCount(invalidHigh)).toBe(1);
    
    // Lone low surrogate
    const invalidLow = String.fromCharCode(0xDC00);
    expect(codeUnitLength(invalidLow)).toBe(1);
    expect(codePointCount(invalidLow)).toBe(1);
  });

  it('should handle very long strings efficiently', () => {
    const longString = '👋'.repeat(10000);
    expect(codeUnitLength(longString)).toBe(20000);
    expect(codePointCount(longString)).toBe(10000);
  });
});