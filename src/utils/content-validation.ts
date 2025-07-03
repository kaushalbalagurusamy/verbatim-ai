/**
 * Content Validation Utilities - Ensures document content is valid and safe
 * Prevents crashes from malformed or invalid content structures
 */
import type { ContentBlock, DocumentContent, TextFormatting } from '@/types/document.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Validate and sanitize document content
 */
export function validateDocumentContent(content: any): DocumentContent {
  // Handle null/undefined content
  if (!content) {
    return createEmptyDocumentContent();
  }

  // Handle legacy text format
  if (typeof content === 'string' || content.text !== undefined) {
    const text = typeof content === 'string' ? content : (content.text || '');
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
  if (!Array.isArray(content.blocks)) {
    return createEmptyDocumentContent();
  }

  // Validate and sanitize each block
  const validatedBlocks = content.blocks.map(validateContentBlock).filter(Boolean) as ContentBlock[];

  // Ensure at least one block exists
  if (validatedBlocks.length === 0) {
    return createEmptyDocumentContent();
  }

  return {
    blocks: validatedBlocks,
    version: content.version || '1.0.0'
  };
}

/**
 * Validate a single content block
 */
function validateContentBlock(block: any): ContentBlock | null {
  if (!block || typeof block !== 'object') {
    return null;
  }

  // Validate required fields
  const id = block.id || uuidv4();
  const type = validateBlockType(block.type);
  const content = typeof block.content === 'string' ? block.content : '';
  
  // Validate formatting
  const formatting = validateFormatting(block.formatting, content.length);

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
function validateBlockType(type: any): ContentBlock['type'] {
  const validTypes = [
    'paragraph', 'heading1', 'heading2', 'heading3', 
    'heading4', 'heading5', 'heading6', 'mention', 'command'
  ];
  
  return validTypes.includes(type) ? type : 'paragraph';
}

/**
 * Validate formatting array
 */
function validateFormatting(formatting: any, textLength: number): TextFormatting[] {
  if (!Array.isArray(formatting)) {
    return [];
  }

  return formatting
    .filter((fmt: any) => {
      // Check basic structure
      if (!fmt || typeof fmt !== 'object') return false;
      if (typeof fmt.start !== 'number' || typeof fmt.end !== 'number') return false;
      if (!['bold', 'highlight', 'minimize'].includes(fmt.type)) return false;
      
      // Check bounds
      if (fmt.start < 0 || fmt.end > textLength || fmt.start >= fmt.end) return false;
      
      // Check highlight color if present
      if (fmt.type === 'highlight' && fmt.color) {
        if (!['yellow', 'blue', 'green', 'pink'].includes(fmt.color)) return false;
      }
      
      return true;
    })
    .map((fmt: any) => ({
      type: fmt.type,
      start: Math.max(0, fmt.start),
      end: Math.min(textLength, fmt.end),
      ...(fmt.color && { color: fmt.color })
    }));
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