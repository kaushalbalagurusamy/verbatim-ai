
import { MessageSquare, Settings, Minimize2, Plus, Send, Paperclip, Mic, MoreHorizontal, X } from 'lucide-react';
import { useState } from 'react';

interface ChatPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  activeView: 'document' | 'pen' | 'source' | 'recordings' | null;
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
        return 'New Document Chat';
      case 'pen':
        return 'New Analytic Chat';
      case 'source':
        return 'New Argument Chat';
      case 'recordings':
        return 'New Recording Chat';
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

  return <div data-testid="chat-panel" className="w-80 bg-[#252526] border-l border-[#3c3c3c] flex flex-col">
      {/* Chat Header */}
      <div className="h-12 bg-[#2d2d30] border-b border-[#3c3c3c] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#4fc3f7]" />
          <span className="text-sm font-medium text-[#cccccc]">Chat</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={addNewTab} className="p-1 hover:bg-[#4c4c4c] rounded">
            <Plus className="w-4 h-4 text-[#cccccc]" />
          </button>
          <button className="p-1 hover:bg-[#4c4c4c] rounded">
            <Settings className="w-4 h-4 text-[#cccccc]" />
          </button>
          <button className="p-1 hover:bg-[#4c4c4c] rounded">
            <MoreHorizontal className="w-4 h-4 text-[#cccccc]" />
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="h-9 bg-[#2d2d30] border-b border-[#3c3c3c] flex items-center overflow-x-auto">
        {tabs.map(tab => (
          <div 
            key={tab.id} 
            className={`flex items-center gap-2 px-3 h-full border-r border-[#3c3c3c] min-w-0 max-w-xs cursor-pointer ${
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
              className="opacity-0 hover:opacity-100 hover:bg-[#4c4c4c] rounded p-0.5 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Chat Content */}
      <div className="flex-1 p-4">
        {activeTab && (
          <div className="text-sm text-[#6a6a6a] mb-4">
            {activeTab.title}
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-[#3c3c3c]">
        <div className="relative">
          <div className="flex items-center gap-2 bg-[#3c3c3c] rounded-lg p-2">
            <button className="p-1 hover:bg-[#4c4c4c] rounded">
              <Paperclip className="w-4 h-4 text-[#cccccc]" />
            </button>
            <input 
              type="text" 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              placeholder="Type a message..." 
              className="flex-1 bg-transparent text-[#cccccc] text-sm outline-none placeholder-[#6a6a6a]" 
            />
            <button className="p-1 hover:bg-[#4c4c4c] rounded">
              <Mic className="w-4 h-4 text-[#cccccc]" />
            </button>
            <button className="p-1 hover:bg-[#4c4c4c] rounded">
              <Send className="w-4 h-4 text-[#cccccc]" />
            </button>
          </div>
        </div>
        
        {/* Agent Info - moved below input */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-[#6a6a6a]">∞ Agent</span>
        </div>
      </div>
    </div>;
}
