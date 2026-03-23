/**
 * UTF-16 aware string utilities for handling multi-code-unit characters
 * Ensures proper handling of emojis, surrogate pairs, and other Unicode characters
 * All offset calculations use UTF-16 code units to match JavaScript's internal representation
 */

/**
 * Get the number of UTF-16 code units in a string
 * This is equivalent to string.length but makes the intent explicit
 * @param text - The input string
 * @returns Number of UTF-16 code units
 */
export function codeUnitLength(text: string): number {
  return text.length;
}

/**
 * Get the Unicode code point at a given UTF-16 code unit offset
 * Handles surrogate pairs correctly
 * @param text - The input string
 * @param offset - UTF-16 code unit offset
 * @returns Unicode code point or undefined if offset is out of bounds
 */
export function codePointAt(text: string, offset: number): number | undefined {
  if (offset < 0 || offset >= text.length) {
    return undefined;
  }
  
  // Use the built-in codePointAt which handles surrogate pairs
  return text.codePointAt(offset);
}

/**
 * Count the number of Unicode code points in a string
 * This differs from string.length for strings containing surrogate pairs
 * @param text - The input string
 * @returns Number of Unicode code points
 */
export function codePointCount(text: string): number {
  // Use iterator to properly count code points
  return Array.from(text).length;
}

/**
 * Convert a code point index to a UTF-16 code unit index
 * @param text - The input string
 * @param codePointIndex - Index in terms of code points
 * @returns UTF-16 code unit index
 */
export function indexFromCodePoint(text: string, codePointIndex: number): number {
  if (codePointIndex < 0) return 0;
  
  let codeUnitIndex = 0;
  let currentCodePoint = 0;
  
  // Iterate through the string by code points
  for (const char of text) {
    if (currentCodePoint === codePointIndex) {
      return codeUnitIndex;
    }
    codeUnitIndex += char.length; // char.length is 1 or 2 for surrogate pairs
    currentCodePoint++;
  }
  
  // If codePointIndex is beyond the string, return the length
  return text.length;
}

/**
 * Slice a string by UTF-16 code unit indices
 * This is equivalent to string.slice but makes the intent explicit
 * @param text - The input string
 * @param start - Start offset in UTF-16 code units
 * @param end - Optional end offset in UTF-16 code units
 * @returns Sliced string
 */
export function sliceByCodeUnits(text: string, start: number, end?: number): string {
  return text.slice(start, end);
}

/**
 * Check if a character at the given offset is part of a surrogate pair
 * @param text - The input string
 * @param offset - UTF-16 code unit offset
 * @returns Object indicating if it's a high surrogate, low surrogate, or neither
 */
export function isSurrogatePair(text: string, offset: number): {
  isHighSurrogate: boolean;
  isLowSurrogate: boolean;
  isCompletePair: boolean;
} {
  if (offset < 0 || offset >= text.length) {
    return { isHighSurrogate: false, isLowSurrogate: false, isCompletePair: false };
  }
  
  const charCode = text.charCodeAt(offset);
  const isHighSurrogate = charCode >= 0xD800 && charCode <= 0xDBFF;
  const isLowSurrogate = charCode >= 0xDC00 && charCode <= 0xDFFF;
  
  // Check if this forms a complete pair
  let isCompletePair = false;
  if (isHighSurrogate && offset + 1 < text.length) {
    const nextCharCode = text.charCodeAt(offset + 1);
    isCompletePair = nextCharCode >= 0xDC00 && nextCharCode <= 0xDFFF;
  } else if (isLowSurrogate && offset > 0) {
    const prevCharCode = text.charCodeAt(offset - 1);
    isCompletePair = prevCharCode >= 0xD800 && prevCharCode <= 0xDBFF;
  }
  
  return { isHighSurrogate, isLowSurrogate, isCompletePair };
}

/**
 * Get the grapheme cluster (user-perceived character) at a given offset
 * This handles emoji sequences, combining characters, etc.
 * @param text - The input string
 * @param offset - UTF-16 code unit offset
 * @returns Object with the grapheme and its code unit length
 */
export function getGraphemeAt(text: string, offset: number): {
  grapheme: string;
  length: number;
} | null {
  if (offset < 0 || offset >= text.length) {
    return null;
  }
  
  // Check if we're in the middle of a surrogate pair
  const surrogateInfo = isSurrogatePair(text, offset);
  let adjustedOffset = offset;
  if (surrogateInfo.isLowSurrogate && offset > 0) {
    // Move to the start of the surrogate pair
    adjustedOffset--;
  }
  
  // Simple implementation for now - can be enhanced with Intl.Segmenter when available
  // This handles basic cases including surrogate pairs
  let length = 1;
  
  const adjustedSurrogateInfo = isSurrogatePair(text, adjustedOffset);
  if (adjustedSurrogateInfo.isHighSurrogate && adjustedSurrogateInfo.isCompletePair) {
    length = 2; // Surrogate pair
  }
  
  // Check for common emoji sequences (simplified)
  // Zero-width joiner sequences (e.g., family emojis)
  if (adjustedOffset + length < text.length && text.charCodeAt(adjustedOffset + length) === 0x200D) {
    // Look for the rest of the sequence
    let seqLength = length + 1; // Include ZWJ
    while (seqLength < text.length - adjustedOffset) {
      const nextChar = text.codePointAt(adjustedOffset + seqLength);
      if (nextChar === undefined) break;
      
      // Add the code point length
      seqLength += nextChar > 0xFFFF ? 2 : 1;
      
      // Check for another ZWJ
      if (seqLength < text.length - adjustedOffset && 
          text.charCodeAt(adjustedOffset + seqLength) === 0x200D) {
        seqLength++; // Include ZWJ and continue
      } else {
        break;
      }
    }
    length = seqLength;
  }
  
  // Variation selectors (e.g., emoji presentation)
  if (adjustedOffset + length < text.length) {
    const nextCode = text.charCodeAt(adjustedOffset + length);
    if (nextCode >= 0xFE00 && nextCode <= 0xFE0F) {
      length++;
    }
  }
  
  return {
    grapheme: text.slice(adjustedOffset, adjustedOffset + length),
    length
  };
}

/**
 * Safe substring operation that doesn't break surrogate pairs
 * @param text - The input string
 * @param start - Start offset in UTF-16 code units
 * @param length - Number of code units to extract
 * @returns Substring that doesn't break surrogate pairs
 */
export function safeSubstring(text: string, start: number, length: number): string {
  if (start < 0 || start >= text.length || length <= 0) {
    return '';
  }
  
  // Adjust start if it's in the middle of a surrogate pair
  const startInfo = isSurrogatePair(text, start);
  if (startInfo.isLowSurrogate && start > 0) {
    start--;
    // Don't increment length since we're adjusting the start position
  }
  
  // Calculate end position
  let end = Math.min(start + length, text.length);
  
  // Adjust end if it's in the middle of a surrogate pair
  if (end < text.length) {
    const endInfo = isSurrogatePair(text, end);
    if (endInfo.isLowSurrogate && end > 0) {
      end--;
    }
  }
  
  return text.slice(start, end);
}

/**
 * Find all positions where a pattern occurs in text, using code unit offsets
 * @param text - The text to search in
 * @param pattern - The pattern to search for
 * @returns Array of code unit offsets where pattern starts
 */
export function findAllCodeUnitOffsets(text: string, pattern: string): number[] {
  const offsets: number[] = [];
  let position = 0;
  
  while (position < text.length) {
    const index = text.indexOf(pattern, position);
    if (index === -1) break;
    
    offsets.push(index);
    position = index + pattern.length;
  }
  
  return offsets;
}

/**
 * Calculate the code unit offset after inserting text
 * @param originalOffset - Original offset before insertion
 * @param insertOffset - Where text was inserted
 * @param insertedLength - Length of inserted text in code units
 * @returns New offset after insertion
 */
export function offsetAfterInsert(
  originalOffset: number,
  insertOffset: number,
  insertedLength: number
): number {
  if (originalOffset <= insertOffset) {
    return originalOffset;
  }
  return originalOffset + insertedLength;
}

/**
 * Calculate the code unit offset after deleting text
 * @param originalOffset - Original offset before deletion
 * @param deleteStart - Start of deletion range
 * @param deleteEnd - End of deletion range
 * @returns New offset after deletion
 */
export function offsetAfterDelete(
  originalOffset: number,
  deleteStart: number,
  deleteEnd: number
): number {
  if (originalOffset <= deleteStart) {
    return originalOffset;
  }
  if (originalOffset >= deleteEnd) {
    return originalOffset - (deleteEnd - deleteStart);
  }
  // Offset was within deleted range
  return deleteStart;
}