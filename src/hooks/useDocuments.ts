import { 
  useQuery, 
  useMutation, 
  useQueryClient, 
  UseQueryOptions,
  UseMutationOptions 
} from '@tanstack/react-query';
import { documentsAPI } from '@/api/documents.api';
import type { 
  Document, 
  DocumentCreateInput, 
  DocumentUpdateInput 
} from '@/types/document.types';

// Query Keys
export const QUERY_KEYS = {
  documents: ['documents'] as const,
  document: (id: string) => ['documents', id] as const,
  documentsByFolder: (folderId?: string) => ['documents', 'folder', folderId] as const,
  search: (query: string) => ['documents', 'search', query] as const,
};

// Get all documents
export function useDocuments(
  folderId?: string,
  options?: UseQueryOptions<Document[], Error>
) {
  return useQuery({
    queryKey: QUERY_KEYS.documentsByFolder(folderId),
    queryFn: () => documentsAPI.getAllDocuments(folderId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// Get single document
export function useDocument(
  id: string,
  options?: UseQueryOptions<Document, Error>
) {
  return useQuery({
    queryKey: QUERY_KEYS.document(id),
    queryFn: () => documentsAPI.getDocument(id),
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

// Search documents
export function useSearchDocuments(
  query: string,
  options?: UseQueryOptions<Document[], Error>
) {
  return useQuery({
    queryKey: QUERY_KEYS.search(query),
    queryFn: () => documentsAPI.searchDocuments(query),
    enabled: query.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
}

// Create document mutation
export function useCreateDocument(
  options?: UseMutationOptions<Document, Error, DocumentCreateInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: documentsAPI.createDocument,
    onSuccess: (newDocument) => {
      // Invalidate and refetch documents lists
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documents });
      
      // Add the new document to cache
      queryClient.setQueryData(
        QUERY_KEYS.document(newDocument.id), 
        newDocument
      );
    },
    ...options,
  });
}

// Update document mutation
export function useUpdateDocument(
  options?: UseMutationOptions<Document, Error, { id: string; input: DocumentUpdateInput }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }) => documentsAPI.updateDocument(id, input),
    onSuccess: (updatedDocument) => {
      // Update the document in cache
      queryClient.setQueryData(
        QUERY_KEYS.document(updatedDocument.id), 
        updatedDocument
      );
      
      // Update any documents lists that might contain this document
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documents });
    },
    ...options,
  });
}

// Delete document mutation
export function useDeleteDocument(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: documentsAPI.deleteDocument,
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.document(deletedId) });
      
      // Invalidate documents lists
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documents });
    },
    ...options,
  });
}

// Auto-save hook for documents
export function useAutoSaveDocument(
  documentId: string,
  debounceMs: number = 1000
) {
  const updateDocument = useUpdateDocument();
  
  const saveDocument = (input: DocumentUpdateInput) => {
    updateDocument.mutate({ id: documentId, input });
  };

  return {
    saveDocument,
    isSaving: updateDocument.isPending,
    isError: updateDocument.isError,
    error: updateDocument.error,
  };
}