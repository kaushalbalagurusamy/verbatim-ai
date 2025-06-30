import { v4 as uuidv4 } from 'uuid';
import { StorageService } from './storage.service';
import { createNewDocument, createEmptyContent } from '../../../src/utils/document.utils';
import type { Document, DocumentCreateInput, DocumentUpdateInput } from '../../../src/types/document.types';
import { validateDocument, validateDocumentCreate, validateDocumentUpdate } from '../models/document.model';

export class DocumentService {
  private storage: StorageService;

  constructor() {
    this.storage = new StorageService();
  }

  async createDocument(input: DocumentCreateInput): Promise<Document> {
    // Validate input
    const validatedInput = validateDocumentCreate(input);
    
    // Create new document
    const document = createNewDocument(validatedInput.title, validatedInput.folderId);
    
    // If content provided, use it; otherwise use default empty content
    if (validatedInput.content) {
      document.content = validatedInput.content;
    }

    // Save to storage
    await this.storage.saveDocument(document.id, document);
    
    return document;
  }

  async getDocument(id: string): Promise<Document | null> {
    const data = await this.storage.getDocument(id);
    if (!data) return null;

    // Validate and update last accessed time
    const document = validateDocument(data);
    document.lastAccessedAt = new Date().toISOString();
    
    // Save updated access time
    await this.storage.saveDocument(id, document);
    
    return document;
  }

  async getAllDocuments(): Promise<Document[]> {
    const documents = await this.storage.getAllDocuments();
    return documents.map(doc => validateDocument(doc));
  }

  async updateDocument(id: string, updates: DocumentUpdateInput): Promise<Document | null> {
    // Validate updates
    const validatedUpdates = validateDocumentUpdate(updates);
    
    // Get existing document
    const existingDoc = await this.storage.getDocument(id);
    if (!existingDoc) return null;

    const document = validateDocument(existingDoc);

    // Apply updates
    if (validatedUpdates.title !== undefined) {
      document.title = validatedUpdates.title;
    }
    if (validatedUpdates.content !== undefined) {
      document.content = validatedUpdates.content;
    }
    if (validatedUpdates.folderId !== undefined) {
      document.folderId = validatedUpdates.folderId;
    }

    // Update metadata
    document.updatedAt = new Date().toISOString();
    document.version = document.version + 1;
    document.isModified = true;

    // Save to storage
    await this.storage.saveDocument(id, document);
    
    return document;
  }

  async deleteDocument(id: string): Promise<boolean> {
    return await this.storage.deleteDocument(id);
  }

  async searchDocuments(query: string): Promise<Document[]> {
    // Simple search implementation - searches in title and content
    const allDocs = await this.getAllDocuments();
    const lowerQuery = query.toLowerCase();
    
    return allDocs.filter(doc => {
      // Search in title
      if (doc.title.toLowerCase().includes(lowerQuery)) return true;
      
      // Search in content blocks
      return doc.content.blocks.some(block => 
        block.content.toLowerCase().includes(lowerQuery)
      );
    });
  }

  async getDocumentsByFolder(folderId?: string): Promise<Document[]> {
    const allDocs = await this.getAllDocuments();
    
    if (folderId === undefined) {
      // Return documents without a folder
      return allDocs.filter(doc => !doc.folderId);
    }
    
    return allDocs.filter(doc => doc.folderId === folderId);
  }
}