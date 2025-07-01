
import { Brain, LayoutPanelLeft, FileText, MessageSquare } from 'lucide-react';

interface TopBarProps {
  sidebarVisible: boolean;
  chatVisible: boolean;
  onToggleSidebar: () => void;
  onToggleChat: () => void;
}

export function TopBar({ sidebarVisible, chatVisible, onToggleSidebar, onToggleChat }: TopBarProps) {
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
            <rect x="1" y="2" width="5" height="12" rx="1" fill={sidebarVisible ? "#cccccc" : "none"} stroke="#cccccc" strokeWidth="1"/>
          </svg>
        </button>
        
        {/* Middle panel toggle (always visible, just for UI consistency) */}
        <button 
          className="p-1.5 hover:bg-[#4c4c4c] rounded transition-colors opacity-50 cursor-default"
          title="Main Editor (Always Visible)"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="14" height="12" rx="1" stroke="#cccccc" strokeWidth="1" fill="none"/>
            <rect x="6" y="2" width="4" height="12" fill="#cccccc" stroke="#cccccc" strokeWidth="1"/>
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
            <rect x="10" y="2" width="5" height="12" rx="1" fill={chatVisible ? "#cccccc" : "none"} stroke="#cccccc" strokeWidth="1"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
