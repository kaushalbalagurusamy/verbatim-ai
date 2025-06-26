import { X, Settings, Maximize2, Minimize2, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
export function MainEditor() {
  const [tabs, setTabs] = useState([{
    id: 1,
    title: 'New Notepad',
    active: true,
    modified: false
  }]);
  const closeTab = (tabId: number) => {
    setTabs(tabs.filter(tab => tab.id !== tabId));
  };
  return <div className="flex flex-col h-screen">
      {/* Title Bar */}
      

      {/* Tab Bar */}
      <div className="h-9 bg-[#2d2d30] border-b border-[#3c3c3c] flex items-center">
        {tabs.map(tab => <div key={tab.id} className={`flex items-center gap-2 px-3 h-full border-r border-[#3c3c3c] min-w-0 max-w-xs ${tab.active ? 'bg-[#1e1e1e] text-[#ffffff]' : 'bg-[#2d2d30] text-[#cccccc] hover:bg-[#383838]'}`}>
            <span className="text-xs truncate">{tab.title}</span>
            <button onClick={() => closeTab(tab.id)} className="opacity-0 hover:opacity-100 hover:bg-[#4c4c4c] rounded p-0.5 transition-opacity">
              <X className="w-3 h-3" />
            </button>
          </div>)}
      </div>

      {/* Editor Content */}
      <div className="flex-1 bg-[#1e1e1e] p-6">
        <div className="max-w-4xl">
          <h1 className="text-2xl font-light text-[#cccccc] mb-6">New Notepad</h1>
          <div className="text-sm text-[#6a6a6a] mb-4">
            Type your thoughts, use @ to mention files
          </div>
          
          {/* Editor Area */}
          <div className="min-h-96">
            <textarea className="w-full h-full bg-transparent text-[#cccccc] border-none outline-none resize-none text-sm leading-relaxed" placeholder="Start typing your thoughts..." />
          </div>
        </div>
      </div>
    </div>;
}