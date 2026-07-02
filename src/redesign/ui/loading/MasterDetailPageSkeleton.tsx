import Skeleton from './Skeleton';
import LoadingElapsed from './LoadingElapsed';

export interface MasterDetailPageSkeletonProps {
  className?: string;
  showExtended?: boolean;
  elapsedMs?: number;
  label?: string;
}

/** Master-detail — left list (8 items) + right detail form. */
export default function MasterDetailPageSkeleton({
  className = '',
  showExtended = false,
  elapsedMs = 0,
  label,
}: MasterDetailPageSkeletonProps) {
  return (
    <div className={`flex flex-1 flex-col min-h-0 anim-rise ${className}`} role="status" aria-busy aria-label={label ?? 'Se încarcă'}>
      {showExtended && <LoadingElapsed elapsedMs={elapsedMs} label={label} />}
      <div className="flex flex-1 min-h-0 gap-4 px-6 py-4">
        <div className="w-full lg:w-[340px] shrink-0 rounded-xl border border-line overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-line">
            <Skeleton width="60%" height={14} waveIndex={0} />
          </div>
          <div className="flex flex-col divide-y divide-line/40">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton width={32} height={32} borderRadius="full" waveIndex={i % 3} />
                <div className="flex-1 space-y-1.5">
                  <Skeleton width={`${70 + (i % 3) * 8}%`} height={12} waveIndex={(i + 1) % 3} />
                  <Skeleton width="45%" height={8} waveIndex={(i + 2) % 3} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-0 rounded-xl border border-line p-5 space-y-5">
          <div className="space-y-2">
            <Skeleton width="40%" height={20} waveIndex={0} />
            <Skeleton width="55%" height={12} waveIndex={1} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton width="30%" height={10} waveIndex={i % 3} />
                <Skeleton width="100%" height={36} borderRadius="lg" waveIndex={(i + 1) % 3} />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Skeleton width={80} height={36} borderRadius="lg" />
            <Skeleton width={96} height={36} borderRadius="lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
