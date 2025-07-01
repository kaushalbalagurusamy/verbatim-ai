
import { Brain } from 'lucide-react';

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
      
      {/* Right side - Panel toggle buttons */}
      <div className="flex items-center gap-1">
        {/* Left panel toggle */}
        <button 
          onClick={onToggleSidebar}
          className="p-1.5 hover:bg-[#4c4c4c] rounded transition-colors"
          title="Toggle Sidebar"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="14" height="12" rx="1" stroke="#cccccc" strokeWidth="1" fill="none"/>
            <rect x="1" y="2" width="4" height="12" rx="1" fill={sidebarVisible ? "#cccccc" : "none"} stroke="#cccccc" strokeWidth="1"/>
            <line x1="6" y1="2" x2="6" y2="14" stroke="#cccccc" strokeWidth="1"/>
            <line x1="10" y1="2" x2="10" y2="14" stroke="#cccccc" strokeWidth="1"/>
          </svg>
        </button>
        
        {/* Middle panel toggle */}
        <button 
          onClick={onToggleMainEditor}
          className="p-1.5 hover:bg-[#4c4c4c] rounded transition-colors"
          title="Toggle Main Editor"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="14" height="12" rx="1" stroke="#cccccc" strokeWidth="1" fill="none"/>
            <rect x="6" y="2" width="4" height="12" fill={mainEditorVisible ? "#cccccc" : "none"} stroke="#cccccc" strokeWidth="1"/>
            <line x1="5" y1="2" x2="5" y2="14" stroke="#cccccc" strokeWidth="1"/>
            <line x1="11" y1="2" x2="11" y2="14" stroke="#cccccc" strokeWidth="1"/>
          </svg>
        </button>
        
        {/* Right panel toggle */}
        <button 
          onClick={onToggleChat}
          className="p-1.5 hover:bg-[#4c4c4c] rounded transition-colors"
          title="Toggle Chat"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="14" height="12" rx="1" stroke="#cccccc" strokeWidth="1" fill="none"/>
            <rect x="11" y="2" width="4" height="12" rx="1" fill={chatVisible ? "#cccccc" : "none"} stroke="#cccccc" strokeWidth="1"/>
            <line x1="6" y1="2" x2="6" y2="14" stroke="#cccccc" strokeWidth="1"/>
            <line x1="10" y1="2" x2="10" y2="14" stroke="#cccccc" strokeWidth="1"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
