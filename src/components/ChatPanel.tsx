
import { MessageSquare, Settings, Minimize2, Plus, Send, Paperclip, Mic, MoreHorizontal, X } from 'lucide-react';
import { useState } from 'react';

interface ChatPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  activeView: 'document' | 'research' | 'pen' | 'source' | 'recordings' | 'flow' | null;
}

export function ChatPanel({
  collapsed,
  onToggle,
  activeView
}: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [tabs, setTabs] = useState([{
    id: 1,
    title: 'New Chat',
    active: true,
    modified: false
  }]);

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
        return 'New Document Chat';
      case 'research':
        return 'New Research Chat';
      case 'pen':
        return 'New Analytic Chat';
      case 'source':
        return 'New Argument Chat';
      case 'recordings':
        return 'New Recording Chat';
      case 'flow':
        return 'New Flow Chat';
      default:
        return 'New Chat';
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

  if (collapsed) {
    return <div className="w-12 bg-[#252526] border-l border-[#3c3c3c] flex flex-col items-center py-2">
        <button onClick={onToggle} className="p-2 hover:bg-[#2a2d2e] rounded">
          <MessageSquare className="w-5 h-5 text-[#cccccc]" />
        </button>
      </div>;
  }

  const activeTab = tabs.find(tab => tab.active);

  return <div data-testid="chat-panel" className="bg-[#252526] border-l border-[#3c3c3c] flex flex-col h-full min-w-0">
      {/* Tab Bar - Fixed to be flush */}
      <div className="h-9 bg-[#2d2d30] border-b border-[#3c3c3c] flex items-stretch overflow-x-auto flex-shrink-0">
        <div className="flex items-stretch flex-1 overflow-x-auto">
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
        </div>
        <button 
          onClick={addNewTab}
          className="flex items-center justify-center w-9 h-full hover:bg-[#383838] text-[#cccccc] transition-colors flex-shrink-0 border-r-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Chat Content - Scrollable */}
      <div className="flex-1 overflow-auto min-h-0">
        {tabs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-[#6a6a6a] text-lg mb-2">Nothing Open</div>
              <div className="text-[#4a4a4a] text-sm">Create a new chat to get started</div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            {activeTab && (
              <div className="text-sm text-[#6a6a6a] mb-4">
                {activeTab.title}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Input - Fixed at bottom */}
      <div className="p-4 border-t border-[#3c3c3c] flex-shrink-0">
        <div className="relative">
          <div className="flex items-center gap-1 bg-[#3c3c3c] rounded-lg p-2">
            <input 
              type="text" 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              placeholder="Type a message..." 
              className="flex-1 bg-transparent text-[#cccccc] text-sm outline-none placeholder-[#6a6a6a] min-w-0 mr-2" 
            />
            <div className="flex items-center gap-1 flex-shrink-0">
              <button className="p-1 hover:bg-[#4c4c4c] rounded">
                <Paperclip className="w-4 h-4 text-[#cccccc]" />
              </button>
              <button className="p-1 hover:bg-[#4c4c4c] rounded">
                <Mic className="w-4 h-4 text-[#cccccc]" />
              </button>
              <button className="p-1 hover:bg-[#4c4c4c] rounded">
                <Send className="w-4 h-4 text-[#cccccc]" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Agent Info */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-[#6a6a6a]">∞ Agent</span>
        </div>
      </div>
    </div>;
}
