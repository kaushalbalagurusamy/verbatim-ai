/**
 * Accessibility Service - Manages ARIA attributes, screen reader announcements, and keyboard navigation
 * Ensures WCAG AA compliance and provides comprehensive accessibility features
 * Implements focus management, live regions, and high contrast mode support
 */

import { DocumentModel } from '../models/document-model';
import { TextFormatting } from '../data-structures/interval-tree';

export interface AccessibilityConfig {
  announceFormattingChanges: boolean;
  enableHighContrastMode: boolean;
  enableReducedMotion: boolean;
  verboseAnnouncements: boolean;
}

export interface AccessibilityState {
  isHighContrastMode: boolean;
  isReducedMotion: boolean;
  currentFocus: 'editor' | 'toolbar' | 'line-numbers' | null;
  lastAnnouncement: string;
}

export class AccessibilityService {
  private config: AccessibilityConfig;
  private state: AccessibilityState;
  private liveRegion: HTMLElement | null = null;
  private politeRegion: HTMLElement | null = null;
  private listeners: ((state: AccessibilityState) => void)[] = [];
  private document: DocumentModel;
  private editorElement: HTMLElement | null = null;

  constructor(document: DocumentModel, config: Partial<AccessibilityConfig> = {}) {
    this.document = document;
    this.config = {
      announceFormattingChanges: true,
      enableHighContrastMode: false,
      enableReducedMotion: false,
      verboseAnnouncements: true,
      ...config
    };
    
    this.state = {
      isHighContrastMode: this.detectHighContrastMode(),
      isReducedMotion: this.detectReducedMotion(),
      currentFocus: null,
      lastAnnouncement: ''
    };
    
    this.setupLiveRegions();
    this.setupMediaQueryListeners();
  }

  /**
   * Initialize accessibility features for editor element
   */
  initializeEditor(editorElement: HTMLElement): void {
    this.editorElement = editorElement;
    
    // Set ARIA attributes
    editorElement.setAttribute('role', 'textbox');
    editorElement.setAttribute('aria-multiline', 'true');
    editorElement.setAttribute('aria-label', 'Document editor. Use arrow keys to navigate, Enter to create new lines.');
    editorElement.setAttribute('aria-describedby', 'editor-instructions');
    editorElement.setAttribute('aria-live', 'off'); // We'll use dedicated live regions
    
    // Add skip link target
    editorElement.id = 'main-editor';
    
    // Create editor instructions
    this.createEditorInstructions();
    
    // Apply high contrast styles if needed
    if (this.state.isHighContrastMode) {
      this.applyHighContrastMode(true);
    }
  }

  /**
   * Initialize toolbar accessibility
   */
  initializeToolbar(toolbarElement: HTMLElement): void {
    toolbarElement.setAttribute('role', 'toolbar');
    toolbarElement.setAttribute('aria-label', 'Editor formatting toolbar');
    toolbarElement.setAttribute('aria-orientation', 'horizontal');
    
    // Set up roving tabindex for toolbar buttons
    const buttons = toolbarElement.querySelectorAll('button');
    buttons.forEach((button, index) => {
      button.setAttribute('tabindex', index === 0 ? '0' : '-1');
      button.setAttribute('aria-keyshortcuts', this.getKeyShortcut(button));
    });
  }

  /**
   * Announce formatting change to screen readers
   */
  announceFormattingChange(formatting: TextFormatting, action: 'applied' | 'removed'): void {
    if (!this.config.announceFormattingChanges) return;
    
    let announcement = '';
    
    switch (formatting.type) {
      case 'bold':
        announcement = action === 'applied' ? 'Bold applied' : 'Bold removed';
        break;
      case 'highlight':
        announcement = action === 'applied' 
          ? `Highlighted in ${formatting.color || 'yellow'}` 
          : 'Highlight removed';
        break;
      case 'minimize':
        announcement = action === 'applied' ? 'Text minimized' : 'Minimize removed';
        break;
    }
    
    if (this.config.verboseAnnouncements) {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        announcement += ` to selected text`;
      }
    }
    
    this.announce(announcement, 'polite');
  }

  /**
   * Announce general messages to screen readers
   */
  announce(message: string, priority: 'assertive' | 'polite' = 'polite'): void {
    const region = priority === 'assertive' ? this.liveRegion : this.politeRegion;
    if (!region) return;
    
    // Clear and set new message
    region.textContent = '';
    
    // Use setTimeout to ensure screen readers pick up the change
    setTimeout(() => {
      region.textContent = message;
      this.state.lastAnnouncement = message;
    }, 100);
  }

  /**
   * Handle toolbar keyboard navigation
   */
  handleToolbarNavigation(event: KeyboardEvent, currentButton: HTMLElement): boolean {
    const toolbar = currentButton.closest('[role="toolbar"]');
    if (!toolbar) return false;
    
    const buttons = Array.from(toolbar.querySelectorAll('button:not([disabled])'));
    const currentIndex = buttons.indexOf(currentButton);
    
    let nextIndex = -1;
    
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % buttons.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) nextIndex = buttons.length - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = buttons.length - 1;
        break;
      default:
        return false;
    }
    
    if (nextIndex !== -1) {
      // Update tabindex
      buttons[currentIndex].setAttribute('tabindex', '-1');
      buttons[nextIndex].setAttribute('tabindex', '0');
      (buttons[nextIndex] as HTMLElement).focus();
      
      // Announce button
      const label = buttons[nextIndex].getAttribute('aria-label') || 
                   buttons[nextIndex].textContent || '';
      this.announce(label, 'polite');
      
      return true;
    }
    
    return false;
  }

  /**
   * Update focus state
   */
  updateFocus(area: 'editor' | 'toolbar' | 'line-numbers' | null): void {
    this.state.currentFocus = area;
    this.notifyListeners();
  }

  /**
   * Apply or remove high contrast mode
   */
  applyHighContrastMode(enable: boolean): void {
    if (!this.editorElement) return;
    
    const container = this.editorElement.closest('.editor-container');
    if (!container) return;
    
    if (enable) {
      container.classList.add('high-contrast-mode');
      // Add specific high contrast styles
      this.injectHighContrastStyles();
    } else {
      container.classList.remove('high-contrast-mode');
      this.removeHighContrastStyles();
    }
    
    this.state.isHighContrastMode = enable;
    this.notifyListeners();
  }

  /**
   * Set up live regions for screen reader announcements
   */
  private setupLiveRegions(): void {
    // Create assertive live region
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'assertive');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only';
    document.body.appendChild(this.liveRegion);
    
    // Create polite live region
    this.politeRegion = document.createElement('div');
    this.politeRegion.setAttribute('role', 'status');
    this.politeRegion.setAttribute('aria-live', 'polite');
    this.politeRegion.setAttribute('aria-atomic', 'true');
    this.politeRegion.className = 'sr-only';
    document.body.appendChild(this.politeRegion);
  }

  /**
   * Create editor instructions for screen readers
   */
  private createEditorInstructions(): void {
    const instructions = document.createElement('div');
    instructions.id = 'editor-instructions';
    instructions.className = 'sr-only';
    instructions.textContent = `
      Editor keyboard shortcuts:
      Control+B for bold,
      Control+H for highlight,
      Control+M for minimize,
      Control+Shift+C to clear formatting,
      Tab to navigate to toolbar,
      Escape to return focus to editor.
    `;
    document.body.appendChild(instructions);
  }

  /**
   * Get keyboard shortcut for button
   */
  private getKeyShortcut(button: Element): string {
    const text = button.textContent?.toLowerCase() || '';
    
    if (text.includes('bold') || text.includes('emphasis')) return 'ctrl+b';
    if (text.includes('highlight')) return 'ctrl+h';
    if (text.includes('minimize')) return 'ctrl+m';
    if (text.includes('clear')) return 'ctrl+shift+c';
    if (text.includes('heading')) return 'ctrl+1-6';
    
    return '';
  }

  /**
   * Detect high contrast mode preference
   */
  private detectHighContrastMode(): boolean {
    return window.matchMedia('(prefers-contrast: high)').matches;
  }

  /**
   * Detect reduced motion preference
   */
  private detectReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Set up media query listeners
   */
  private setupMediaQueryListeners(): void {
    // High contrast mode listener
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    highContrastQuery.addEventListener('change', (e) => {
      this.applyHighContrastMode(e.matches);
    });
    
    // Reduced motion listener
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionQuery.addEventListener('change', (e) => {
      this.state.isReducedMotion = e.matches;
      this.notifyListeners();
    });
  }

  /**
   * Inject high contrast styles
   */
  private injectHighContrastStyles(): void {
    const styleId = 'editor-high-contrast-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
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
      
      .high-contrast-mode .line-number.active {
        background-color: #ffffff !important;
        color: #000000 !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Remove high contrast styles
   */
  private removeHighContrastStyles(): void {
    const style = document.getElementById('editor-high-contrast-styles');
    if (style) {
      style.remove();
    }
  }

  /**
   * Subscribe to accessibility state changes
   */
  subscribe(listener: (state: AccessibilityState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.liveRegion) {
      this.liveRegion.remove();
    }
    if (this.politeRegion) {
      this.politeRegion.remove();
    }
    
    const instructions = document.getElementById('editor-instructions');
    if (instructions) {
      instructions.remove();
    }
    
    this.removeHighContrastStyles();
    this.listeners = [];
  }
}