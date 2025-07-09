/**
 * Test wrapper component that provides necessary context providers
 */

import React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';

interface TestWrapperProps {
  children: React.ReactNode;
}

export function TestWrapper({ children }: TestWrapperProps) {
  return (
    <TooltipProvider>
      {children}
    </TooltipProvider>
  );
}

// Custom render function that includes providers
import { render, RenderOptions } from '@testing-library/react';

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: TestWrapper, ...options });
}