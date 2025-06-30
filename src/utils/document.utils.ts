import { v4 as uuidv4 } from 'uuid';
import type { Document, DocumentContent, ContentBlock, BlockType } from '@/types/document.types';

export function createNewDocument(title: string, folderId?: string): Document {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    title,
    content: createEmptyContent(),
    folderId,
    createdAt: now,
    updatedAt: now,
    lastAccessedAt: now,
    version: 1,
    isModified: false
  };
}

export function createEmptyContent(): DocumentContent {
  return {
    blocks: [createBlock('paragraph', '')],
    version: '1.0.0'
  };
}

export function createBlock(type: BlockType, content: string): ContentBlock {
  return {
    id: uuidv4(),
    type,
    content,
    formatting: []
  };
}

export function createFolder(name: string, parentId?: string) {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name,
    parentId,
    createdAt: now,
    updatedAt: now
  };
}