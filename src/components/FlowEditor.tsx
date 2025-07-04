
import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from './ui/scroll-area';

interface CellData {
  id: string;
  value: string;
}

interface FlowData {
  columns: string[];
  rows: CellData[][];
}

interface FlowEditorProps {
  documentId?: string;
  initialTitle?: string;
  initialData?: FlowData;
  onTitleChange?: (title: string) => void;
  onContentChange?: (content: FlowData) => void;
}

export function FlowEditor({ documentId, initialTitle = 'New Flow', initialData, onTitleChange, onContentChange }: FlowEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [flowData, setFlowData] = useState<FlowData>(() => {
    if (initialData && initialData.columns && initialData.rows) {
      return initialData;
    }
    return {
      columns: ['Column A', 'Column B', 'Column C', 'Column D', 'Column E'],
      rows: Array.from({ length: 20 }, (_, rowIndex) => 
        Array.from({ length: 5 }, (_, colIndex) => ({
          id: `${rowIndex}-${colIndex}`,
          value: ''
        }))
      )
    };
  });

  // Update flow data when content changes
  useEffect(() => {
    if (onContentChange) {
      onContentChange(flowData);
    }
  }, [flowData, onContentChange]);

  // Update title when it changes from props
  useEffect(() => {
    if (initialTitle !== title) {
      setTitle(initialTitle);
    }
  }, [initialTitle]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    onTitleChange?.(newTitle);
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    setFlowData(prev => {
      const newData = {
        ...prev,
        rows: prev.rows.map((row, rIdx) => 
          rIdx === rowIndex 
            ? row.map((cell, cIdx) => 
                cIdx === colIndex ? { ...cell, value } : cell
              )
            : row
        )
      };
      return newData;
    });
  };

  const updateColumnHeader = (colIndex: number, value: string) => {
    setFlowData(prev => ({
      ...prev,
      columns: prev.columns.map((col, idx) => 
        idx === colIndex ? value : col
      )
    }));
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden min-w-fit">
      {/* Title Section */}
      <div className="p-6 pb-4 flex-shrink-0">
        <div className="max-w-4xl">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-2xl font-light text-[#cccccc] mb-6 bg-transparent border-none outline-none w-full"
            placeholder="New Flow"
          />
        </div>
      </div>

      {/* Table Container with horizontal scroll */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-fit min-h-full">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-[#1e1e1e]">
            <div className="flex min-w-fit">
              {/* Row number header */}
              <div className="w-16 h-10 bg-[#1e1e1e] flex items-center justify-center flex-shrink-0 border border-[#2a2a2a]">
                <span className="text-xs text-[#6a6a6a] font-medium">#</span>
              </div>
              {/* Column headers */}
              {flowData.columns.map((column, colIndex) => (
                <div key={colIndex} className="min-w-32 w-32 flex-shrink-0 border border-[#2a2a2a]">
                  <input
                    type="text"
                    value={column}
                    onChange={(e) => updateColumnHeader(colIndex, e.target.value)}
                    onFocus={() => setActiveCell({ row: -1, col: colIndex })}
                    onBlur={() => setActiveCell(null)}
                    className={`w-full h-10 px-3 bg-transparent text-sm font-medium outline-none border-none transition-colors ${
                      activeCell?.col === colIndex ? 'text-[#ffffff]' : 'text-[#6a6a6a]'
                    } hover:bg-[#2a2a2a]/20`}
                    placeholder={`Column ${String.fromCharCode(65 + colIndex)}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="min-h-full min-w-fit">
            {flowData.rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex transition-colors min-w-fit">
                {/* Row number */}
                <div className="w-16 h-10 bg-[#1e1e1e] flex items-center justify-center sticky left-0 z-5 flex-shrink-0 border border-[#2a2a2a]">
                  <span className={`text-xs font-medium transition-colors ${
                    activeCell?.row === rowIndex ? 'text-[#ffffff]' : 'text-[#6a6a6a]'
                  }`}>{rowIndex + 1}</span>
                </div>
                {/* Row cells */}
                {row.map((cell, colIndex) => (
                  <div 
                    key={cell.id} 
                    className={`min-w-32 w-32 flex-shrink-0 relative border border-transparent ${
                      hoveredCell?.row === rowIndex && hoveredCell?.col === colIndex ? 'border-[#3c3c3c]' : 
                      activeCell?.row === rowIndex && activeCell?.col === colIndex ? 'border-[#4fc3f7]' : 
                      'border-[#2a2a2a]'
                    }`}
                    onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    <input
                      type="text"
                      value={cell.value}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })}
                      onBlur={() => setActiveCell(null)}
                      className="w-full h-10 px-3 bg-transparent text-sm text-[#cccccc] outline-none border-none transition-colors hover:bg-[#2a2a2a]/20"
                      placeholder=""
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
