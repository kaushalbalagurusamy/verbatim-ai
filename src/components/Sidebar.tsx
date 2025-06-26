import { ChevronRight, ChevronDown, FileText, List, Clock, Brain, Search, File, Pen, Code, AudioWaveform } from 'lucide-react';
import { useState } from 'react';
import { FileTree } from './FileTree';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onActiveViewChange?: (view: 'document' | 'pen' | 'source' | 'recordings' | null) => void;
}

export function Sidebar({
  collapsed,
  onActiveViewChange
}: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState({
    logos: true,
    notepads: true,
    outline: true,
    timeline: true
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'document' | 'pen' | 'source' | 'recordings' | null>(null);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleIconClick = (view: 'document' | 'pen' | 'source' | 'recordings') => {
    const newView = activeView === view ? null : view;
    setActiveView(newView);
    onActiveViewChange?.(newView);
  };

  if (collapsed) {
    return (
      <div className="w-12 bg-[#252526] border-r border-[#3c3c3c] flex flex-col">
        <div className="p-2">
          <Brain className="w-6 h-6 text-[#cccccc]" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-[#252526] border-r border-[#3c3c3c] flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-[#4fc3f7]" />
          <span className="text-sm font-medium text-[#cccccc]">LOGOS-AI</span>
        </div>
      </div>

      {/* Icon Bar */}
      <div className="h-10 bg-[#2d2d30] border-b border-[#3c3c3c] flex items-center justify-center gap-3">
        <button 
          onClick={() => handleIconClick('document')}
          className={`p-2 rounded transition-colors ${
            activeView === 'document' ? 'bg-[#4fc3f7] text-[#1e1e1e]' : 'hover:bg-[#383838] text-[#cccccc]'
          }`}
        >
          <File className="w-4 h-4" />
        </button>
        <button 
          onClick={() => handleIconClick('pen')}
          className={`p-2 rounded transition-colors ${
            activeView === 'pen' ? 'bg-[#4fc3f7] text-[#1e1e1e]' : 'hover:bg-[#383838] text-[#cccccc]'
          }`}
        >
          <Pen className="w-4 h-4" />
        </button>
        <button 
          onClick={() => handleIconClick('source')}
          className={`p-2 rounded transition-colors ${
            activeView === 'source' ? 'bg-[#4fc3f7] text-[#1e1e1e]' : 'hover:bg-[#383838] text-[#cccccc]'
          }`}
        >
          <Code className="w-4 h-4" />
        </button>
        <button 
          onClick={() => handleIconClick('recordings')}
          className={`p-2 rounded transition-colors ${
            activeView === 'recordings' ? 'bg-[#4fc3f7] text-[#1e1e1e]' : 'hover:bg-[#383838] text-[#cccccc]'
          }`}
        >
          <AudioWaveform className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-[#3c3c3c]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6a6a6a]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full bg-[#3c3c3c] text-[#cccccc] text-sm rounded px-9 py-2 outline-none focus:bg-[#404040] placeholder-[#6a6a6a]"
          />
        </div>
      </div>

      {/* File Tree or Original Navigation */}
      {activeView ? (
        <FileTree mode={activeView} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* LOGOS-AI Section */}
          <div className="border-b border-[#3c3c3c]">
            
          </div>

          {/* NOTEPADS Section */}
          <div className="border-b border-[#3c3c3c]">
            
            {expandedSections.notepads && (
              <div className="ml-4">
                
              </div>
            )}
          </div>

          {/* OUTLINE Section */}
          <div className="border-b border-[#3c3c3c]">
            
          </div>

          {/* TIMELINE Section */}
          <div>
            
          </div>
        </div>
      )}
    </div>
  );
}
