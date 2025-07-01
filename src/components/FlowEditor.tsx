
import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from './ui/scroll-area';

interface FlowEditorProps {
  initialTitle?: string;
  onTitleChange?: (title: string) => void;
}

interface CellData {
  id: string;
  value: string;
}

interface FlowData {
  columns: string[];
  rows: CellData[][];
}

export function FlowEditor({ initialTitle = 'New Flow', onTitleChange }: FlowEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [flowData, setFlowData] = useState<FlowData>(() => ({
    columns: ['Column A', 'Column B', 'Column C', 'Column D', 'Column E'],
    rows: Array.from({ length: 20 }, (_, rowIndex) => 
      Array.from({ length: 5 }, (_, colIndex) => ({
        id: `${rowIndex}-${colIndex}`,
        value: ''
      }))
    )
  }));

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    onTitleChange?.(newTitle);
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    setFlowData(prev => ({
      ...prev,
      rows: prev.rows.map((row, rIdx) => 
        rIdx === rowIndex 
          ? row.map((cell, cIdx) => 
              cIdx === colIndex ? { ...cell, value } : cell
            )
          : row
      )
    }));
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
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Title Section */}
      <div className="p-6 pb-4">
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

      {/* Table Container */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full relative">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-[#2d2d30] border-b border-[#3c3c3c]">
            <div className="flex">
              {/* Row number header */}
              <div className="w-16 h-10 bg-[#252526] border-r border-[#3c3c3c] flex items-center justify-center">
                <span className="text-xs text-[#6a6a6a] font-medium">#</span>
              </div>
              {/* Column headers */}
              {flowData.columns.map((column, colIndex) => (
                <div key={colIndex} className="min-w-32 flex-1 border-r border-[#3c3c3c] last:border-r-0">
                  <input
                    type="text"
                    value={column}
                    onChange={(e) => updateColumnHeader(colIndex, e.target.value)}
                    className="w-full h-10 px-3 bg-transparent text-sm text-[#cccccc] font-medium outline-none border-none"
                    placeholder={`Column ${String.fromCharCode(65 + colIndex)}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="h-[calc(100%-2.5rem)]">
            <div className="min-h-full">
              {flowData.rows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex border-b border-[#3c3c3c] hover:bg-[#252526] transition-colors">
                  {/* Row number */}
                  <div className="w-16 h-10 bg-[#252526] border-r border-[#3c3c3c] flex items-center justify-center sticky left-0 z-5">
                    <span className="text-xs text-[#6a6a6a] font-medium">{rowIndex + 1}</span>
                  </div>
                  {/* Row cells */}
                  {row.map((cell, colIndex) => (
                    <div key={cell.id} className="min-w-32 flex-1 border-r border-[#3c3c3c] last:border-r-0">
                      <input
                        type="text"
                        value={cell.value}
                        onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                        className="w-full h-10 px-3 bg-transparent text-sm text-[#cccccc] outline-none border-none focus:bg-[#383838] transition-colors"
                        placeholder=""
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
