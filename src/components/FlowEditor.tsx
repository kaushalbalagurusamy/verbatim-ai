
import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from './ui/scroll-area';

interface CellData {
  id: string;
  value: string;
}

interface FlowData {
  columns: string[];
  columnWidths?: number[];
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
  const [resizingColumn, setResizingColumn] = useState<number | null>(null);
  const [flowData, setFlowData] = useState<FlowData>(() => {
    if (initialData && initialData.columns && initialData.rows) {
      return {
        ...initialData,
        columnWidths: initialData.columnWidths || initialData.columns.map(() => 128)
      };
    }
    return {
      columns: ['Column A', 'Column B', 'Column C', 'Column D', 'Column E'],
      columnWidths: [128, 128, 128, 128, 128],
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

  // Auto-resize textareas on mount and data change
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach((textarea) => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
  }, [flowData]);

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

  const updateColumnWidth = (colIndex: number, width: number) => {
    setFlowData(prev => ({
      ...prev,
      columnWidths: prev.columnWidths?.map((w, idx) => 
        idx === colIndex ? Math.max(80, width) : w
      ) || []
    }));
  };

  useEffect(() => {
    if (resizingColumn !== null) {
      const handleMouseMove = (e: MouseEvent) => {
        const headerElement = document.querySelector(`[data-column-index="${resizingColumn}"]`);
        if (headerElement) {
          const rect = headerElement.getBoundingClientRect();
          const newWidth = e.clientX - rect.left;
          updateColumnWidth(resizingColumn, newWidth);
        }
      };

      const handleMouseUp = () => {
        setResizingColumn(null);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizingColumn, updateColumnWidth]);

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
              <div className="w-8 h-[40px] bg-[#1e1e1e] flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-[#6a6a6a] font-mono">#</span>
              </div>
              {/* Column headers */}
              {flowData.columns.map((column, colIndex) => (
                <div 
                  key={colIndex} 
                  data-column-index={colIndex}
                  className="relative flex-shrink-0"
                  style={{ width: `${flowData.columnWidths?.[colIndex] || 128}px` }}
                >
                  <input
                    type="text"
                    value={column}
                    onChange={(e) => updateColumnHeader(colIndex, e.target.value)}
                    onFocus={() => setActiveCell({ row: -1, col: colIndex })}
                    onBlur={() => setActiveCell(null)}
                    className={`w-full h-[40px] px-3 bg-transparent text-sm font-medium outline-none border-none transition-colors ${
                      activeCell?.col === colIndex ? 'text-[#ffffff]' : 'text-[#6a6a6a]'
                    } hover:bg-[#2a2a2a]/20`}
                    placeholder={`Column ${String.fromCharCode(65 + colIndex)}`}
                  />
                  {/* Resize handle */}
                  <div
                    className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-[#4fc3f7] transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setResizingColumn(colIndex);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="min-h-full min-w-fit">
            {flowData.rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex transition-colors min-w-fit items-stretch">
                {/* Row number */}
                <div className="w-8 min-h-[40px] bg-[#1e1e1e] flex items-center justify-center sticky left-0 z-5 flex-shrink-0">
                  <span className={`text-xs font-mono transition-colors ${
                    activeCell?.row === rowIndex ? 'text-[#ffffff]' : 'text-[#6a6a6a]'
                  }`}>{rowIndex + 1}</span>
                </div>
                {/* Row cells */}
                {row.map((cell, colIndex) => (
                  <div 
                    key={cell.id} 
                    className={`flex-shrink-0 relative border flex items-stretch ${
                      hoveredCell?.row === rowIndex && hoveredCell?.col === colIndex ? 'border-[#4fc3f7]' : 
                      activeCell?.row === rowIndex && activeCell?.col === colIndex ? 'border-[#4fc3f7]' : 
                      'border-transparent'
                    }`}
                    style={{ width: `${flowData.columnWidths?.[colIndex] || 128}px` }}
                    onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    <textarea
                      value={cell.value}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })}
                      onBlur={() => setActiveCell(null)}
                      className="w-full min-h-[40px] px-3 py-2 bg-transparent text-sm text-[#cccccc] outline-none border-none transition-colors hover:bg-[#2a2a2a]/20 resize-none overflow-hidden whitespace-pre-wrap break-words"
                      placeholder=""
                      style={{ height: 'auto' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                      }}
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
