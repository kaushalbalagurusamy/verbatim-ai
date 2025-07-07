/**
 * Line Number Component - Displays line numbers with special formatting for headers
 * Memoized to prevent unnecessary re-renders during typing
 */
import React, { memo } from 'react';
import type { ContentBlock } from '@/types/document.types';
import { getLineHeight, getLineMarginBottom } from './editor-helpers';

interface LineNumberProps {
  index: number;
  block: ContentBlock;
  isActive: boolean;
  visualLineCount: number;
  startLineNumber: number;
}

export const LineNumber = memo(({ 
  index, 
  block, 
  isActive,
  visualLineCount,
  startLineNumber
}: LineNumberProps) => {
  const isHeader = block.type.startsWith('heading');
  const headerLevel = isHeader ? block.type.replace('heading', '') : null;
  
  // Calculate base line height
  const baseLineHeight = block.type === 'paragraph' ? '1.15rem' : getLineHeight(block.type);
  const lineHeightValue = baseLineHeight === '1.15rem' ? 16.1 : parseFloat(baseLineHeight) * 16; // Convert to pixels
  
  // For headers or single-line blocks, render as before
  if (isHeader || visualLineCount <= 1) {
    return (
      <div 
        className="flex items-center justify-center text-xs font-mono"
        style={{
          minHeight: getLineHeight(block.type),
          marginBottom: getLineMarginBottom(block.type),
          color: isActive ? '#ffffff' : '#6a6a6a'
        }}
      >
        {isHeader ? (
          <span className={`font-medium ${isActive ? 'text-[#4fc3f7]' : 'text-[#4fc3f7]'}`}>
            H{headerLevel}
          </span>
        ) : (
          <span>{startLineNumber}</span>
        )}
      </div>
    );
  }
  
  // For multi-line blocks, render a number for each visual line
  return (
    <div
      className="flex flex-col"
      style={{
        marginBottom: getLineMarginBottom(block.type)
      }}
    >
      {Array.from({ length: visualLineCount }, (_, lineIndex) => (
        <div
          key={lineIndex}
          className="flex items-center justify-center text-xs font-mono"
          style={{
            height: '1.15rem', // Match the line height
            color: isActive ? '#ffffff' : '#6a6a6a'
          }}
        >
          <span>{startLineNumber + lineIndex}</span>
        </div>
      ))}
    </div>
  );
});

LineNumber.displayName = 'LineNumber';