import type { ReactNode } from 'react';
import { useDeferredLoading } from '@/redesign/lib/loading';
import DashboardPageSkeleton from './DashboardPageSkeleton';
import TablePageSkeleton from './TablePageSkeleton';
import DetailFormPageSkeleton from './DetailFormPageSkeleton';
import MasterDetailPageSkeleton from './MasterDetailPageSkeleton';

export type PageSkeletonVariant = 'dashboard' | 'table' | 'detail' | 'master-detail';

const SKELETONS: Record<PageSkeletonVariant, typeof DashboardPageSkeleton> = {
  dashboard: DashboardPageSkeleton,
  table: TablePageSkeleton,
  detail: DetailFormPageSkeleton,
  'master-detail': MasterDetailPageSkeleton,
};

export interface PageLoadingBoundaryProps {
  isLoading: boolean;
  dataReady?: boolean;
  variant?: PageSkeletonVariant;
  skeleton?: ReactNode;
  reserveClassName?: string;
  className?: string;
  label?: string;
  children: ReactNode;
}

/**
 * 3-tier page loading: hidden (<100ms) → skeleton (100ms–1s) → skeleton + elapsed (>1s).
 * Reserves layout space during tier 1 via `ix-loading-reserve`.
 */
export default function PageLoadingBoundary({
  isLoading,
  dataReady = true,
  variant = 'table',
  skeleton,
  reserveClassName = '',
  className = '',
  label,
  children,
}: PageLoadingBoundaryProps) {
  const { showSkeleton, showExtended, elapsedMs, isPending } = useDeferredLoading(isLoading, dataReady);

  if (!showSkeleton && !isPending) {
    return <>{children}</>;
  }

  if (isPending) {
    return <div className={`ix-loading-reserve ${reserveClassName}`} aria-hidden />;
  }

  const SkeletonComponent = SKELETONS[variant];
  return (
    skeleton ?? (
      <SkeletonComponent
        className={className}
        showExtended={showExtended}
        elapsedMs={elapsedMs}
        label={label}
      />
    )
  );
}
