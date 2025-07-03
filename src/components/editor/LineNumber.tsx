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
}

export const LineNumber = memo(({ 
  index, 
  block, 
  isActive 
}: LineNumberProps) => {
  const isHeader = block.type.startsWith('heading');
  const headerLevel = isHeader ? block.type.replace('heading', '') : null;
  
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
        <span>{index + 1}</span>
      )}
    </div>
  );
});

LineNumber.displayName = 'LineNumber';