import Skeleton from './Skeleton';
import SkeletonGroup from './SkeletonGroup';
import LoadingElapsed from './LoadingElapsed';

export interface DashboardPageSkeletonProps {
  className?: string;
  showExtended?: boolean;
  elapsedMs?: number;
  label?: string;
}

/** Dashboard layout — toolbar, 4 KPIs, 2/3 table + 1/3 stacked cards. */
export default function DashboardPageSkeleton({
  className = '',
  showExtended = false,
  elapsedMs = 0,
  label,
}: DashboardPageSkeletonProps) {
  return (
    <div className={`flex flex-1 flex-col min-h-0 anim-rise ${className}`} role="status" aria-busy aria-label={label ?? 'Se încarcă'}>
      {showExtended && <LoadingElapsed elapsedMs={elapsedMs} label={label} />}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-line shrink-0">
        <SkeletonGroup className="flex flex-col gap-2">
          <Skeleton width={180} height={20} borderRadius="md" waveIndex={0} />
          <Skeleton width={120} height={12} borderRadius="sm" waveIndex={1} />
        </SkeletonGroup>
        <Skeleton width={100} height={36} borderRadius="lg" waveIndex={2} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-4 shrink-0">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-line p-4 space-y-3">
            <Skeleton width="40%" height={10} waveIndex={i} />
            <Skeleton width="70%" height={24} waveIndex={i + 1} />
            <Skeleton width="50%" height={8} waveIndex={i + 2} />
          </div>
        ))}
      </div>
      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-3 gap-4 px-6 pb-6">
        <div className="lg:col-span-2 rounded-xl border border-line p-4 flex flex-col gap-3 min-h-[280px]">
          <Skeleton width="30%" height={14} />
          <div className="space-y-2 flex-1">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex gap-4 items-center py-2">
                <Skeleton width={`${55 + (i % 4) * 8}%`} height={12} waveIndex={i % 3} />
                <Skeleton width={64} height={12} className="ml-auto shrink-0" waveIndex={(i + 1) % 3} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 min-h-[280px]">
          {[0, 1].map(i => (
            <div key={i} className="flex-1 rounded-xl border border-line p-4 space-y-3">
              <Skeleton width="55%" height={14} waveIndex={i} />
              <Skeleton lines={3} waveIndex={i + 1} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
