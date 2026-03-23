/**
 * Accessible Toolbar Component - Fully accessible formatting toolbar with ARIA support
 * Implements roving tabindex, keyboard navigation, and screen reader announcements
 * Provides visual and auditory feedback for all formatting actions
 */

import React, { useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Bold,
  Highlighter, 
  Minimize2, 
  Eraser, 
  Heading,
  ChevronDown 
} from 'lucide-react';
import { AccessibilityService } from '../services/accessibility-service';
import type { HighlightColor } from '@/types/document.types';

interface AccessibleToolbarProps {
  id?: string;
  onEmphasis?: () => void;
  onHighlight?: (color: string) => void;
  onMinimize?: () => void;
  onClear?: () => void;
  onHeading?: (level: number) => void;
  isEmphasisActive?: boolean;
  isHighlightActive?: boolean;
  highlightColor?: HighlightColor;
  isMinimized?: boolean;
  currentHeadingLevel?: number;
  accessibilityService?: AccessibilityService | null;
}

const highlightColors = [
  { name: 'Yellow', hex: '#fef08a', iconColor: '#facc15' },
  { name: 'Blue', hex: '#bfdbfe', iconColor: '#3b82f6' },
  { name: 'Green', hex: '#bbf7d0', iconColor: '#22c55e' },
  { name: 'Pink', hex: '#fecaca', iconColor: '#ec4899' }
];

export const AccessibleToolbar: React.FC<AccessibleToolbarProps> = ({
  id = 'editor-toolbar',
  onEmphasis,
  onHighlight,
  onMinimize,
  onClear,
  onHeading,
  isEmphasisActive = false,
  isHighlightActive = false,
  highlightColor,
  isMinimized = false,
  currentHeadingLevel = 0,
  accessibilityService
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const selectedColor = highlightColors.find(c => c.name.toLowerCase() === highlightColor) || highlightColors[0];

  // Handle keyboard navigation within toolbar
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (accessibilityService && toolbarRef.current) {
      const handled = accessibilityService.handleToolbarNavigation(
        e.nativeEvent,
        e.currentTarget
      );
      
      if (handled) {
        e.preventDefault();
      }
    }
  }, [accessibilityService]);

  // Handle highlight color selection
  const handleHighlightClick = useCallback(() => {
    onHighlight?.(selectedColor.hex);
  }, [onHighlight, selectedColor]);

  const handleColorSelect = useCallback((color: typeof highlightColors[0]) => {
    onHighlight?.(color.hex);
  }, [onHighlight]);

  // Generate descriptive button labels
  const getButtonLabel = (
    action: string,
    isActive: boolean,
    shortcut: string
  ): string => {
    const state = isActive ? 'Remove' : 'Apply';
    return `${state} ${action}. Keyboard shortcut: ${shortcut}`;
  };

  return (
    <div 
      ref={toolbarRef}
      id={id}
      className="editor-toolbar"
      role="toolbar"
      aria-label="Text formatting toolbar"
      aria-orientation="horizontal"
    >
      <div className="toolbar-group" role="group" aria-label="Text formatting">
        {/* Bold/Emphasis Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onEmphasis}
          onKeyDown={handleKeyDown}
          className={`toolbar-button ${isEmphasisActive ? 'active' : ''}`}
          aria-label={getButtonLabel('bold formatting', isEmphasisActive, 'Control B')}
          aria-pressed={isEmphasisActive}
          data-action="bold"
        >
          <Bold className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only">Bold</span>
        </Button>

        {/* Highlight Button Group */}
        <div className="button-group" role="group" aria-label="Highlight formatting">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHighlightClick}
            onKeyDown={handleKeyDown}
            className={`toolbar-button group-start ${isHighlightActive ? 'active' : ''}`}
            aria-label={getButtonLabel(`highlight in ${selectedColor.name}`, isHighlightActive, 'Control H')}
            aria-pressed={isHighlightActive}
            data-action="highlight"
          >
            <Highlighter 
              className="w-4 h-4" 
              style={{ color: selectedColor.iconColor }}
              aria-hidden="true"
            />
            <span className="sr-only">Highlight</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onKeyDown={handleKeyDown}
                className="toolbar-button group-end dropdown-trigger"
                aria-label="Select highlight color"
                aria-haspopup="menu"
                aria-expanded="false"
              >
                <ChevronDown className="w-3 h-3" aria-hidden="true" />
                <span className="sr-only">Color options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="highlight-menu"
              aria-label="Highlight color options"
            >
              {highlightColors.map((color) => (
                <DropdownMenuItem
                  key={color.name}
                  onClick={() => handleColorSelect(color)}
                  className="color-option"
                  aria-label={`Highlight in ${color.name}`}
                >
                  <div 
                    className="color-swatch" 
                    style={{ backgroundColor: color.hex }}
                    aria-hidden="true"
                  />
                  <span>{color.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Minimize Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMinimize}
          onKeyDown={handleKeyDown}
          className={`toolbar-button ${isMinimized ? 'active' : ''}`}
          aria-label={getButtonLabel('minimize formatting', isMinimized, 'Control M')}
          aria-pressed={isMinimized}
          data-action="minimize"
        >
          <Minimize2 className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only">Minimize</span>
        </Button>

        {/* Clear Formatting Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          onKeyDown={handleKeyDown}
          className="toolbar-button"
          aria-label="Clear all formatting. Keyboard shortcut: Control Shift C"
          data-action="clear"
        >
          <Eraser className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only">Clear formatting</span>
        </Button>

        {/* Heading Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onHeading?.(currentHeadingLevel === 6 ? 0 : currentHeadingLevel + 1)}
          onKeyDown={handleKeyDown}
          className="toolbar-button"
          aria-label={`Current: ${currentHeadingLevel === 0 ? 'Paragraph' : `Heading ${currentHeadingLevel}`}. Click to change heading level`}
          data-action="heading"
        >
          <div className="flex items-center gap-1">
            <Heading className="w-4 h-4" aria-hidden="true" />
            <Badge 
              variant="secondary"
              className="heading-badge"
              aria-hidden="true"
            >
              {currentHeadingLevel || 'P'}
            </Badge>
          </div>
          <span className="sr-only">
            {currentHeadingLevel === 0 ? 'Paragraph' : `Heading ${currentHeadingLevel}`}
          </span>
        </Button>
      </div>

      <style jsx>{`
        .editor-toolbar {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          background-color: #2d2d30;
          border-bottom: 1px solid #3c3c3c;
        }

        .toolbar-group {
          display: flex;
          gap: 0.25rem;
        }

        .button-group {
          display: flex;
        }

        .toolbar-button {
          height: 2rem;
          padding: 0 0.75rem;
          color: #cccccc;
          border: 1px solid #3c3c3c;
          background-color: #2d2d30;
          transition: all 0.2s;
        }

        .toolbar-button:hover {
          background-color: #383838;
        }

        .toolbar-button:focus {
          outline: 2px solid #4fc3f7;
          outline-offset: 2px;
          z-index: 1;
        }

        .toolbar-button.active {
          background-color: #4fc3f7;
          color: #1e1e1e;
        }

        .group-start {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }

        .group-end {
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
          border-left: 0;
          padding: 0 0.375rem;
        }

        .dropdown-trigger {
          width: 1.5rem;
        }

        .color-swatch {
          width: 1rem;
          height: 1rem;
          border-radius: 50%;
          border: 1px solid #3c3c3c;
        }

        .color-option {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          color: #cccccc;
        }

        .color-option:hover,
        .color-option:focus {
          background-color: #383838;
        }

        .heading-badge {
          background-color: #4fc3f7;
          color: #1e1e1e;
          font-size: 0.625rem;
          padding: 0 0.25rem;
          height: 1rem;
          line-height: 1rem;
        }

        /* High contrast mode */
        .high-contrast-mode .toolbar-button {
          border-width: 2px;
          border-color: #ffffff;
        }

        .high-contrast-mode .toolbar-button:focus {
          outline-width: 3px;
          outline-color: #ffffff;
        }

        .high-contrast-mode .toolbar-button.active {
          background-color: #ffffff;
          color: #000000;
        }

        /* Screen reader only content */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        /* CSS for screen reader labels on buttons */
        .toolbar-button::before {
          content: attr(aria-label);
          position: absolute;
          left: -10000px;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .toolbar-button {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
};