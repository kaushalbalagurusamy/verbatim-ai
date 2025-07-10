/**
 * Document Store - Centralized storage for document and flow content
 * Manages persistence of editor content across tab switches
 */

export interface DocumentContent {
  id: string;
  type: 'document' | 'flow';
  title: string;
  content: unknown; // Editor-specific content
  metadata?: {
    createdAt: Date;
    modifiedAt: Date;
    filePath?: string;
  };
}

class DocumentStore {
  private documents: Map<string, DocumentContent> = new Map();
  private subscribers: Map<string, Set<(doc: DocumentContent) => void>> = new Map();

  /**
   * Get document by ID
   */
  getDocument(id: string): DocumentContent | undefined {
    return this.documents.get(id);
  }

  /**
   * Create or update a document
   */
  setDocument(document: DocumentContent): void {
    const existing = this.documents.get(document.id);
    const updatedDoc = {
      ...document,
      metadata: {
        ...document.metadata,
        modifiedAt: new Date(),
        createdAt: existing?.metadata?.createdAt || new Date()
      }
    };
    
    this.documents.set(document.id, updatedDoc);
    this.notifySubscribers(document.id, updatedDoc);
  }

  /**
   * Update document content only
   */
  updateContent(id: string, content: unknown): void {
    const doc = this.documents.get(id);
    if (doc) {
      this.setDocument({ ...doc, content });
    }
  }

  /**
   * Update document title
   */
  updateTitle(id: string, title: string): void {
    const doc = this.documents.get(id);
    if (doc) {
      this.setDocument({ ...doc, title });
    }
  }

  /**
   * Delete a document
   */
  deleteDocument(id: string): void {
    this.documents.delete(id);
    this.subscribers.delete(id);
  }

  /**
   * Subscribe to document changes
   */
  subscribe(id: string, callback: (doc: DocumentContent) => void): () => void {
    if (!this.subscribers.has(id)) {
      this.subscribers.set(id, new Set());
    }
    
    this.subscribers.get(id)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(id);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(id);
        }
      }
    };
  }

  /**
   * Notify subscribers of document changes
   */
  private notifySubscribers(id: string, document: DocumentContent): void {
    const subs = this.subscribers.get(id);
    if (subs) {
      subs.forEach(callback => callback(document));
    }
  }

  /**
   * Get all documents of a specific type
   */
  getDocumentsByType(type: 'document' | 'flow'): DocumentContent[] {
    return Array.from(this.documents.values()).filter(doc => doc.type === type);
  }

  /**
   * Clear all documents (use with caution)
   */
  clear(): void {
    this.documents.clear();
    this.subscribers.clear();
  }
}

// Export singleton instance
export const documentStore = new DocumentStore();

// React hook for using document store
import { useEffect, useState } from 'react';

export function useDocument(id: string | undefined) {
  const [document, setDocument] = useState<DocumentContent | undefined>(
    id ? documentStore.getDocument(id) : undefined
  );

  useEffect(() => {
    if (!id) return;

    // Set initial document
    const doc = documentStore.getDocument(id);
    if (doc) {
      setDocument(doc);
    }

    // Subscribe to changes
    const unsubscribe = documentStore.subscribe(id, (updatedDoc) => {
      setDocument(updatedDoc);
    });

    return unsubscribe;
  }, [id]);

  const updateContent = (content: unknown) => {
    if (id) {
      documentStore.updateContent(id, content);
    }
  };

  const updateTitle = (title: string) => {
    if (id) {
      documentStore.updateTitle(id, title);
    }
  };

  return {
    document,
    updateContent,
    updateTitle
  };
}