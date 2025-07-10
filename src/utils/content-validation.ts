/**
 * Content Validation Utilities - Ensures document content is valid and safe
 * Prevents crashes from malformed or invalid content structures
 */
import type { ContentBlock, DocumentContent, TextFormatting } from '@/types/document.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Validate and sanitize document content
 */
export function validateDocumentContent(content: unknown): DocumentContent {
  // Handle null/undefined content
  if (!content) {
    return createEmptyDocumentContent();
  }

  // Handle legacy text format
  if (typeof content === 'string' || (content as Record<string, unknown>).text !== undefined) {
    const text = typeof content === 'string' ? content : ((content as Record<string, unknown>).text || '') as string;
    return {
      blocks: [{
        id: uuidv4(),
        type: 'paragraph',
        content: text,
        formatting: []
      }],
      version: '1.0.0'
    };
  }

  // Validate blocks array
  if (!Array.isArray((content as Record<string, unknown>).blocks)) {
    return createEmptyDocumentContent();
  }

  // Validate and sanitize each block
  const validatedBlocks = ((content as Record<string, unknown>).blocks as unknown[]).map(validateContentBlock).filter(Boolean) as ContentBlock[];

  // Ensure at least one block exists
  if (validatedBlocks.length === 0) {
    return createEmptyDocumentContent();
  }

  return {
    blocks: validatedBlocks,
    version: (content as Record<string, unknown>).version as string || '1.0.0'
  };
}

/**
 * Validate a single content block
 */
function validateContentBlock(block: unknown): ContentBlock | null {
  if (!block || typeof block !== 'object') {
    return null;
  }

  // Validate required fields
  const blockObj = block as Record<string, unknown>;
  const id = blockObj.id as string || uuidv4();
  const type = validateBlockType(blockObj.type);
  const content = typeof blockObj.content === 'string' ? blockObj.content : '';
  
  // Validate formatting
  const formatting = validateFormatting(blockObj.formatting, content.length);

  return {
    id,
    type,
    content,
    formatting
  };
}

/**
 * Validate block type
 */
function validateBlockType(type: unknown): ContentBlock['type'] {
  const validTypes = [
    'paragraph', 'heading1', 'heading2', 'heading3', 
    'heading4', 'heading5', 'heading6', 'mention', 'command'
  ];
  
  return validTypes.includes(type) ? type : 'paragraph';
}

/**
 * Validate formatting array
 */
function validateFormatting(formatting: unknown, textLength: number): TextFormatting[] {
  if (!Array.isArray(formatting)) {
    return [];
  }

  return formatting
    .filter((fmt: unknown) => {
      // Check basic structure
      if (!fmt || typeof fmt !== 'object') return false;
      const fmtObj = fmt as Record<string, unknown>;
      if (typeof fmtObj.start !== 'number' || typeof fmtObj.end !== 'number') return false;
      if (!['bold', 'highlight', 'minimize'].includes(fmtObj.type as string)) return false;
      
      // Check bounds
      if (fmtObj.start < 0 || fmtObj.end > textLength || fmtObj.start >= fmtObj.end) return false;
      
      // Check highlight color if present
      if (fmtObj.type === 'highlight' && fmtObj.color) {
        if (!['yellow', 'blue', 'green', 'pink'].includes(fmtObj.color as string)) return false;
      }
      
      return true;
    })
    .map((fmt: unknown) => {
      const fmtObj = fmt as Record<string, unknown>;
      return {
        type: fmtObj.type as TextFormatting['type'],
        start: Math.max(0, fmtObj.start as number),
        end: Math.min(textLength, fmtObj.end as number),
        ...(fmtObj.color && { color: fmtObj.color as TextFormatting['color'] })
      };
    });
}

/**
 * Create empty document content
 */
function createEmptyDocumentContent(): DocumentContent {
  return {
    blocks: [{
      id: uuidv4(),
      type: 'paragraph',
      content: '',
      formatting: []
    }],
    version: '1.0.0'
  };
}

/**
 * Sanitize content for safe rendering
 */
export function sanitizeContent(content: string): string {
  // Remove any potentially dangerous characters or patterns
  return content
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}