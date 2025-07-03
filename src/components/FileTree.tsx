
import { ChevronRight, ChevronDown, File, Folder, Table, Telescope, Pen, Code, AudioWaveform } from 'lucide-react';
import { useState } from 'react';
import { ScrollArea } from './ui/scroll-area';

interface FileTreeProps {
  mode: 'document' | 'research' | 'pen' | 'source' | 'recordings' | 'flow';
  onFileSelect?: (fileName: string) => void;
}

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

export function FileTree({ mode, onFileSelect }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

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

  const renderNode = (node: FileNode, path: string = '') => {
    const currentPath = path ? `${path}/${node.name}` : node.name;
    const isExpanded = expandedFolders.has(currentPath);

    if (node.type === 'folder') {
      return (
        <div key={currentPath}>
          <button
            onClick={() => toggleFolder(currentPath)}
            className="flex items-center gap-1 w-full text-left text-sm text-[#cccccc] hover:bg-[#383838] px-2 py-1 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <Folder className="w-4 h-4 text-[#dcb67a]" />
            <span>{node.name}</span>
          </button>
          {isExpanded && node.children && (
            <div className="ml-4">
              {node.children.map(child => renderNode(child, currentPath))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={currentPath}
        onClick={() => {
          // Call the file selection handler
          onFileSelect?.(node.name);
          // Also call the global callback if it exists
          if (window.fileSelectCallback) {
            window.fileSelectCallback(node.name, mode, currentPath);
          }
        }}
        className="flex items-center gap-1 w-full text-left text-sm text-[#cccccc] hover:bg-[#383838] px-2 py-1 rounded transition-colors ml-4"
      >
        {getFileIcon(node.name)}
        <span>{node.name}</span>
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

  // Demo tree structure for testing - backend will populate this in production
  const getDemoTree = (): FileNode[] => {
    switch (mode) {
      case 'document':
        return [
          {
            name: 'Project Notes',
            type: 'folder',
            children: [
              { name: 'Meeting Notes.doc', type: 'file' },
              { name: 'Product Spec.doc', type: 'file' },
              { name: 'Roadmap.doc', type: 'file' }
            ]
          },
          { name: 'Quick Notes.doc', type: 'file' }
        ];
      case 'flow':
        return [
          {
            name: 'Data Analysis',
            type: 'folder',
            children: [
              { name: 'Sales Data.flow', type: 'file' },
              { name: 'Customer Analytics.flow', type: 'file' }
            ]
          },
          { name: 'Budget Planning.flow', type: 'file' }
        ];
      case 'research':
        return [
          { name: 'Market Research.research', type: 'file' },
          { name: 'Competitor Analysis.research', type: 'file' }
        ];
      case 'pen':
        return [
          { name: 'Q4 Analytics.pen', type: 'file' },
          { name: 'User Behavior.pen', type: 'file' }
        ];
      case 'source':
        return [
          {
            name: 'References',
            type: 'folder',
            children: [
              { name: 'Research Paper 1.pdf', type: 'file' },
              { name: 'Case Study.pdf', type: 'file' }
            ]
          }
        ];
      case 'recordings':
        return [
          { name: 'Interview 1.rec', type: 'file' },
          { name: 'User Testing Session.rec', type: 'file' }
        ];
      default:
        return [];
    }
  };
  
  const treeData = getDemoTree();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-3">
          <h3 className="text-xs font-medium text-[#6a6a6a] uppercase mb-2">
            {getTitle()}
          </h3>
          <div className="space-y-1">
            {treeData.length === 0 ? (
              <div className="text-xs text-[#6a6a6a] italic px-2 py-1">
                {getEmptyMessage()}
              </div>
            ) : (
              treeData.map(node => renderNode(node))
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
