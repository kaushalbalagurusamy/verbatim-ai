import { z } from 'zod';
import type { Document, DocumentContent, ContentBlock } from '../../../src/types/document.types';

// Zod schemas for validation
const HighlightColorSchema = z.enum(['yellow', 'blue', 'green', 'pink']);

const FormattingTypeSchema = z.enum(['bold', 'highlight', 'minimize']);

const TextFormattingSchema = z.object({
  type: FormattingTypeSchema,
  start: z.number().min(0),
  end: z.number().positive(),
  color: HighlightColorSchema.optional()
});

const BlockTypeSchema = z.enum([
  'paragraph',
  'heading1',
  'heading2', 
  'heading3',
  'heading4',
  'heading5',
  'heading6',
  'mention',
  'command'
]);

const BlockMetadataSchema = z.object({
  mentionId: z.string().optional(),
  command: z.string().optional()
});

const ContentBlockSchema = z.object({
  id: z.string().uuid(),
  type: BlockTypeSchema,
  content: z.string(),
  formatting: z.array(TextFormattingSchema).optional(),
  metadata: BlockMetadataSchema.optional()
});

const DocumentContentSchema = z.object({
  blocks: z.array(ContentBlockSchema).min(1),
  version: z.string()
});

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  content: DocumentContentSchema,
  folderId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastAccessedAt: z.string().datetime(),
  version: z.number().positive(),
  isModified: z.boolean().optional()
});

export const DocumentCreateSchema = z.object({
  title: z.string().min(1).max(255),
  content: DocumentContentSchema.optional(),
  folderId: z.string().uuid().optional()
});

export const DocumentUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: DocumentContentSchema.optional(),
  folderId: z.string().uuid().optional()
});

// Type guards
export function isValidDocument(data: unknown): data is Document {
  return DocumentSchema.safeParse(data).success;
}

export function validateDocument(data: unknown): Document {
  return DocumentSchema.parse(data);
}

export function validateDocumentCreate(data: unknown) {
  return DocumentCreateSchema.parse(data);
}

export function validateDocumentUpdate(data: unknown) {
  return DocumentUpdateSchema.parse(data);
}