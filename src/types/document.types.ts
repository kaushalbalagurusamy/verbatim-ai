export interface Document {
  id: string;
  title: string;
  content: DocumentContent;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  version: number;
  isModified?: boolean;
}

export interface DocumentContent {
  blocks: ContentBlock[];
  version: string; // For future compatibility
}

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: string;
  formatting?: TextFormatting[];
  metadata?: BlockMetadata;
}

export type BlockType = 
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'mention'
  | 'command';

export interface TextFormatting {
  type: FormattingType;
  start: number;
  end: number;
  color?: HighlightColor;
}

export type FormattingType = 
  | 'bold' // "emphasis" in the UI
  | 'highlight'
  | 'minimize';

export type HighlightColor = 
  | 'yellow'
  | 'blue'
  | 'green'
  | 'pink';

export interface BlockMetadata {
  mentionId?: string; // For @ mentions
  command?: string; // For / commands
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

export type FileTreeItem = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileTreeItem[];
  documentId?: string; // For files
  isExpanded?: boolean; // UI state
  isModified?: boolean; // For files
}

export interface DocumentCreateInput {
  title: string;
  content?: DocumentContent;
  folderId?: string;
}

export interface DocumentUpdateInput {
  title?: string;
  content?: DocumentContent;
  folderId?: string;
}