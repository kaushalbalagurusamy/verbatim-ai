
import { ChevronRight, ChevronDown, File, Folder, Table, Telescope, Pen, Code, AudioWaveform, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { documentStore, DocumentContent } from '@/lib/document-store';
import { createNewDocument } from '@/utils/document.utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileTreeProps {
  mode: 'document' | 'research' | 'pen' | 'source' | 'recordings' | 'flow';
  onFileSelect?: (fileName: string) => void;
}

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

export function FileTree({ mode, onFileSelect }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<FileNode[]>([]);

  useEffect(() => {
    // Load documents from store based on mode
    const type = mode === 'flow' ? 'flow' : 'document';
    const docs = documentStore.getDocumentsByType(type);
    
    // Map to FileNode
    const fileNodes: FileNode[] = docs.map(doc => ({
      id: doc.id,
      name: doc.title,
      type: 'file'
    }));
    
    setFiles(fileNodes);
  }, [mode]);

  const handleCreateDocument = () => {
    const type = mode === 'flow' ? 'flow' : 'document';
    const extension = type === 'flow' ? '.flow' : '.doc';
    const title = `New ${type === 'flow' ? 'Flow' : 'Document'} ${files.length + 1}${extension}`;
    
    const newDoc = createNewDocument(title);
    
    // Add to document store
    const docContent: DocumentContent = {
      id: newDoc.id,
      type: type,
      title: newDoc.title,
      content: newDoc.content,
      metadata: {
        createdAt: new Date(),
        modifiedAt: new Date()
      }
    };
    documentStore.setDocument(docContent);

    // Update local state
    setFiles(prev => [...prev, {
      id: newDoc.id,
      name: newDoc.title,
      type: 'file'
    }]);
  };

  const handleCreateFolder = () => {
    // For now, just add a folder to local state as DocumentStore doesn't support folders explicitly yet
    const folderName = `New Folder ${files.filter(f => f.type === 'folder').length + 1}`;
    setFiles(prev => [...prev, {
      id: `folder-${Date.now()}`,
      name: folderName,
      type: 'folder',
      children: []
    }]);
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'flow':
        return <Table className="w-4 h-4 text-[#4fc3f7]" />;
      case 'doc':
        return <File className="w-4 h-4 text-[#4fc3f7]" />;
      case 'research':
        return <Telescope className="w-4 h-4 text-[#4fc3f7]" />;
      case 'pen':
        return <Pen className="w-4 h-4 text-[#4fc3f7]" />;
      case 'pdf':
        return <Code className="w-4 h-4 text-[#4fc3f7]" />;
      case 'rec':
        return <AudioWaveform className="w-4 h-4 text-[#4fc3f7]" />;
      default:
        return <File className="w-4 h-4 text-[#4fc3f7]" />;
    }
  };

  const renderNode = (node: FileNode, path: string = '', level: number = 0) => {
    const currentPath = path ? `${path}/${node.name}` : node.name;
    const isExpanded = expandedFolders.has(currentPath);
    const indent = level * 16; // 16px per level
    
    // Strip extension for display
    const displayName = node.name.replace(/\.[^/.]+$/, "");

    if (node.type === 'folder') {
      return (
        <div key={node.id || currentPath}>
          <button
            onClick={() => toggleFolder(currentPath)}
            className="flex items-center gap-1 w-full text-left text-sm text-[#cccccc] hover:bg-[#383838] px-2 py-1 rounded transition-colors"
            style={{ paddingLeft: `${8 + indent}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 flex-shrink-0" />
            )}
            <Folder className="w-4 h-4 text-[#dcb67a] flex-shrink-0" />
            <span className="truncate">{node.name}</span>
          </button>
          {isExpanded && node.children && (
            <div>
              {node.children.map(child => renderNode(child, currentPath, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={node.id || currentPath}
        onClick={() => {
          // Call the file selection handler
          onFileSelect?.(node.name);
          // Also call the global callback if it exists
          if ((window as any).fileSelectCallback) {
            (window as any).fileSelectCallback(node.name, mode, currentPath);
          }
        }}
        className="flex items-center gap-1 w-full text-left text-sm text-[#cccccc] hover:bg-[#383838] px-2 py-1 rounded transition-colors"
        style={{ paddingLeft: `${8 + indent}px` }}
      >
        {/* Spacer to align with folder icons (chevron width + gap) */}
        <div className="w-3 flex-shrink-0"></div>
        {getFileIcon(node.name)}
        <span className="truncate">{displayName}</span>
      </button>
    );
  };

  const getTitle = () => {
    switch (mode) {
      case 'document':
        return 'Documents';
      case 'research':
        return 'Research';
      case 'pen':
        return 'Analytics';
      case 'source':
        return 'Source Files';
      case 'recordings':
        return 'Recordings';
      case 'flow':
        return 'Flow';
      default:
        return 'Files';
    }
  };

  const getEmptyMessage = () => {
    switch (mode) {
      case 'document':
        return 'No documents found';
      case 'research':
        return 'No research found';
      case 'pen':
        return 'No analytics found';
      case 'source':
        return 'No source files found';
      case 'recordings':
        return 'No recordings found';
      case 'flow':
        return 'No flow found';
      default:
        return 'No files found';
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-[#6a6a6a] uppercase">
              {getTitle()}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-[#6a6a6a] hover:text-[#cccccc] transition-colors outline-none">
                  <Plus className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#2d2d30] border-[#3c3c3c] text-[#cccccc]">
                <DropdownMenuItem onClick={handleCreateDocument} className="hover:bg-[#383838] focus:bg-[#383838] cursor-pointer">
                  <File className="w-4 h-4 mr-2" />
                  New Document
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateFolder} className="hover:bg-[#383838] focus:bg-[#383838] cursor-pointer">
                  <Folder className="w-4 h-4 mr-2" />
                  New Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="space-y-1">
            {files.length === 0 ? (
              <div className="text-xs text-[#6a6a6a] italic px-2 py-1">
                {getEmptyMessage()}
              </div>
            ) : (
              files.map(node => renderNode(node))
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
