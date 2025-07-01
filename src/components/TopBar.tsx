
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
            {/* File tree icon structure */}
            <path d="M2 2v12h12V2H2z" stroke="#4fc3f7" strokeWidth="1" fill="none"/>
            <path d="M2 2h3v12H2z" fill={sidebarVisible ? "#4fc3f7" : "none"} stroke="#4fc3f7" strokeWidth="1"/>
            <line x1="5" y1="2" x2="5" y2="14" stroke="#4fc3f7" strokeWidth="1"/>
            {/* Tree structure lines */}
            <line x1="2.5" y1="4" x2="4" y2="4" stroke="#4fc3f7" strokeWidth="0.8"/>
            <line x1="2.5" y1="6" x2="3.5" y2="6" stroke="#4fc3f7" strokeWidth="0.8"/>
            <line x1="3" y1="8" x2="4" y2="8" stroke="#4fc3f7" strokeWidth="0.8"/>
            <line x1="2.5" y1="10" x2="3.5" y2="10" stroke="#4fc3f7" strokeWidth="0.8"/>
            <line x1="3" y1="12" x2="4" y2="12" stroke="#4fc3f7" strokeWidth="0.8"/>
            {/* Small folder icons */}
            <rect x="2.2" y="3.7" width="0.6" height="0.6" fill="#4fc3f7"/>
            <rect x="2.7" y="7.7" width="0.6" height="0.6" fill="#4fc3f7"/>
          </svg>
        </button>
        
        {/* Chevron left (main editor) toggle */}
        <button 
          onClick={onToggleMainEditor}
          className="p-1.5 hover:bg-[#4c4c4c] rounded transition-colors"
          title="Toggle Main Editor"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M10 5 L7 8 L10 11" stroke="#4fc3f7" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
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

