import type { ReactNode } from 'react';
import { AlertCircle, Inbox } from '@/icons';
import { Card, CardContent } from '@/v2/components/ui/card';
import { Skeleton } from '@/v2/components/ui/skeleton';
import MotionEmptyState from '@/v2/components/motion/MotionEmptyState';
import { useMinLoadingTime } from '@/v2/hooks/useMinLoadingTime';

type Props = {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  emptyMessage?: string;
  emptyTitle?: string;
  onRetry?: () => void;
  children: ReactNode;
  skeletonRows?: number;
  /** Mirror real layout: 'rows' | 'cards' | 'stat-grid' */
  skeletonVariant?: 'rows' | 'cards' | 'stat-grid';
};

function SkeletonLayout({ variant, rows }: { variant: Props['skeletonVariant']; rows: number }) {
  if (variant === 'stat-grid') {
    return (
      <div className="v2-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: Math.min(rows, 4) }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (variant === 'cards') {
    return (
      <div className="v2-stagger grid gap-4 sm:grid-cols-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function AsyncContent({
  loading,
  error,
  empty,
  emptyMessage = 'Nu există date încă.',
  emptyTitle = 'Nimic aici',
  onRetry,
  children,
  skeletonRows = 4,
  skeletonVariant = 'rows',
}: Props) {
  const showLoading = useMinLoadingTime(loading);

  if (showLoading) {
    return <SkeletonLayout variant={skeletonVariant} rows={skeletonRows} />;
  }

  if (error) {
    return (
      <Card className="shadow-none">
        <CardContent className="py-4">
          <MotionEmptyState
            icon={AlertCircle}
            title="Eroare la încărcare"
            description={error}
            action={onRetry ? { label: 'Reîncearcă', onClick: onRetry } : undefined}
          />
        </CardContent>
      </Card>
    );
  }

  if (empty) {
    return (
      <Card className="shadow-none">
        <CardContent>
          <MotionEmptyState icon={Inbox} title={emptyTitle} description={emptyMessage} />
        </CardContent>
      </Card>
    );
  }

  return <div className="v2-animate-content flex min-h-0 flex-1 flex-col">{children}</div>;
}
