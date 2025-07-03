/**
 * Main Editor Component - Central editor area with tab management
 * Uses TabManager for centralized tab operations and DocumentStore for content persistence
 */

import { X, File, Table, Telescope, Pen, Code, AudioWaveform, Plus } from 'lucide-react';
import { useEffect } from 'react';
import { EditorWithToolbar } from './editor/EditorWithToolbar';
import { FlowEditor } from './FlowEditor';
import { useTabManager, tabManager, ViewType } from '@/lib/tab-manager';
import { useDocument } from '@/lib/document-store';

// Extend window interface for file selection callback
declare global {
  interface Window {
    fileSelectCallback?: (fileName: string, fileType: ViewType, filePath?: string) => void;
  }
}

interface MainEditorProps {
  activeView: ViewType | null;
  onDocumentTitleChange?: (title: string) => void;
  onFileSelect?: (fileName: string, fileType: ViewType) => void;
}

export function MainEditor({ activeView, onDocumentTitleChange, onFileSelect }: MainEditorProps) {
  const { tabs, activeTab, openTab, closeTab, activateTab, updateTabTitle } = useTabManager();
  const { document: activeDocument, updateContent, updateTitle } = useDocument(activeTab?.documentId);

  // Get icon for tab type
  const getTabIcon = (type: ViewType) => {
    switch (type) {
      case 'flow':
        return Table;
      case 'document':
        return File;
      case 'research':
        return Telescope;
      case 'pen':
        return Pen;
      case 'source':
        return Code;
      case 'recordings':
        return AudioWaveform;
      default:
        return File;
    }
  };

  // Get new tab title based on view type
  const getNewTabTitle = () => {
    switch (activeView) {
      case 'document':
        return 'New Document';
      case 'research':
        return 'New Deep Research';
      case 'pen':
        return 'New Analytic';
      case 'source':
        return 'New Source';
      case 'recordings':
        return 'New Recording';
      case 'flow':
        return 'New Flow';
      default:
        return 'New Document';
    }
  };

  // Handle new tab creation
  const handleNewTab = () => {
    if (!activeView) return;
    
    openTab({
      title: getNewTabTitle(),
      type: activeView
    });
  };

  // Handle file selection from FileTree
  useEffect(() => {
    if (onFileSelect) {
      // Register a callback that FileTree can use
      window.fileSelectCallback = (fileName: string, fileType: ViewType, filePath?: string) => {
        // Switch to the appropriate view if needed
        if (activeView !== fileType) {
          onFileSelect(fileName, fileType);
        }
        
        // Open the file in a new tab
        openTab({
          title: fileName,
          type: fileType,
          filePath: filePath
        });
      };
    }
    
    return () => {
      if (window.fileSelectCallback) {
        delete window.fileSelectCallback;
      }
    };
  }, [activeView, onFileSelect, openTab]);

  // Render editor content based on active tab
  const renderEditorContent = () => {
    // Show empty state when no tabs exist
    if (!activeTab || tabs.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[#6a6a6a] text-lg mb-2">No Tabs Open</div>
            <div className="text-[#4a4a4a] text-sm">
              {activeView ? 'Create a new tab or select a file from the explorer' : 'Select a view from the sidebar to get started'}
            </div>
          </div>
        </div>
      );
    }

    // Show loading state if document not loaded yet
    if (!activeDocument) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[#6a6a6a]">Loading...</div>
        </div>
      );
    }

    // Render content based on tab type
    if (activeTab.type === 'flow') {
      return (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <FlowEditor 
              documentId={activeTab.documentId}
              initialTitle={activeDocument.title}
              initialData={activeDocument.content}
              onTitleChange={(newTitle) => {
                updateTabTitle(activeTab.id, newTitle);
              }}
              onContentChange={(content) => {
                updateContent(content);
              }}
            />
          </div>
        </div>
      );
    }

    // For all other types, use the document editor
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-4 flex-shrink-0">
          <div className="max-w-4xl">
            <input
              type="text"
              value={activeDocument.title}
              onChange={(e) => {
                updateTabTitle(activeTab.id, e.target.value);
              }}
              className="text-2xl font-light text-[#cccccc] mb-6 bg-transparent border-none outline-none w-full"
              placeholder={getNewTabTitle()}
            />
          </div>
        </div>
        
        {/* Full Editor with Toolbar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorWithToolbar 
            documentId={activeTab.documentId}
            initialTitle={activeDocument.title}
            initialContent={activeDocument.content}
            onTitleChange={(newTitle) => {
              updateTabTitle(activeTab.id, newTitle);
            }}
            onContentChange={(content) => {
              updateContent(content);
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div data-testid="main-editor" className="flex flex-col h-full overflow-hidden">
      {/* Tab Bar - Shows ALL tabs regardless of activeView */}
      <div className="h-9 bg-[#2d2d30] border-b border-[#3c3c3c] flex items-center overflow-x-auto flex-shrink-0">
        {tabs.map(tab => {
          const IconComponent = getTabIcon(tab.type);
          return (
            <div 
              key={tab.id} 
              className={`flex items-center gap-2 px-3 h-full border-r border-[#3c3c3c] min-w-0 max-w-xs cursor-pointer flex-shrink-0 ${
                tab.active ? 'bg-[#252526] text-[#ffffff]' : 'bg-[#2d2d30] text-[#cccccc] hover:bg-[#383838]'
              }`}
              onClick={() => activateTab(tab.id)}
            >
              <IconComponent className="w-3 h-3 flex-shrink-0" />
              <span className="text-xs truncate min-w-0 flex-1">
                {tab.title}
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }} 
                className="opacity-0 hover:opacity-100 hover:bg-[#4c4c4c] rounded p-0.5 transition-opacity flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        <button 
          onClick={handleNewTab}
          className="flex items-center justify-center w-9 h-full hover:bg-[#383838] text-[#cccccc] transition-colors flex-shrink-0"
          disabled={!activeView}
          title={activeView ? `New ${getNewTabTitle()}` : 'Select a view to create tabs'}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 bg-[#1e1e1e] flex flex-col overflow-hidden">
        {renderEditorContent()}
      </div>
    </div>
  );
}