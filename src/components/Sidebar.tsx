
import { ChevronRight, ChevronDown, FileText, List, Clock, Brain } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState({
    logos: true,
    notepads: true,
    outline: true,
    timeline: true
  });

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

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* LOGOS-AI Section */}
        <div className="border-b border-[#3c3c3c]">
          <button
            onClick={() => toggleSection('logos')}
            className="w-full flex items-center gap-2 p-2 hover:bg-[#2a2d2e] text-xs font-semibold text-[#cccccc] uppercase"
          >
            {expandedSections.logos ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <Brain className="w-3 h-3" />
            LOGOS-AI
          </button>
        </div>

        {/* NOTEPADS Section */}
        <div className="border-b border-[#3c3c3c]">
          <button
            onClick={() => toggleSection('notepads')}
            className="w-full flex items-center gap-2 p-2 hover:bg-[#2a2d2e] text-xs font-semibold text-[#cccccc] uppercase"
          >
            {expandedSections.notepads ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <FileText className="w-3 h-3" />
            NOTEPADS
          </button>
          {expandedSections.notepads && (
            <div className="ml-4">
              <div className="py-1 px-2 text-xs text-[#cccccc] hover:bg-[#2a2d2e] cursor-pointer">
                New Notepad
              </div>
            </div>
          )}
        </div>

        {/* OUTLINE Section */}
        <div className="border-b border-[#3c3c3c]">
          <button
            onClick={() => toggleSection('outline')}
            className="w-full flex items-center gap-2 p-2 hover:bg-[#2a2d2e] text-xs font-semibold text-[#cccccc] uppercase"
          >
            {expandedSections.outline ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <List className="w-3 h-3" />
            OUTLINE
          </button>
        </div>

        {/* TIMELINE Section */}
        <div>
          <button
            onClick={() => toggleSection('timeline')}
            className="w-full flex items-center gap-2 p-2 hover:bg-[#2a2d2e] text-xs font-semibold text-[#cccccc] uppercase"
          >
            {expandedSections.timeline ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <Clock className="w-3 h-3" />
            TIMELINE
          </button>
        </div>
      </div>
    </div>
  );
}
