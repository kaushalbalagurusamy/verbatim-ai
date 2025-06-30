import type { 
  Document, 
  DocumentCreateInput, 
  DocumentUpdateInput 
} from '@/types/document.types';

const API_BASE_URL = 'http://localhost:3001/api';

export class DocumentsAPI {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getAllDocuments(folderId?: string): Promise<Document[]> {
    const queryParam = folderId ? `?folderId=${folderId}` : '';
    return this.request<Document[]>(`/documents${queryParam}`);
  }

  async getDocument(id: string): Promise<Document> {
    return this.request<Document>(`/documents/${id}`);
  }

  async createDocument(input: DocumentCreateInput): Promise<Document> {
    return this.request<Document>('/documents', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateDocument(id: string, input: DocumentUpdateInput): Promise<Document> {
    return this.request<Document>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.request<void>(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  async searchDocuments(query: string): Promise<Document[]> {
    return this.request<Document[]>(`/documents/search?q=${encodeURIComponent(query)}`);
  }
}

// Export singleton instance
export const documentsAPI = new DocumentsAPI();