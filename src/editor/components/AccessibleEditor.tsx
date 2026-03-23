/**
 * Accessible Editor Component - Fully accessible text editor with WCAG AA compliance
 * Integrates comprehensive accessibility features including ARIA attributes, screen reader support,
 * keyboard navigation, high contrast mode, and focus management
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SingleContentEditableEditor } from './SingleContentEditableEditor';
import { AccessibilityService } from '../services/accessibility-service';
import { DocumentModel } from '../models/document-model';
import { ToolbarStateService } from '../services/toolbar-state-service';
import { AccessibleToolbar } from './AccessibleToolbar';
import type { HighlightColor } from '@/types/document.types';

interface AccessibleEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export const AccessibleEditor: React.FC<AccessibleEditorProps> = ({
  initialContent = '',
  onChange,
  placeholder = 'Start typing...',
  className = ''
}) => {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<DocumentModel>(new DocumentModel());
  const accessibilityRef = useRef<AccessibilityService | null>(null);
  const toolbarStateRef = useRef<ToolbarStateService | null>(null);
  
  const [toolbarState, setToolbarState] = useState({
    isBold: false,
    isHighlighted: false,
    highlightColor: undefined as HighlightColor | undefined,
    isMinimized: false,
    currentHeadingLevel: 0
  });
  
  const [focusArea, setFocusArea] = useState<'editor' | 'toolbar' | null>('editor');
  const [isHighContrastMode, setIsHighContrastMode] = useState(false);

  // Initialize services
  useEffect(() => {
    if (!accessibilityRef.current) {
      accessibilityRef.current = new AccessibilityService(documentRef.current, {
        announceFormattingChanges: true,
        verboseAnnouncements: true
      });
      
      // Subscribe to accessibility state changes
      const unsubscribe = accessibilityRef.current.subscribe((state) => {
        setIsHighContrastMode(state.isHighContrastMode);
      });
      
      return () => {
        unsubscribe();
        accessibilityRef.current?.destroy();
      };
    }
  }, []);

  // Initialize toolbar state service
  useEffect(() => {
    if (!toolbarStateRef.current) {
      toolbarStateRef.current = new ToolbarStateService(documentRef.current);
      
      // Subscribe to toolbar state changes
      const unsubscribe = toolbarStateRef.current.subscribe((state) => {
        setToolbarState({
          isBold: state.isBold,
          isHighlighted: state.isHighlighted,
          highlightColor: state.highlightColor,
          isMinimized: state.isMinimized,
          currentHeadingLevel: 0 // TODO: Get from document model
        });
      });
      
      return unsubscribe;
    }
  }, []);

  // Handle selection changes
  const handleSelectionChange = useCallback((selection: any) => {
    if (toolbarStateRef.current && selection) {
      toolbarStateRef.current.updateSelection({
        start: selection.start,
        end: selection.end,
        isCollapsed: selection.isCollapsed
      });
    }
  }, []);

  // Handle toolbar state changes
  const handleToolbarStateChange = useCallback((state: any) => {
    // Already handled via subscription
  }, []);

  // Handle formatting actions with accessibility announcements
  const handleEmphasis = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.applyFormatting('bold');
      
      // Announce formatting change
      if (accessibilityRef.current) {
        const formatting = { type: 'bold' as const, start: 0, end: 0, id: '' };
        accessibilityRef.current.announceFormattingChange(
          formatting, 
          toolbarState.isBold ? 'removed' : 'applied'
        );
      }
    }
  }, [toolbarState.isBold]);

  const handleHighlight = useCallback((color?: string) => {
    if (editorRef.current) {
      editorRef.current.applyFormatting('highlight', color);
      
      // Announce formatting change
      if (accessibilityRef.current) {
        const formatting = { 
          type: 'highlight' as const, 
          color: color || 'yellow',
          start: 0, 
          end: 0, 
          id: '' 
        };
        accessibilityRef.current.announceFormattingChange(
          formatting,
          toolbarState.isHighlighted ? 'removed' : 'applied'
        );
      }
    }
  }, [toolbarState.isHighlighted]);

  const handleMinimize = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.applyFormatting('minimize');
      
      // Announce formatting change
      if (accessibilityRef.current) {
        const formatting = { type: 'minimize' as const, start: 0, end: 0, id: '' };
        accessibilityRef.current.announceFormattingChange(
          formatting,
          toolbarState.isMinimized ? 'removed' : 'applied'
        );
      }
    }
  }, [toolbarState.isMinimized]);

  const handleClear = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.clearFormatting();
      
      // Announce formatting cleared
      if (accessibilityRef.current) {
        accessibilityRef.current.announce('All formatting cleared', 'polite');
      }
    }
  }, []);

  const handleHeading = useCallback((level: number) => {
    if (editorRef.current) {
      const type = level === 0 ? 'paragraph' : `heading${level}`;
      editorRef.current.setBlockType(type);
      
      // Announce heading change
      if (accessibilityRef.current) {
        const message = level === 0 
          ? 'Changed to paragraph' 
          : `Changed to heading level ${level}`;
        accessibilityRef.current.announce(message, 'polite');
      }
    }
  }, []);

  // Handle keyboard navigation between toolbar and editor
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Tab to navigate between toolbar and editor
    if (e.key === 'Tab' && !e.shiftKey && focusArea === 'editor') {
      e.preventDefault();
      setFocusArea('toolbar');
      
      // Focus first toolbar button
      const toolbar = containerRef.current?.querySelector('[role="toolbar"]');
      const firstButton = toolbar?.querySelector('button[tabindex="0"]') as HTMLElement;
      firstButton?.focus();
      
      if (accessibilityRef.current) {
        accessibilityRef.current.updateFocus('toolbar');
        accessibilityRef.current.announce('Toolbar focused', 'polite');
      }
    }
    
    // Escape to return to editor
    if (e.key === 'Escape' && focusArea === 'toolbar') {
      e.preventDefault();
      setFocusArea('editor');
      
      // Focus editor
      const editor = containerRef.current?.querySelector('[role="textbox"]') as HTMLElement;
      editor?.focus();
      
      if (accessibilityRef.current) {
        accessibilityRef.current.updateFocus('editor');
        accessibilityRef.current.announce('Editor focused', 'polite');
      }
    }
  }, [focusArea]);

  // Initialize editor accessibility
  useEffect(() => {
    if (containerRef.current && accessibilityRef.current) {
      const editor = containerRef.current.querySelector('[role="textbox"]') as HTMLElement;
      const toolbar = containerRef.current.querySelector('[role="toolbar"]') as HTMLElement;
      
      if (editor) {
        accessibilityRef.current.initializeEditor(editor);
      }
      
      if (toolbar) {
        accessibilityRef.current.initializeToolbar(toolbar);
      }
    }
  }, []);

  return (
    <div className="accessible-editor-wrapper">
      {/* Skip links for keyboard navigation */}
      <div className="skip-links">
        <a href="#main-editor" className="skip-link">
          Skip to editor
        </a>
        <a href="#editor-toolbar" className="skip-link">
          Skip to toolbar
        </a>
      </div>
      
      <div 
        ref={containerRef}
        className={`accessible-editor-container ${className} ${isHighContrastMode ? 'high-contrast-mode' : ''}`}
        onKeyDown={handleKeyDown}
      >
        <AccessibleToolbar
          id="editor-toolbar"
          onEmphasis={handleEmphasis}
          onHighlight={handleHighlight}
          onMinimize={handleMinimize}
          onClear={handleClear}
          onHeading={handleHeading}
          isEmphasisActive={toolbarState.isBold}
          isHighlightActive={toolbarState.isHighlighted}
          highlightColor={toolbarState.highlightColor}
          isMinimized={toolbarState.isMinimized}
          currentHeadingLevel={toolbarState.currentHeadingLevel}
          accessibilityService={accessibilityRef.current}
        />
        
        <SingleContentEditableEditor
          ref={editorRef}
          initialContent={initialContent}
          onChange={onChange}
          onSelectionChange={handleSelectionChange}
          onToolbarStateChange={handleToolbarStateChange}
          placeholder={placeholder}
          className="accessible-editor"
        />
      </div>
      
      <style jsx>{`
        .skip-links {
          position: absolute;
          top: -40px;
          left: 0;
          z-index: 100;
        }
        
        .skip-link {
          position: absolute;
          left: -10000px;
          width: 1px;
          height: 1px;
          overflow: hidden;
          background: #4fc3f7;
          color: #ffffff;
          padding: 8px;
          text-decoration: none;
          border-radius: 4px;
        }
        
        .skip-link:focus {
          position: static;
          width: auto;
          height: auto;
        }
        
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
        
        .accessible-editor-container {
          position: relative;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        .accessible-editor-container:focus-within {
          outline: 2px solid #4fc3f7;
          outline-offset: 2px;
        }
        
        /* Focus indicators */
        .accessible-editor button:focus,
        .accessible-editor [role="textbox"]:focus {
          outline: 2px solid #4fc3f7;
          outline-offset: 2px;
        }
        
        /* High contrast mode handled by AccessibilityService */
      `}</style>
    </div>
  );
};