/**
 * Minimal test to debug DocumentModel behavior
 */

import { describe, it, expect } from 'vitest';
import { DocumentModel } from '../../models/document-model';

describe('DocumentModel behavior', () => {
  it('should understand how document model works', () => {
    const doc = new DocumentModel();
    
    console.log('Initial:', {
      text: JSON.stringify(doc.getText()),
      blocks: doc.getBlocks().map(b => ({ 
        id: b.id.substring(0, 10), 
        text: JSON.stringify(b.text), 
        offset: b.offset,
        length: b.length 
      }))
    });
    
    // Insert text
    doc.insertText(0, 'Hello');
    console.log('After insert at 0:', {
      text: JSON.stringify(doc.getText()),
      blocks: doc.getBlocks().map(b => ({ 
        id: b.id.substring(0, 10), 
        text: JSON.stringify(b.text), 
        offset: b.offset,
        length: b.length 
      }))
    });
    
    // Delete all
    const length = doc.getLength();
    doc.deleteText(0, length);
    console.log('After delete all:', {
      text: JSON.stringify(doc.getText()),
      length: doc.getLength(),
      blocks: doc.getBlocks().map(b => ({ 
        id: b.id.substring(0, 10), 
        text: JSON.stringify(b.text), 
        offset: b.offset,
        length: b.length 
      }))
    });
    
    // Insert again
    doc.insertText(0, 'World');
    console.log('After insert World:', {
      text: JSON.stringify(doc.getText()),
      blocks: doc.getBlocks().map(b => ({ 
        id: b.id.substring(0, 10), 
        text: JSON.stringify(b.text), 
        offset: b.offset,
        length: b.length 
      }))
    });
    
    // What happens with newlines?
    doc.deleteText(0, doc.getLength());
    doc.insertText(0, 'Line1\nLine2');
    console.log('After insert with newline:', {
      text: JSON.stringify(doc.getText()),
      blocks: doc.getBlocks().map(b => ({ 
        id: b.id.substring(0, 10), 
        text: JSON.stringify(b.text), 
        offset: b.offset,
        length: b.length 
      }))
    });
  });
});