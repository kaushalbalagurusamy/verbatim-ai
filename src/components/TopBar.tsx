
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
            <rect x="2" y="3" width="12" height="10" rx="1" stroke="#4fc3f7" strokeWidth="1" fill="none"/>
            <rect x="2" y="3" width="3" height="10" fill={sidebarVisible ? "#4fc3f7" : "none"} stroke="#4fc3f7" strokeWidth="1"/>
            <line x1="6" y1="3" x2="6" y2="13" stroke="#4fc3f7" strokeWidth="1"/>
            {/* File tree structure */}
            <line x1="3" y1="5" x2="4.5" y2="5" stroke="#4fc3f7" strokeWidth="0.8"/>
            <line x1="3" y1="6.5" x2="4" y2="6.5" stroke="#4fc3f7" strokeWidth="0.8"/>
            <line x1="3.5" y1="8" x2="4.5" y2="8" stroke="#4fc3f7" strokeWidth="0.8"/>
            <line x1="3" y1="9.5" x2="4" y2="9.5" stroke="#4fc3f7" strokeWidth="0.8"/>
            <line x1="3.5" y1="11" x2="4.5" y2="11" stroke="#4fc3f7" strokeWidth="0.8"/>
          </svg>
        </button>
        
        {/* Chevron left (main editor) toggle */}
        <button 
          onClick={onToggleMainEditor}
          className="p-1.5 hover:bg-[#4c4c4c] rounded transition-colors"
          title="Toggle Main Editor"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M10 5 L7 8 L10 11" stroke={mainEditorVisible ? "#4fc3f7" : "#6a6a6a"} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        {/* Chat toggle */}
        <button 
          onClick={onToggleChat}
          className="p-1.5 hover:bg-[#4c4c4c] rounded transition-colors"
          title="Toggle Chat"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M3 6c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2H8l-2 2v-2H5c-1.1 0-2-.9-2-2V6z" 
                  fill={chatVisible ? "#4fc3f7" : "none"} 
                  stroke="#4fc3f7" 
                  strokeWidth="1"/>
            <circle cx="6.5" cy="8" r="0.5" fill="#4fc3f7"/>
            <circle cx="8" cy="8" r="0.5" fill="#4fc3f7"/>
            <circle cx="9.5" cy="8" r="0.5" fill="#4fc3f7"/>
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
