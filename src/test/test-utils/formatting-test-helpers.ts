/**
 * Formatting Test Helpers - Utilities for testing text formatting
 * Provides functions for applying and verifying formatting in tests
 */

import type { TextFormatting, HighlightColor } from '@/types/document.types';

/**
 * Create mock formatting
 */
export function createMockFormatting(
  type: TextFormatting['type'],
  start: number,
  end: number,
  color?: HighlightColor
): TextFormatting {
  return {
    type,
    start,
    end,
    ...(color && { color })
  };
}

/**
 * Check if text has specific formatting applied
 */
export function hasFormatting(
  element: HTMLElement,
  formatType: string,
  text?: string
): boolean {
  const formatClass = `fmt-${formatType}`;
  
  // Check if element itself has the format
  if (element.classList.contains(formatClass)) {
    return !text || element.textContent === text;
  }
  
  // Check if any child has the format
  const formatted = element.querySelector(`.${formatClass}`);
  if (formatted) {
    return !text || formatted.textContent === text;
  }
  
  return false;
}

/**
 * Get all elements with specific formatting
 */
export function getFormattedElements(
  container: HTMLElement,
  formatType: string
): HTMLElement[] {
  return Array.from(container.querySelectorAll(`.fmt-${formatType}`));
}

/**
 * Check highlight color
 */
export function getHighlightColor(element: HTMLElement): HighlightColor | null {
  const classes = Array.from(element.classList);
  
  for (const cls of classes) {
    if (cls.startsWith('fmt-highlight-')) {
      const color = cls.replace('fmt-highlight-', '');
      if (['yellow', 'blue', 'green', 'pink'].includes(color)) {
        return color as HighlightColor;
      }
    }
  }
  
  // Check children
  const highlighted = element.querySelector('[class*="fmt-highlight-"]');
  if (highlighted) {
    return getHighlightColor(highlighted as HTMLElement);
  }
  
  return null;
}

/**
 * Assert formatting is applied to text
 */
export function assertFormatting(
  container: HTMLElement,
  expectedFormats: Array<{
    type: string;
    text: string;
    color?: HighlightColor;
  }>
): void {
  expectedFormats.forEach(({ type, text, color }) => {
    const elements = getFormattedElements(container, type);
    const found = elements.some(el => {
      const hasText = el.textContent === text;
      const hasColor = !color || getHighlightColor(el) === color;
      return hasText && hasColor;
    });
    
    expect(found).toBe(true);
  });
}

/**
 * Simulate formatting button click
 */
export function clickFormattingButton(
  toolbar: HTMLElement,
  formatType: 'bold' | 'highlight' | 'minimize' | 'clear'
): void {
  let button: HTMLElement | null = null;
  
  switch (formatType) {
    case 'bold':
      // Look for button with Bold icon or emphasis text
      button = toolbar.querySelector('[aria-label*="Bold"]') ||
               toolbar.querySelector('[aria-label*="Emphasis"]') ||
               Array.from(toolbar.querySelectorAll('button')).find(
                 btn => btn.textContent?.includes('B') || 
                        btn.querySelector('svg')?.classList.contains('lucide-bold')
               ) || null;
      break;
      
    case 'highlight':
      // Look for highlight button
      button = toolbar.querySelector('[aria-label*="Highlight"]') ||
               Array.from(toolbar.querySelectorAll('button')).find(
                 btn => btn.querySelector('svg')?.classList.contains('lucide-highlighter')
               ) || null;
      break;
      
    case 'minimize':
      // Look for minimize button
      button = toolbar.querySelector('[aria-label*="Minimize"]') ||
               Array.from(toolbar.querySelectorAll('button')).find(
                 btn => btn.querySelector('svg')?.classList.contains('lucide-minimize-2')
               ) || null;
      break;
      
    case 'clear':
      // Look for clear button
      button = toolbar.querySelector('[aria-label*="Clear"]') ||
               Array.from(toolbar.querySelectorAll('button')).find(
                 btn => btn.querySelector('svg')?.classList.contains('lucide-eraser')
               ) || null;
      break;
  }
  
  if (!button) {
    throw new Error(`Could not find ${formatType} button in toolbar`);
  }
  
  button.click();
}

/**
 * Get active formatting buttons
 */
export function getActiveFormattingButtons(toolbar: HTMLElement): string[] {
  const activeButtons: string[] = [];
  
  // Check for active classes or styles
  const buttons = toolbar.querySelectorAll('button');
  
  buttons.forEach(button => {
    // Check various active states
    const isActive = 
      button.classList.contains('active') ||
      button.classList.contains('bg-[#4fc3f7]') ||
      button.getAttribute('data-state') === 'on' ||
      button.getAttribute('aria-pressed') === 'true';
    
    if (isActive) {
      // Try to determine button type
      if (button.textContent?.includes('B') || 
          button.querySelector('.lucide-bold')) {
        activeButtons.push('bold');
      } else if (button.querySelector('.lucide-highlighter')) {
        activeButtons.push('highlight');
      } else if (button.querySelector('.lucide-minimize-2')) {
        activeButtons.push('minimize');
      }
    }
  });
  
  return activeButtons;
}

/**
 * Simulate highlight color selection
 */
export function selectHighlightColor(
  toolbar: HTMLElement,
  color: HighlightColor
): void {
  // Find color dropdown trigger
  const dropdown = toolbar.querySelector('[role="combobox"]') ||
                  toolbar.querySelector('.dropdown-trigger') ||
                  toolbar.querySelector('button + button'); // Color selector is often next to highlight
  
  if (!dropdown) {
    throw new Error('Could not find highlight color dropdown');
  }
  
  // Click to open dropdown
  (dropdown as HTMLElement).click();
  
  // Find and click color option
  const colorOption = document.querySelector(`[data-color="${color}"]`) ||
                     Array.from(document.querySelectorAll('[role="option"]')).find(
                       el => el.textContent?.toLowerCase().includes(color)
                     );
  
  if (!colorOption) {
    throw new Error(`Could not find color option: ${color}`);
  }
  
  (colorOption as HTMLElement).click();
}

/**
 * Get current highlight color from toolbar
 */
export function getCurrentHighlightColor(toolbar: HTMLElement): HighlightColor | null {
  // Look for color indicator in highlight button
  const highlightButton = Array.from(toolbar.querySelectorAll('button')).find(
    btn => btn.querySelector('.lucide-highlighter')
  );
  
  if (!highlightButton) return null;
  
  // Check for color classes or styles
  const colorClasses = ['yellow', 'blue', 'green', 'pink'];
  
  for (const color of colorClasses) {
    if (highlightButton.classList.contains(`text-${color}-500`) ||
        highlightButton.style.color?.includes(color)) {
      return color as HighlightColor;
    }
  }
  
  return null;
}