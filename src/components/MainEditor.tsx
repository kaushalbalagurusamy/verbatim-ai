
import { X, Settings, Maximize2, Minimize2, MoreHorizontal, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { EditorWithToolbar } from './editor/EditorWithToolbar';
import { FlowEditor } from './FlowEditor';

// Extend window interface for file selection callback
declare global {
  interface Window {
    fileSelectCallback?: (fileName: string, fileType: ViewType) => void;
  }
}

type ViewType = 'document' | 'research' | 'pen' | 'source' | 'recordings' | 'flow';

interface Tab {
  id: number;
  title: string;
  type: ViewType;
  active: boolean;
  modified: boolean;
}

interface MainEditorProps {
  activeView: ViewType | null;
  onDocumentTitleChange?: (title: string) => void;
  onFileSelect?: (fileName: string, fileType: ViewType) => void;
}

export function MainEditor({ activeView, onDocumentTitleChange, onFileSelect }: MainEditorProps) {
  // Separate tab storage for each view type
  const [tabsByView, setTabsByView] = useState<Record<ViewType, Tab[]>>({
    document: [],
    research: [],
    pen: [],
    source: [],
    recordings: [],
    flow: []
  });
  
  // Get tabs for current view
  const tabs = activeView ? tabsByView[activeView] : [];

  // Reference to the EditorWithToolbar's title change function
  const [editorTitleChangeHandler, setEditorTitleChangeHandler] = useState<((title: string) => void) | null>(null);

  const closeTab = (tabId: number) => {
    if (!activeView) return;
    
    const currentTabs = tabsByView[activeView];
    const tabIndex = currentTabs.findIndex(tab => tab.id === tabId);
    const isActive = currentTabs[tabIndex]?.active;
    const newTabs = currentTabs.filter(tab => tab.id !== tabId);
    
    // If we closed the active tab and there are still tabs, make another tab active
    if (isActive && newTabs.length > 0) {
      const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
      newTabs[newActiveIndex].active = true;
    }
    
    setTabsByView(prev => ({
      ...prev,
      [activeView]: newTabs
    }));
  };

  const addNewTab = () => {
    if (!activeView) return;
    
    const allTabs = Object.values(tabsByView).flat();
    const newId = allTabs.length > 0 ? Math.max(...allTabs.map(t => t.id)) + 1 : 1;
    const newTabTitle = getNewTabTitle();
    const newTab: Tab = {
      id: newId,
      title: newTabTitle,
      type: activeView,
      active: true,
      modified: false
    };
    
    setTabsByView(prev => ({
      ...prev,
      [activeView]: prev[activeView].map(tab => ({ ...tab, active: false })).concat(newTab)
    }));
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
    if (!activeView) return;
    
    setTabsByView(prev => ({
      ...prev,
      [activeView]: prev[activeView].map(tab => ({ ...tab, active: tab.id === tabId }))
    }));
  };

  const updateTabTitle = (tabId: number, newTitle: string) => {
    if (!activeView) return;
    
    setTabsByView(prev => ({
      ...prev,
      [activeView]: prev[activeView].map(tab => 
        tab.id === tabId ? { ...tab, title: newTitle } : tab
      )
    }));
  };
  
  // Handle file selection from FileTree
  useEffect(() => {
    if (onFileSelect) {
      // Register a callback that FileTree can use
      window.fileSelectCallback = (fileName: string, fileType: ViewType) => {
        // Switch to the appropriate view if needed
        if (activeView !== fileType) {
          onFileSelect(fileName, fileType);
        } else {
          // Create a new tab for the file
          const allTabs = Object.values(tabsByView).flat();
          const newId = allTabs.length > 0 ? Math.max(...allTabs.map(t => t.id)) + 1 : 1;
          const newTab: Tab = {
            id: newId,
            title: fileName,
            type: fileType,
            active: true,
            modified: false
          };
          
          setTabsByView(prev => ({
            ...prev,
            [fileType]: prev[fileType].map(tab => ({ ...tab, active: false })).concat(newTab)
          }));
        }
      };
    }
    
    return () => {
      if (window.fileSelectCallback) {
        delete window.fileSelectCallback;
      }
    };
  }, [activeView, onFileSelect, tabsByView]);

  const renderEditorContent = () => {
    const activeTab = tabs.find(tab => tab.active);
    
    // Show "Nothing Open" message when no tabs exist for current view
    if (!activeTab || tabs.length === 0) {
      const getEmptyMessage = () => {
        switch (activeView) {
          case 'document':
            return { title: 'No Documents Open', subtitle: 'Create a new document to get started' };
          case 'flow':
            return { title: 'No Flows Open', subtitle: 'Create a new flow to get started' };
          case 'research':
            return { title: 'No Research Open', subtitle: 'Create new research to get started' };
          case 'pen':
            return { title: 'No Analytics Open', subtitle: 'Create new analytics to get started' };
          case 'source':
            return { title: 'No Sources Open', subtitle: 'Add a source to get started' };
          case 'recordings':
            return { title: 'No Recordings Open', subtitle: 'Create a new recording to get started' };
          default:
            return { title: 'Nothing Open', subtitle: 'Create a new tab to get started' };
        }
      };
      
      const emptyMsg = getEmptyMessage();
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[#6a6a6a] text-lg mb-2">{emptyMsg.title}</div>
            <div className="text-[#4a4a4a] text-sm">{emptyMsg.subtitle}</div>
          </div>
        </div>
      );
    }

    const tabTitle = activeTab.title;

    // Render content based on tab type, not activeView
    if (activeTab.type === 'flow') {
      return (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <FlowEditor 
              key={activeTab.id}
              initialTitle={tabTitle}
              onTitleChange={(newTitle) => {
                updateTabTitle(activeTab.id, newTitle);
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
              value={tabTitle}
              onChange={(e) => {
                updateTabTitle(activeTab.id, e.target.value);
                // Also update the document title via the editor
                editorTitleChangeHandler?.(e.target.value);
              }}
              className="text-2xl font-light text-[#cccccc] mb-6 bg-transparent border-none outline-none w-full"
              placeholder={getNewTabTitle()}
            />
          </div>
        </div>
        
        {/* Full Editor with Toolbar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorWithToolbar 
            key={activeTab.id} // Force re-render when tab changes
            initialTitle={tabTitle}
            onTitleChange={(newTitle) => {
              updateTabTitle(activeTab.id, newTitle);
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
