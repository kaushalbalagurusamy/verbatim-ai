import { X, Settings, Maximize2, Minimize2, MoreHorizontal, Plus } from 'lucide-react';
import { useState } from 'react';
import { EditorWithToolbar } from './editor/EditorWithToolbar';

interface MainEditorProps {
  activeView: 'document' | 'pen' | 'source' | 'recordings' | null;
}

export function MainEditor({ activeView }: MainEditorProps) {
  const [tabs, setTabs] = useState([{
    id: 1,
    title: 'New Notepad',
    active: true,
    modified: false
  }]);

  const closeTab = (tabId: number) => {
    setTabs(tabs.filter(tab => tab.id !== tabId));
  };

  const addNewTab = () => {
    const newId = Math.max(...tabs.map(t => t.id)) + 1;
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
      case 'pen':
        return 'New Analytic';
      case 'source':
        return 'New Argument';
      case 'recordings':
        return 'New Recording';
      default:
        return 'New Notepad';
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

  return (
    <div className="flex flex-col h-screen">
      {/* Tab Bar */}
      <div className="h-9 bg-[#2d2d30] border-b border-[#3c3c3c] flex items-center">
        {tabs.map(tab => (
          <div 
            key={tab.id} 
            className={`flex items-center gap-2 px-3 h-full border-r border-[#3c3c3c] min-w-0 max-w-xs cursor-pointer ${
              tab.active ? 'bg-[#1e1e1e] text-[#ffffff]' : 'bg-[#2d2d30] text-[#cccccc] hover:bg-[#383838]'
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
              className="opacity-0 hover:opacity-100 hover:bg-[#4c4c4c] rounded p-0.5 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button 
          onClick={addNewTab}
          className="flex items-center justify-center w-9 h-full hover:bg-[#383838] text-[#cccccc] transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 bg-[#1e1e1e] flex flex-col">
        <div className="p-6 pb-0">
          <div className="max-w-4xl">
            <h1 className="text-2xl font-light text-[#cccccc] mb-6">New Doc</h1>
            
            {/* Formatting Toolbar */}
            <div className="mb-4">
              <EditorWithToolbar />
            </div>
            
            <div className="text-sm text-[#6a6a6a] mb-4">
              Type your thoughts, use @ to mention files, / to use agent
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
