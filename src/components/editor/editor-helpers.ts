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
  if (!formatting.length) return text;

  // Sort formatting by start position (descending)
  const sortedFormatting = [...formatting].sort((a, b) => b.start - a.start);
  
  let result = text;
  
  sortedFormatting.forEach(format => {
    const before = result.slice(0, format.start);
    const formatted = result.slice(format.start, format.end);
    const after = result.slice(format.end);
    
    let wrapper = '';
    
    switch (format.type) {
      case 'bold':
        wrapper = `<strong class="font-bold underline">${formatted}</strong>`;
        break;
      case 'highlight':
        const colorClass = getHighlightColorClass(format.color || 'yellow');
        wrapper = `<mark class="${colorClass}">${formatted}</mark>`;
        break;
      case 'minimize':
        wrapper = `<small class="text-xs opacity-60">${formatted}</small>`;
        break;
      default:
        wrapper = formatted;
    }
    
    result = before + wrapper + after;
  });
  
  return result;
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