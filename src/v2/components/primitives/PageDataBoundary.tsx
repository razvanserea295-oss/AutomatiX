import type { ReactNode } from 'react';
import { Skeleton } from '@/v2/components/primitives';
import ErrorState from '@/v2/components/primitives/ErrorState';

export interface PageDataBoundaryProps {
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  skeleton?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Standard first-load skeleton + fetch error with retry. */
export default function PageDataBoundary({
  loading,
  error,
  onRetry,
  skeleton,
  children,
  className = '',
}: PageDataBoundaryProps) {
  if (loading) {
    return (
      <div className={className}>
        {skeleton ?? <Skeleton className="h-48 w-full rounded-2xl" />}
      </div>
    );
  }
  if (error) {
    return (
      <ErrorState
        title="Nu s-au putut încărca datele"
        description={error}
        onRetry={onRetry}
        className={className}
      />
    );
  }
  return <>{children}</>;
}
