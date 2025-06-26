
import { ChevronRight, ChevronDown, FileText, List, Clock, Brain, Search, File, Pen, Code } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({
  collapsed
}: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState({
    logos: true,
    notepads: true,
    outline: true,
    timeline: true
  });

  const [searchQuery, setSearchQuery] = useState('');

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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
      <div className="h-10 bg-[#2d2d30] border-b border-[#3c3c3c] flex items-center justify-center gap-4">
        <button className="p-2 hover:bg-[#383838] rounded transition-colors">
          <File className="w-4 h-4 text-[#cccccc]" />
        </button>
        <button className="p-2 hover:bg-[#383838] rounded transition-colors">
          <Pen className="w-4 h-4 text-[#cccccc]" />
        </button>
        <button className="p-2 hover:bg-[#383838] rounded transition-colors">
          <Code className="w-4 h-4 text-[#cccccc]" />
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

      {/* Navigation Sections */}
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
    </div>
  );
}
