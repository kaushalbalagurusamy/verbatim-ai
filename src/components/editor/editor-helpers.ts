/**
 * Editor Helper Functions - Utilities for block styling and formatting
 * Extracted from Editor component to maintain file size limits
 */
import type { TextFormatting, HighlightColor } from '@/types/document.types';

export function getBlockClassName(type: string): string {
  const baseClasses = 'min-h-[1.5rem] leading-relaxed outline-none';
  
  switch (type) {
    case 'heading1':
      return `${baseClasses} text-2xl font-bold text-[#ffffff] mb-4`;
    case 'heading2':
      return `${baseClasses} text-xl font-bold text-[#ffffff] mb-3`;
    case 'heading3':
      return `${baseClasses} text-lg font-bold text-[#ffffff] mb-2`;
    case 'heading4':
      return `${baseClasses} text-base font-bold text-[#ffffff] mb-2`;
    case 'heading5':
      return `${baseClasses} text-sm font-bold text-[#ffffff] mb-1`;
    case 'heading6':
      return `${baseClasses} text-xs font-bold text-[#ffffff] mb-1`;
    case 'mention':
      return `${baseClasses} text-[#4fc3f7] bg-[#4fc3f7]/10 px-1 rounded`;
    case 'command':
      return `${baseClasses} text-[#ffa726] bg-[#ffa726]/10 px-1 rounded`;
    default:
      return `${baseClasses} text-[#cccccc] mb-2`;
  }
}

export function getLineHeight(type: string): string {
  switch (type) {
    case 'heading1': return '2rem';
    case 'heading2': return '1.75rem';
    case 'heading3': return '1.5rem';
    case 'heading4': return '1.25rem';
    case 'heading5': return '1rem';
    case 'heading6': return '0.875rem';
    default: return '1.5rem';
  }
}

export function getLineMarginBottom(type: string): string {
  switch (type) {
    case 'heading1': return '1rem';
    case 'heading2': return '0.75rem';
    case 'heading3': return '0.5rem';
    case 'heading4': return '0.5rem';
    case 'heading5': return '0.25rem';
    case 'heading6': return '0.25rem';
    default: return '0.5rem';
  }
}

export function applyFormatting(text: string, formatting: TextFormatting[]): string {
  try {
    // Handle empty or invalid inputs
    if (!text || typeof text !== 'string') return '<br>';
    if (!Array.isArray(formatting) || formatting.length === 0) return escapeHtml(text) || '<br>';

    // Build a map of formatting at each character position
    interface CharFormat {
      bold: boolean;
      highlight: { color: HighlightColor } | null;
      minimize: boolean;
    }
    
    const charFormats: CharFormat[] = Array(text.length).fill(null).map(() => ({
      bold: false,
      highlight: null,
      minimize: false
    }));
    
    // Apply formatting to character map with bounds checking
    formatting.forEach(fmt => {
      // Validate formatting object
      if (!fmt || typeof fmt !== 'object') return;
      if (typeof fmt.start !== 'number' || typeof fmt.end !== 'number') return;
      
      // Ensure bounds are valid
      const start = Math.max(0, fmt.start);
      const end = Math.min(fmt.end, text.length);
      
      if (start >= end) return;
      
      for (let i = start; i < end; i++) {
        if (fmt.type === 'bold') {
          charFormats[i].bold = true;
        } else if (fmt.type === 'highlight' && fmt.color) {
          charFormats[i].highlight = { color: fmt.color };
        } else if (fmt.type === 'minimize') {
          charFormats[i].minimize = true;
        }
      }
    });
  } catch (error) {
    console.error('Error applying formatting:', error);
    return escapeHtml(text) || '<br>';
  }
  
  // Build HTML with proper nesting
  let result = '';
  const openTags: string[] = [];
  let prevFormat: CharFormat | null = null;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const format = charFormats[i];
    
    // Check if formatting changed
    if (!prevFormat || 
        format.bold !== prevFormat.bold ||
        format.highlight?.color !== prevFormat.highlight?.color ||
        format.minimize !== prevFormat.minimize) {
      
      // Close previous tags in reverse order
      while (openTags.length > 0) {
        result += openTags.pop();
      }
      
      // Open new tags in correct order: minimize -> highlight -> bold
      if (format.minimize) {
        result += '<small style="font-size: 6px; opacity: 0.6;">';
        openTags.push('</small>');
      }
      if (format.highlight) {
        const colorClass = getHighlightColorClass(format.highlight.color);
        result += `<mark class="${colorClass}">`;
        openTags.push('</mark>');
      }
      if (format.bold) {
        result += '<strong class="font-bold underline">';
        openTags.push('</strong>');
      }
    }
    
    // Add the character (escaped)
    result += escapeHtml(char);
    prevFormat = format;
  }
  
  // Close remaining tags
  while (openTags.length > 0) {
    result += openTags.pop();
  }
  
  return result || '<br>';
}

export function getHighlightColorClass(color: HighlightColor): string {
  switch (color) {
    case 'yellow': return 'bg-yellow-200 text-yellow-900';
    case 'blue': return 'bg-blue-200 text-blue-900';
    case 'green': return 'bg-green-200 text-green-900';
    case 'pink': return 'bg-pink-200 text-pink-900';
    default: return 'bg-yellow-200 text-yellow-900';
  }
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}