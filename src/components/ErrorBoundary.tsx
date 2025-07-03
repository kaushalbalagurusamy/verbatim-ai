/**
 * Error Boundary Component - Catches and handles React rendering errors
 * Prevents white screen crashes and provides fallback UI
 */
import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  /**
   * Log error details and call optional error handler
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      errorInfo
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  /**
   * Reset error state and retry rendering
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  /**
   * Reload the page
   */
  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      const { fallbackTitle = 'Something went wrong' } = this.props;

      return (
        <div className="min-h-screen bg-[#1e1e1e] text-[#cccccc] flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            <div className="bg-[#252526] rounded-lg p-8 border border-[#3c3c3c]">
              {/* Error Icon and Title */}
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-8 h-8 text-[#ffa726]" />
                <h1 className="text-2xl font-semibold text-[#ffffff]">
                  {fallbackTitle}
                </h1>
              </div>

              {/* Error Message */}
              <div className="mb-6">
                <p className="text-[#cccccc] mb-2">
                  The application encountered an error while rendering this component.
                </p>
                {error && (
                  <div className="bg-[#1e1e1e] rounded p-4 mt-4">
                    <p className="text-[#ffa726] font-mono text-sm mb-2">
                      {error.toString()}
                    </p>
                    {process.env.NODE_ENV === 'development' && errorInfo?.componentStack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[#6a6a6a] hover:text-[#cccccc]">
                          Component Stack Trace
                        </summary>
                        <pre className="text-xs text-[#6a6a6a] mt-2 overflow-auto max-h-64">
                          {errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  onClick={this.handleReset}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleReload}
                  variant="ghost"
                  className="text-[#6a6a6a]"
                >
                  Reload Page
                </Button>
              </div>

              {/* Help Text */}
              <p className="text-xs text-[#6a6a6a] mt-6">
                If this problem persists, try refreshing the page or contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to wrap functional components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallbackTitle?: string
) {
  return (props: P) => (
    <ErrorBoundary fallbackTitle={fallbackTitle}>
      <Component {...props} />
    </ErrorBoundary>
  );
}