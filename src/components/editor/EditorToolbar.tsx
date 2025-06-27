
/**
 * Text editor toolbar component for competitive debate platform
 * Features emphasis, highlight, minimize, clear, and heading buttons
 * Matches VSCode dark theme design system
 */
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Bold,
  Highlighter, 
  Minimize2, 
  Eraser, 
  Heading,
  ChevronDown 
} from 'lucide-react';

interface HighlightColor {
  name: string;
  class: string;
  hex: string;
}

interface EditorToolbarProps {
  onEmphasis?: () => void;
  onHighlight?: (color: string) => void;
  onMinimize?: () => void;
  onClear?: () => void;
  onHeading?: (level: number) => void;
  isEmphasisActive?: boolean;
  isHighlightActive?: boolean;
  currentHeadingLevel?: number;
}

const highlightColors: HighlightColor[] = [
  { name: 'Yellow', class: 'bg-yellow-200', hex: '#fef08a' },
  { name: 'Blue', class: 'bg-blue-200', hex: '#bfdbfe' },
  { name: 'Green', class: 'bg-green-200', hex: '#bbf7d0' },
  { name: 'Pink', class: 'bg-pink-200', hex: '#fecaca' }
];

export function EditorToolbar({
  onEmphasis,
  onHighlight,
  onMinimize,
  onClear,
  onHeading,
  isEmphasisActive = false,
  isHighlightActive = false,
  currentHeadingLevel = 1
}: EditorToolbarProps) {
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<HighlightColor>(highlightColors[0]);

  const handleHighlight = () => {
    onHighlight?.(selectedHighlightColor.hex);
  };

  const handleColorSelect = (color: HighlightColor) => {
    setSelectedHighlightColor(color);
    onHighlight?.(color.hex);
  };

  const handleHeadingClick = () => {
    const nextLevel = currentHeadingLevel >= 6 ? 1 : currentHeadingLevel + 1;
    onHeading?.(nextLevel);
  };

  return (
    <div className="flex items-center gap-1 p-2 bg-[#2d2d30] border-b border-[#3c3c3c]">
      {/* Emphasis Button with Underlined Bold Icon */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEmphasis}
            className={`h-8 px-3 text-[#cccccc] border border-[#3c3c3c] hover:bg-[#383838] focus:ring-2 focus:ring-[#4fc3f7] ${
              isEmphasisActive ? 'bg-[#4fc3f7] text-[#1e1e1e]' : 'bg-[#2d2d30]'
            }`}
          >
            <Bold className="w-4 h-4 underline" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Emphasis (Ctrl+B)</p>
        </TooltipContent>
      </Tooltip>

      {/* Highlight Button with Color Picker */}
      <div className="flex">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleHighlight}
              className={`h-8 px-3 text-[#cccccc] border border-[#3c3c3c] border-r-0 rounded-r-none hover:bg-[#383838] focus:ring-2 focus:ring-[#4fc3f7] ${
                isHighlightActive ? 'bg-[#4fc3f7] text-[#1e1e1e]' : 'bg-[#2d2d30]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Highlighter className="w-4 h-4" />
                <div 
                  className={`w-2 h-2 rounded-full ${selectedHighlightColor.class} border border-[#3c3c3c]`}
                />
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Highlight Evidence (Ctrl+H)</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-6 px-1 text-[#cccccc] border border-[#3c3c3c] border-l-0 rounded-l-none bg-[#2d2d30] hover:bg-[#383838] focus:ring-2 focus:ring-[#4fc3f7]"
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#252526] border border-[#3c3c3c]">
            {highlightColors.map((color) => (
              <DropdownMenuItem
                key={color.name}
                onClick={() => handleColorSelect(color)}
                className="flex items-center gap-2 text-[#cccccc] hover:bg-[#383838] focus:bg-[#383838]"
              >
                <div className={`w-4 h-4 rounded-full ${color.class} border border-[#3c3c3c]`} />
                <span className="text-sm">{color.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-[#3c3c3c] mx-1" />

      {/* Minimize Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMinimize}
            className="h-8 px-3 text-[#cccccc] border border-[#3c3c3c] bg-[#2d2d30] hover:bg-[#383838] focus:ring-2 focus:ring-[#4fc3f7]"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Minimize Formatting (Ctrl+M)</p>
        </TooltipContent>
      </Tooltip>

      {/* Clear Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 px-3 text-[#cccccc] border border-[#3c3c3c] bg-[#2d2d30] hover:bg-[#383838] focus:ring-2 focus:ring-[#4fc3f7]"
          >
            <Eraser className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Clear Formatting (Ctrl+Shift+C)</p>
        </TooltipContent>
      </Tooltip>

      {/* Separator */}
      <div className="w-px h-6 bg-[#3c3c3c] mx-1" />

      {/* Heading Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHeadingClick}
            className="h-8 px-3 text-[#cccccc] border border-[#3c3c3c] bg-[#2d2d30] hover:bg-[#383838] focus:ring-2 focus:ring-[#4fc3f7] relative"
          >
            <div className="flex items-center gap-1">
              <Heading className="w-4 h-4" />
              <Badge 
                variant="secondary"
                className="bg-[#4fc3f7] text-[#1e1e1e] text-xs px-1 h-4"
              >
                {currentHeadingLevel}
              </Badge>
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Heading Level (Ctrl+{currentHeadingLevel})</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
