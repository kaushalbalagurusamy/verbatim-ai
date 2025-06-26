import { MessageSquare, Settings, Minimize2, Plus, Send, Paperclip, Mic, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

interface ChatPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function ChatPanel({ collapsed, onToggle }: ChatPanelProps) {
  const [message, setMessage] = useState('');

  if (collapsed) {
    return (
      <div className="w-12 bg-[#252526] border-l border-[#3c3c3c] flex flex-col items-center py-2">
        <button
          onClick={onToggle}
          className="p-2 hover:bg-[#2a2d2e] rounded"
        >
          <MessageSquare className="w-5 h-5 text-[#cccccc]" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-[#252526] border-l border-[#3c3c3c] flex flex-col">
      {/* Chat Header */}
      <div className="h-12 bg-[#2d2d30] border-b border-[#3c3c3c] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#4fc3f7]" />
          <span className="text-sm font-medium text-[#cccccc]">New Chat</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-[#4c4c4c] rounded">
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

      {/* Chat Content */}
      <div className="flex-1 p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-[#4fc3f7] rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-white">@</span>
          </div>
          <span className="text-sm text-[#cccccc]">New Notepad</span>
          <span className="text-xs text-[#6a6a6a]">Notepad</span>
        </div>
        
        <div className="text-sm text-[#6a6a6a] mb-6">
          Plan, search, build anything
        </div>

        {/* Agent Info */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-[#6a6a6a]">∞ Agent</span>
          <span className="text-xs text-[#6a6a6a]">x1</span>
          <span className="text-xs text-[#6a6a6a]">🤖 gemini...</span>
          <span className="text-xs text-[#6a6a6a]">📄</span>
          <span className="text-xs text-[#6a6a6a]">🔗</span>
        </div>
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
              onChange={(e) => setMessage(e.target.value)}
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
      </div>
    </div>
  );
}
