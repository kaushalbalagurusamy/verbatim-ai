
import { X, Settings, Maximize2, Minimize2, MoreHorizontal, Plus } from 'lucide-react';
import { useState } from 'react';
import { EditorWithToolbar } from './editor/EditorWithToolbar';
import { FlowEditor } from './FlowEditor';

interface MainEditorProps {
  activeView: 'document' | 'research' | 'pen' | 'source' | 'recordings' | 'flow' | null;
  onDocumentTitleChange?: (title: string) => void;
}

export function MainEditor({ activeView, onDocumentTitleChange }: MainEditorProps) {
  const [tabs, setTabs] = useState<Array<{
    id: number;
    title: string;
    active: boolean;
    modified: boolean;
  }>>([]);

  // Reference to the EditorWithToolbar's title change function
  const [editorTitleChangeHandler, setEditorTitleChangeHandler] = useState<((title: string) => void) | null>(null);

  const closeTab = (tabId: number) => {
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    const isActive = tabs[tabIndex]?.active;
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    
    // If we closed the active tab and there are still tabs, make another tab active
    if (isActive && newTabs.length > 0) {
      const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
      newTabs[newActiveIndex].active = true;
    }
    
    setTabs(newTabs);
  };

  const addNewTab = () => {
    const newId = tabs.length > 0 ? Math.max(...tabs.map(t => t.id)) + 1 : 1;
    const newTabTitle = getNewTabTitle();
    const newTab = {
      id: newId,
      title: newTabTitle,
      active: true,
      modified: false
    };
    setTabs(tabs.map(tab => ({ ...tab, active: false })).concat(newTab));
  };

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

  const setActiveTab = (tabId: number) => {
    setTabs(tabs.map(tab => ({ ...tab, active: tab.id === tabId })));
  };

  const updateTabTitle = (tabId: number, newTitle: string) => {
    setTabs(tabs.map(tab => 
      tab.id === tabId ? { ...tab, title: newTitle } : tab
    ));
  };

  const renderEditorContent = () => {
    // Show "Nothing Open" message when no tabs
    if (tabs.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[#6a6a6a] text-lg mb-2">Nothing Open</div>
            <div className="text-[#4a4a4a] text-sm">Create a new tab to get started</div>
          </div>
        </div>
      );
    }

    const activeTab = tabs.find(tab => tab.active);
    const tabTitle = activeTab?.title || 'New Document';

    // Don't render editor content if no active tab exists
    if (!activeTab) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[#6a6a6a] text-lg mb-2">Nothing Open</div>
            <div className="text-[#4a4a4a] text-sm">Create a new tab to get started</div>
          </div>
        </div>
      );
    }

    if (activeView === 'flow') {
      return (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <FlowEditor 
              initialTitle={tabTitle}
              onTitleChange={(newTitle) => {
                if (activeTab) {
                  updateTabTitle(activeTab.id, newTitle);
                }
              }}
            />
          </div>
        </div>
      );
    }

    // Default document editor - only render if we have an active tab
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-4 flex-shrink-0">
          <div className="max-w-4xl">
            <input
              type="text"
              value={tabTitle}
              onChange={(e) => {
                const activeTab = tabs.find(tab => tab.active);
                if (activeTab) {
                  updateTabTitle(activeTab.id, e.target.value);
                  // Also update the document title via the editor
                  editorTitleChangeHandler?.(e.target.value);
                }
              }}
              className="text-2xl font-light text-[#cccccc] mb-6 bg-transparent border-none outline-none w-full"
              placeholder="New Document"
            />
          </div>
        </div>
        
        {/* Full Editor with Toolbar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorWithToolbar 
            key={activeTab.id} // Force re-render when tab changes
            initialTitle={tabTitle}
            onTitleChange={(newTitle) => {
              const activeTab = tabs.find(tab => tab.active);
              if (activeTab) {
                updateTabTitle(activeTab.id, newTitle);
              }
            }}
            onTitleChangeHandlerReady={setEditorTitleChangeHandler}
          />
        </div>
      </div>
    );
  };

  return (
    <div data-testid="main-editor" className="flex flex-col h-full overflow-hidden">
      {/* Tab Bar */}
      <div className="h-9 bg-[#2d2d30] border-b border-[#3c3c3c] flex items-center overflow-x-auto flex-shrink-0">
        {tabs.map(tab => (
          <div 
            key={tab.id} 
            className={`flex items-center gap-2 px-3 h-full border-r border-[#3c3c3c] min-w-0 max-w-xs cursor-pointer flex-shrink-0 ${
              tab.active ? 'bg-[#252526] text-[#ffffff]' : 'bg-[#2d2d30] text-[#cccccc] hover:bg-[#383838]'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <input
              type="text"
              value={tab.title}
              onChange={(e) => updateTabTitle(tab.id, e.target.value)}
              className="text-xs bg-transparent border-none outline-none truncate min-w-0 flex-1"
              onKeyDown={(e) => e.stopPropagation()}
            />
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
        ))}
        <button 
          onClick={addNewTab}
          className="flex items-center justify-center w-9 h-full hover:bg-[#383838] text-[#cccccc] transition-colors flex-shrink-0"
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
