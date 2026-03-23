/**
 * Accessible Editor Integration - Full implementation with all accessibility features
 * Demonstrates WCAG AA compliant editor with screen reader support, keyboard navigation,
 * high contrast mode, and comprehensive ARIA attributes
 */

import React, { useRef, useState, useEffect } from 'react';
import { SingleContentEditableEditor } from '../components/SingleContentEditableEditor';
import { AccessibleToolbar } from '../components/AccessibleToolbar';
import { AccessibilityService } from '../services/accessibility-service';
import { DocumentModel } from '../models/document-model';
import type { HighlightColor } from '@/types/document.types';

interface AccessibleEditorIntegrationProps {
  initialContent?: string;
  onChange?: (content: string) => void;
}

export function AccessibleEditorIntegration({
  initialContent = '',
  onChange
}: AccessibleEditorIntegrationProps) {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<DocumentModel>(new DocumentModel());
  const accessibilityRef = useRef<AccessibilityService | null>(null);
  
  const [toolbarState, setToolbarState] = useState({
    isBold: false,
    isHighlighted: false,
    highlightColor: undefined as HighlightColor | undefined,
    isMinimized: false,
    currentHeadingLevel: 0
  });
  
  const [focusArea, setFocusArea] = useState<'editor' | 'toolbar'>('editor');
  const [accessibilityState, setAccessibilityState] = useState({
    isHighContrastMode: false,
    isReducedMotion: false,
    lastAnnouncement: ''
  });

  // Initialize accessibility service
  useEffect(() => {
    if (!accessibilityRef.current) {
      accessibilityRef.current = new AccessibilityService(documentRef.current, {
        announceFormattingChanges: true,
        verboseAnnouncements: true
      });
      
      // Subscribe to accessibility state changes
      const unsubscribe = accessibilityRef.current.subscribe((state) => {
        setAccessibilityState({
          isHighContrastMode: state.isHighContrastMode,
          isReducedMotion: state.isReducedMotion,
          lastAnnouncement: state.lastAnnouncement
        });
      });
      
      return () => {
        unsubscribe();
        accessibilityRef.current?.destroy();
      };
    }
  }, []);

  // Initialize editor and toolbar accessibility
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

  // Handle toolbar state changes
  const handleToolbarStateChange = (state: any) => {
    setToolbarState({
      isBold: state.isBold,
      isHighlighted: state.isHighlighted,
      highlightColor: state.highlightColor,
      isMinimized: state.isMinimized,
      currentHeadingLevel: 0 // TODO: Get from document model
    });
  };

  // Formatting actions with accessibility announcements
  const handleEmphasis = () => {
    if (editorRef.current) {
      editorRef.current.applyFormatting('bold');
      
      // Announce formatting change
      if (accessibilityRef.current) {
        const action = toolbarState.isBold ? 'removed' : 'applied';
        accessibilityRef.current.announce(`Bold ${action}`, 'polite');
      }
    }
  };

  const handleHighlight = (color?: string) => {
    if (editorRef.current) {
      editorRef.current.applyFormatting('highlight', color);
      
      // Announce formatting change
      if (accessibilityRef.current) {
        const colorName = color ? getColorName(color) : 'yellow';
        const action = toolbarState.isHighlighted ? 'removed' : 'applied';
        accessibilityRef.current.announce(`Highlight ${action} in ${colorName}`, 'polite');
      }
    }
  };

  const handleMinimize = () => {
    if (editorRef.current) {
      editorRef.current.applyFormatting('minimize');
      
      // Announce formatting change
      if (accessibilityRef.current) {
        const action = toolbarState.isMinimized ? 'removed' : 'applied';
        accessibilityRef.current.announce(`Minimize ${action}`, 'polite');
      }
    }
  };

  const handleClear = () => {
    if (editorRef.current) {
      editorRef.current.clearFormatting();
      
      // Announce formatting cleared
      if (accessibilityRef.current) {
        accessibilityRef.current.announce('All formatting cleared', 'polite');
      }
    }
  };

  const handleHeading = (level: number) => {
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
  };

  // Keyboard navigation between toolbar and editor
  const handleKeyDown = (e: React.KeyboardEvent) => {
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
    
    // Shift+Tab to navigate back
    if (e.key === 'Tab' && e.shiftKey && focusArea === 'toolbar') {
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
    
    // Escape to return to editor from toolbar
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
    
    // F6 to cycle between regions
    if (e.key === 'F6') {
      e.preventDefault();
      const nextFocus = focusArea === 'editor' ? 'toolbar' : 'editor';
      setFocusArea(nextFocus);
      
      if (nextFocus === 'toolbar') {
        const toolbar = containerRef.current?.querySelector('[role="toolbar"]');
        const firstButton = toolbar?.querySelector('button[tabindex="0"]') as HTMLElement;
        firstButton?.focus();
      } else {
        const editor = containerRef.current?.querySelector('[role="textbox"]') as HTMLElement;
        editor?.focus();
      }
      
      if (accessibilityRef.current) {
        accessibilityRef.current.updateFocus(nextFocus);
        accessibilityRef.current.announce(`${nextFocus} focused`, 'polite');
      }
    }
  };

  // Helper function to get color name from hex
  const getColorName = (hex: string): string => {
    const colorMap: Record<string, string> = {
      '#fef08a': 'yellow',
      '#bfdbfe': 'blue',
      '#bbf7d0': 'green',
      '#fecaca': 'pink'
    };
    return colorMap[hex] || 'yellow';
  };

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
      
      {/* Accessibility status bar (visible only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="accessibility-status" aria-live="polite" aria-atomic="true">
          <span>High Contrast: {accessibilityState.isHighContrastMode ? 'ON' : 'OFF'}</span>
          <span> | </span>
          <span>Reduced Motion: {accessibilityState.isReducedMotion ? 'ON' : 'OFF'}</span>
          {accessibilityState.lastAnnouncement && (
            <>
              <span> | </span>
              <span>Last announcement: "{accessibilityState.lastAnnouncement}"</span>
            </>
          )}
        </div>
      )}
      
      <div 
        ref={containerRef}
        className={`editor-container ${accessibilityState.isHighContrastMode ? 'high-contrast-mode' : ''}`}
        onKeyDown={handleKeyDown}
        role="application"
        aria-label="Document editor application"
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
        
        <div className="editor-wrapper">
          <SingleContentEditableEditor
            ref={editorRef}
            initialContent={initialContent}
            onChange={onChange}
            onToolbarStateChange={handleToolbarStateChange}
            placeholder="Start typing..."
            className="accessible-editor"
          />
        </div>
      </div>
      
      <style jsx>{`
        .accessible-editor-wrapper {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
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
          padding: 8px 16px;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .skip-link:focus {
          position: fixed;
          top: 10px;
          left: 10px;
          width: auto;
          height: auto;
          z-index: 1000;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        .accessibility-status {
          background: #252526;
          color: #6a6a6a;
          padding: 4px 12px;
          font-size: 12px;
          border-bottom: 1px solid #3c3c3c;
          font-family: monospace;
        }
        
        .editor-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #1e1e1e;
        }
        
        .editor-wrapper {
          flex: 1;
          overflow: auto;
          padding: 20px;
        }
        
        .accessible-editor {
          max-width: 800px;
          margin: 0 auto;
        }
        
        /* Focus indicators */
        .editor-container:focus-within {
          outline: 2px solid #4fc3f7;
          outline-offset: -2px;
        }
        
        /* High contrast mode styles */
        .high-contrast-mode {
          filter: contrast(1.2);
        }
        
        .high-contrast-mode .editor-content {
          background-color: #000000 !important;
          color: #ffffff !important;
          border: 2px solid #ffffff !important;
        }
        
        .high-contrast-mode .fmt-bold {
          font-weight: 900 !important;
          text-decoration: underline !important;
        }
        
        .high-contrast-mode .fmt-highlight {
          background-color: #ffff00 !important;
          color: #000000 !important;
          outline: 2px solid #ffffff !important;
        }
        
        .high-contrast-mode .fmt-minimize {
          opacity: 1 !important;
          background-color: #404040 !important;
          outline: 1px dashed #ffffff !important;
        }
        
        .high-contrast-mode button:focus {
          outline: 3px solid #ffffff !important;
          outline-offset: 2px !important;
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
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
      `}</style>
    </div>
  );
}