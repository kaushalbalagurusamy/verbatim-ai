import { Router, Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/document.service';
import { z } from 'zod';

const router = Router();
const documentService = new DocumentService();

// Error handler wrapper
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /api/documents - Get all documents
router.get('/documents', asyncHandler(async (req: Request, res: Response) => {
  const folderId = req.query.folderId as string | undefined;
  
  let documents;
  if (folderId !== undefined) {
    documents = await documentService.getDocumentsByFolder(folderId);
  } else {
    documents = await documentService.getAllDocuments();
  }
  
  res.json(documents);
}));

// GET /api/documents/search - Search documents
router.get('/documents/search', asyncHandler(async (req: Request, res: Response) => {
  const query = req.query.q as string;
  
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  const documents = await documentService.searchDocuments(query);
  res.json(documents);
}));

// GET /api/documents/:id - Get single document
router.get('/documents/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    z.string().uuid().parse(id);
  } catch {
    return res.status(400).json({ error: 'Invalid document ID format' });
  }
  
  const document = await documentService.getDocument(id);
  
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  res.json(document);
}));

// POST /api/documents - Create new document
router.post('/documents', asyncHandler(async (req: Request, res: Response) => {
  try {
    const document = await documentService.createDocument(req.body);
    res.status(201).json(document);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: error.errors 
      });
    }
    throw error;
  }
}));

// PUT /api/documents/:id - Update document
router.put('/documents/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    z.string().uuid().parse(id);
  } catch {
    return res.status(400).json({ error: 'Invalid document ID format' });
  }
  
  try {
    const document = await documentService.updateDocument(id, req.body);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: error.errors 
      });
    }
    throw error;
  }
}));

// DELETE /api/documents/:id - Delete document
router.delete('/documents/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    z.string().uuid().parse(id);
  } catch {
    return res.status(400).json({ error: 'Invalid document ID format' });
  }
  
  const deleted = await documentService.deleteDocument(id);
  
  if (!deleted) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  res.status(204).send();
}));

export default router;