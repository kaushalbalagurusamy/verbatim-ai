
import { Brain, Settings } from 'lucide-react';

interface TopBarProps {
  sidebarVisible: boolean;
  chatVisible: boolean;
  mainEditorVisible: boolean;
  onToggleSidebar: () => void;
  onToggleChat: () => void;
  onToggleMainEditor: () => void;
}

export function TopBar({ 
  sidebarVisible, 
  chatVisible, 
  mainEditorVisible,
  onToggleSidebar, 
  onToggleChat,
  onToggleMainEditor 
}: TopBarProps) {
  return (
    <div className="h-12 bg-[#2d2d30] border-b border-[#3c3c3c] flex items-center justify-between px-4 flex-shrink-0">
      {/* Left side - LOGOS-AI branding */}
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-[#4fc3f7]" />
        <span className="text-sm font-medium text-[#cccccc]">LOGOS-AI</span>
      </div>
      
      {/* Right side - Panel toggle buttons and settings */}
      <div className="flex items-center gap-1">
        {/* File tree (sidebar) toggle */}
        <button 
          onClick={onToggleSidebar}
          className="p-1.5 hover:bg-[#4c4c4c] rounded transition-colors"
          title="Toggle Sidebar"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="14" height="12" rx="1" stroke="#4fc3f7" strokeWidth="1" fill="none"/>
            <rect x="1" y="2" width="4" height="12" rx="1" fill={sidebarVisible ? "#4fc3f7" : "none"} stroke="#4fc3f7" strokeWidth="1"/>
            <line x1="6" y1="2" x2="6" y2="14" stroke="#4fc3f7" strokeWidth="1"/>
            <line x1="10" y1="2" x2="10" y2="14" stroke="#4fc3f7" strokeWidth="1"/>
            {/* File tree lines */}
            <line x1="2" y1="4" x2="4" y2="4" stroke="#4fc3f7" strokeWidth="0.5"/>
            <line x1="2" y1="6" x2="3.5" y2="6" stroke="#4fc3f7" strokeWidth="0.5"/>
            <line x1="2" y1="8" x2="4" y2="8" stroke="#4fc3f7" strokeWidth="0.5"/>
            <line x1="2" y1="10" x2="3" y2="10" stroke="#4fc3f7" strokeWidth="0.5"/>
          </svg>
        </button>
        
        {/* Chevron left (main editor) toggle */}
        <button 
          onClick={onToggleMainEditor}
          className="p-1.5 hover:bg-[#4c4c4c] rounded transition-colors"
          title="Toggle Main Editor"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="14" height="12" rx="1" stroke="#4fc3f7" strokeWidth="1" fill="none"/>
            <rect x="6" y="2" width="4" height="12" fill={mainEditorVisible ? "#4fc3f7" : "none"} stroke="#4fc3f7" strokeWidth="1"/>
            <line x1="5" y1="2" x2="5" y2="14" stroke="#4fc3f7" strokeWidth="1"/>
            <line x1="11" y1="2" x2="11" y2="14" stroke="#4fc3f7" strokeWidth="1"/>
            {/* Chevron left symbol */}
            <path d="M9 6 L7 8 L9 10" stroke="#4fc3f7" strokeWidth="1" fill="none"/>
          </svg>
        </button>
        
        {/* Chat bubble (chat panel) toggle */}
        <button 
          onClick={onToggleChat}
          className="p-1.5 hover:bg-[#4c4c4c] rounded transition-colors"
          title="Toggle Chat"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="14" height="12" rx="1" stroke="#4fc3f7" strokeWidth="1" fill="none"/>
            <rect x="11" y="2" width="4" height="12" rx="1" fill={chatVisible ? "#4fc3f7" : "none"} stroke="#4fc3f7" strokeWidth="1"/>
            <line x1="6" y1="2" x2="6" y2="14" stroke="#4fc3f7" strokeWidth="1"/>
            <line x1="10" y1="2" x2="10" y2="14" stroke="#4fc3f7" strokeWidth="1"/>
            {/* Chat bubble */}
            <rect x="12" y="5" width="2.5" height="1.5" rx="0.75" fill="#4fc3f7"/>
            <rect x="12" y="7" width="2" height="1" rx="0.5" fill="#4fc3f7"/>
            <rect x="12" y="8.5" width="1.5" height="1" rx="0.5" fill="#4fc3f7"/>
          </svg>
        </button>

        {/* Settings cog */}
        <button 
          className="p-1.5 hover:bg-[#4c4c4c] rounded transition-colors ml-2"
          title="Settings"
        >
          <Settings className="w-4 h-4 text-[#6a6a6a]" />
        </button>
      </div>
    </div>
  );
}
