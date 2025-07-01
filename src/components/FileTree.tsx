
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { useState } from 'react';

interface FileTreeProps {
  mode: 'document' | 'research' | 'pen' | 'source' | 'recordings' | 'flow';
}

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

export function FileTree({ mode }: FileTreeProps) {
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
        className="flex items-center gap-1 w-full text-left text-sm text-[#cccccc] hover:bg-[#383838] px-2 py-1 rounded transition-colors ml-4"
      >
        <File className="w-4 h-4 text-[#4fc3f7]" />
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

  // Empty tree structure - backend will populate this
  const emptyTree: FileNode[] = [];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3">
        <h3 className="text-xs font-medium text-[#6a6a6a] uppercase mb-2">
          {getTitle()}
        </h3>
        <div className="space-y-1">
          {emptyTree.length === 0 ? (
            <div className="text-xs text-[#6a6a6a] italic px-2 py-1">
              {getEmptyMessage()}
            </div>
          ) : (
            emptyTree.map(node => renderNode(node))
          )}
        </div>
      </div>
    </div>
  );
}
