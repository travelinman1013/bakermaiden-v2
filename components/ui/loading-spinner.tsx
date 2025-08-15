import { Card, CardContent } from '@/components/ui/card';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullHeight?: boolean;
}

export function LoadingSpinner({ 
  size = 'md', 
  message = 'Loading...', 
  fullHeight = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const containerClasses = fullHeight 
    ? 'flex items-center justify-center min-h-[400px]' 
    : 'flex items-center justify-center py-8';

  return (
    <div className={containerClasses}>
      <div className="text-center space-y-4">
        <div
          className={`${sizeClasses[size]} border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto`}
          role="status"
          aria-label="Loading"
        />
        {message && (
          <div className="text-sm text-muted-foreground">{message}</div>
        )}
      </div>
    </div>
  );
}

export function LoadingCard({ message = 'Loading...', title }: { message?: string; title?: string }) {
  return (
    <Card>
      {title && (
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">{title}</h3>
        </CardContent>
      )}
      <CardContent className={title ? 'pt-0' : 'pt-6'}>
        <LoadingSpinner message={message} />
      </CardContent>
    </Card>
  );
}

// Inline loading spinner for buttons and small spaces
export function InlineSpinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-block w-4 h-4 border-2 border-gray-300 border-t-current rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}