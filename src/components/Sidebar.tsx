import { ChevronRight, ChevronDown, FileText, List, Clock, Brain, Search, File, Pen, Code, AudioWaveform, Telescope, Table, MoreHorizontal } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { FileTree } from './FileTree';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onActiveViewChange?: (view: 'document' | 'research' | 'pen' | 'source' | 'recordings' | 'flow' | null) => void;
}

export function Sidebar({
  collapsed,
  onActiveViewChange
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'document' | 'research' | 'pen' | 'source' | 'recordings' | 'flow' | null>('document');
  const [showDropdown, setShowDropdown] = useState(false);
  const [visibleIcons, setVisibleIcons] = useState<string[]>([]);
  const [hiddenIcons, setHiddenIcons] = useState<string[]>([]);
  const iconBarRef = useRef<HTMLDivElement>(null);

  const icons = [
    { key: 'flow', component: Table, view: 'flow' as const },
    { key: 'document', component: File, view: 'document' as const },
    { key: 'research', component: Telescope, view: 'research' as const },
    { key: 'pen', component: Pen, view: 'pen' as const },
    { key: 'source', component: Code, view: 'source' as const },
    { key: 'recordings', component: AudioWaveform, view: 'recordings' as const },
  ];

  const handleIconClick = (view: 'document' | 'research' | 'pen' | 'source' | 'recordings' | 'flow') => {
    const newView = activeView === view ? null : view;
    setActiveView(newView);
    onActiveViewChange?.(newView);
  };

  // Calculate which icons to show based on available width
  useEffect(() => {
    const calculateVisibleIcons = () => {
      if (!iconBarRef.current) return;
      
      const containerWidth = iconBarRef.current.offsetWidth;
      const iconWidth = 40; // approximate width of each icon button
      const dropdownWidth = 40; // width for dropdown button
      const padding = 24; // total padding
      
      const availableWidth = containerWidth - padding;
      const maxVisibleIcons = Math.floor((availableWidth - dropdownWidth) / iconWidth);
      
      if (maxVisibleIcons >= icons.length) {
        setVisibleIcons(icons.map(icon => icon.key));
        setHiddenIcons([]);
      } else {
        setVisibleIcons(icons.slice(0, maxVisibleIcons).map(icon => icon.key));
        setHiddenIcons(icons.slice(maxVisibleIcons).map(icon => icon.key));
      }
    };

    calculateVisibleIcons();
    
    const resizeObserver = new ResizeObserver(calculateVisibleIcons);
    if (iconBarRef.current) {
      resizeObserver.observe(iconBarRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, []);

  if (collapsed) {
    return (
      <div className="w-12 bg-[#252526] border-r border-[#3c3c3c] flex flex-col h-full">
        <div className="p-2">
          <Brain className="w-6 h-6 text-[#cccccc]" />
        </div>
      </div>
    );
  }

  return (
    <div data-testid="sidebar" className="bg-[#252526] border-r border-[#3c3c3c] flex flex-col h-full overflow-hidden">
      {/* Icon Bar */}
      <div ref={iconBarRef} className="h-10 bg-[#2d2d30] border-b border-[#3c3c3c] flex items-center justify-center gap-3 px-3 flex-shrink-0 relative">
        {visibleIcons.map(iconKey => {
          const icon = icons.find(i => i.key === iconKey);
          if (!icon) return null;
          const IconComponent = icon.component;
          return (
            <button 
              key={iconKey}
              onClick={() => handleIconClick(icon.view)}
              className={`p-2 rounded transition-colors ${
                activeView === icon.view ? 'bg-[#4fc3f7] text-[#1e1e1e]' : 'hover:bg-[#383838] text-[#cccccc]'
              }`}
            >
              <IconComponent className="w-4 h-4" />
            </button>
          );
        })}
        
        {hiddenIcons.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 rounded transition-colors hover:bg-[#383838] text-[#cccccc]"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            
            {showDropdown && (
              <div className="absolute top-full right-0 mt-1 bg-[#2d2d30] border border-[#3c3c3c] rounded shadow-lg z-50">
                {hiddenIcons.map(iconKey => {
                  const icon = icons.find(i => i.key === iconKey);
                  if (!icon) return null;
                  const IconComponent = icon.component;
                  return (
                    <button
                      key={iconKey}
                      onClick={() => {
                        handleIconClick(icon.view);
                        setShowDropdown(false);
                      }}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-left transition-colors ${
                        activeView === icon.view ? 'bg-[#4fc3f7] text-[#1e1e1e]' : 'hover:bg-[#383838] text-[#cccccc]'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-[#3c3c3c] flex-shrink-0">
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

      {/* File Tree - Scrollable */}
      <div className="flex-1 overflow-hidden">
        <FileTree mode={activeView || 'document'} />
      </div>
    </div>
  );
}
