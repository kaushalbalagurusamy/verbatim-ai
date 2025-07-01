
import { Brain, LayoutPanelLeft, MessageSquare, FileText } from 'lucide-react';

interface TopBarProps {
  onToggleSidebar: () => void;
  onToggleChat: () => void;
  sidebarVisible: boolean;
  chatVisible: boolean;
}

export function TopBar({ onToggleSidebar, onToggleChat, sidebarVisible, chatVisible }: TopBarProps) {
  return (
    <div className="h-12 bg-[#2d2d30] border-b border-[#3c3c3c] flex items-center justify-between px-4 flex-shrink-0">
      {/* Left side - LOGOS-AI branding */}
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-[#4fc3f7]" />
        <span className="text-sm font-medium text-[#cccccc]">LOGOS-AI</span>
      </div>
      
      {/* Right side - Panel toggle buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className={`p-2 rounded transition-colors ${
            sidebarVisible ? 'bg-[#4fc3f7] text-[#1e1e1e]' : 'hover:bg-[#383838] text-[#cccccc]'
          }`}
          title="Toggle Sidebar"
        >
          <LayoutPanelLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleChat}
          className={`p-2 rounded transition-colors ${
            chatVisible ? 'bg-[#4fc3f7] text-[#1e1e1e]' : 'hover:bg-[#383838] text-[#cccccc]'
          }`}
          title="Toggle Chat"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
