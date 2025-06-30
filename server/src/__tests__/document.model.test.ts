import { describe, it, expect } from 'vitest';
import { 
  DocumentSchema, 
  DocumentCreateSchema, 
  DocumentUpdateSchema,
  isValidDocument,
  validateDocument,
  validateDocumentCreate,
  validateDocumentUpdate
} from '../models/document.model';

describe('Document Model Validation', () => {
  const validDocument = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test Document',
    content: {
      blocks: [{
        id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'paragraph',
        content: 'Test content',
        formatting: []
      }],
      version: '1.0.0'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
    version: 1,
    isModified: false
  };

  describe('DocumentSchema', () => {
    it('should validate a correct document', () => {
      const result = DocumentSchema.safeParse(validDocument);
      expect(result.success).toBe(true);
    });

    it('should reject document with invalid UUID', () => {
      const invalidDoc = { ...validDocument, id: 'not-a-uuid' };
      const result = DocumentSchema.safeParse(invalidDoc);
      expect(result.success).toBe(false);
    });

    it('should reject document with empty title', () => {
      const invalidDoc = { ...validDocument, title: '' };
      const result = DocumentSchema.safeParse(invalidDoc);
      expect(result.success).toBe(false);
    });

    it('should reject document with no content blocks', () => {
      const invalidDoc = { 
        ...validDocument, 
        content: { blocks: [], version: '1.0.0' } 
      };
      const result = DocumentSchema.safeParse(invalidDoc);
      expect(result.success).toBe(false);
    });
  });

  describe('DocumentCreateSchema', () => {
    it('should validate correct create input', () => {
      const input = {
        title: 'New Document',
        content: validDocument.content
      };
      const result = DocumentCreateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should allow create without content', () => {
      const input = { title: 'New Document' };
      const result = DocumentCreateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const input = { title: '' };
      const result = DocumentCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('DocumentUpdateSchema', () => {
    it('should validate partial updates', () => {
      const input = { title: 'Updated Title' };
      const result = DocumentUpdateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should allow empty update object', () => {
      const input = {};
      const result = DocumentUpdateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate content update', () => {
      const input = { content: validDocument.content };
      const result = DocumentUpdateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Type Guards', () => {
    it('isValidDocument should return true for valid document', () => {
      expect(isValidDocument(validDocument)).toBe(true);
    });

    it('isValidDocument should return false for invalid document', () => {
      expect(isValidDocument({ title: 'Invalid' })).toBe(false);
    });

    it('validateDocument should return document for valid input', () => {
      const result = validateDocument(validDocument);
      expect(result).toEqual(validDocument);
    });

    it('validateDocument should throw for invalid input', () => {
      expect(() => validateDocument({ title: 'Invalid' })).toThrow();
    });
  });
});