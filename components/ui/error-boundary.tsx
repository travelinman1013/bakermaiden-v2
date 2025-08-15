"use client";

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call the error callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={this.state.error!} 
            retry={this.handleRetry}
          />
        );
      }

      return <DefaultErrorFallback error={this.state.error!} retry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  retry: () => void;
}

function DefaultErrorFallback({ error, retry }: DefaultErrorFallbackProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-red-600">Something went wrong</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-semibold">Error Details:</div>
              <div className="text-sm font-mono bg-red-50 p-3 rounded border">
                {error.message}
              </div>
              {process.env.NODE_ENV === 'development' && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-red-700 hover:text-red-800">
                    Stack Trace (Development)
                  </summary>
                  <pre className="mt-2 p-3 bg-red-50 rounded border text-xs overflow-auto">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          </AlertDescription>
        </Alert>
        
        <div className="flex gap-2">
          <Button onClick={retry} variant="outline">
            Try Again
          </Button>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
          >
            Refresh Page
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          If this problem persists, please contact your system administrator.
        </div>
      </CardContent>
    </Card>
  );
}

// Simpler error boundary for smaller components
export function SimpleErrorBoundary({ 
  children, 
  message = "Something went wrong with this component" 
}: { 
  children: React.ReactNode; 
  message?: string;
}) {
  return (
    <ErrorBoundary
      fallback={({ error, retry }) => (
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-2">
              <div>{message}</div>
              <div className="text-sm text-muted-foreground">{error.message}</div>
              <Button size="sm" variant="outline" onClick={retry}>
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}