"use client";

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{error?: Error; resetError: () => void}>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // Update state with error info
    this.setState({ errorInfo });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback component if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      // Default error UI
      return (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Something went wrong</CardTitle>
            <CardDescription>
              The component encountered an unexpected error and cannot be displayed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">
                    {this.state.error?.name || 'Error'}
                  </div>
                  <div className="text-sm">
                    {this.state.error?.message || 'An unexpected error occurred'}
                  </div>
                  {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        Technical Details (Development Only)
                      </summary>
                      <pre className="mt-2 text-xs overflow-auto p-2 bg-muted rounded">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button onClick={this.resetError} variant="outline">
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()} variant="secondary">
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Simple hook-based error boundary alternative for function components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    console.error('Error caught by useErrorHandler:', error);
    setError(error);
  }, []);

  // Throw error to be caught by nearest Error Boundary
  if (error) {
    throw error;
  }

  return { captureError, resetError };
};

// Production table error fallback component
export const ProductionTableErrorFallback: React.FC<{error?: Error; resetError: () => void}> = ({ 
  error, 
  resetError 
}) => (
  <Card>
    <CardContent className="py-8">
      <div className="text-center space-y-4">
        <div className="text-muted-foreground">
          Unable to load production data
        </div>
        <div className="text-sm text-red-600">
          {error?.message || 'An error occurred while loading the production table'}
        </div>
        <div className="flex justify-center gap-2">
          <Button onClick={resetError} size="sm" variant="outline">
            Try Again
          </Button>
          <Button onClick={() => window.location.reload()} size="sm" variant="secondary">
            Reload Page
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Batch detail error fallback component  
export const BatchDetailErrorFallback: React.FC<{error?: Error; resetError: () => void}> = ({ 
  error, 
  resetError 
}) => (
  <Alert variant="destructive">
    <AlertDescription>
      <div className="space-y-2">
        <div className="font-medium">Failed to load batch details</div>
        <div className="text-sm">
          {error?.message || 'The batch details could not be loaded. Please try again.'}
        </div>
        <div className="flex gap-2 mt-3">
          <Button onClick={resetError} size="sm" variant="outline">
            Try Again
          </Button>
          <Button onClick={() => window.history.back()} size="sm" variant="secondary">
            Go Back
          </Button>
        </div>
      </div>
    </AlertDescription>
  </Alert>
);

// Print error fallback component
export const PrintErrorFallback: React.FC<{error?: Error; resetError: () => void}> = ({ 
  error, 
  resetError 
}) => (
  <Card>
    <CardContent className="py-8">
      <div className="text-center space-y-4">
        <div className="text-muted-foreground">
          Unable to generate batch sheet
        </div>
        <div className="text-sm text-red-600">
          {error?.message || 'An error occurred while preparing the batch sheet for printing'}
        </div>
        <div className="flex justify-center gap-2">
          <Button onClick={resetError} size="sm" variant="outline">
            Try Again
          </Button>
          <Button onClick={() => window.history.back()} size="sm" variant="secondary">
            Go Back
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);