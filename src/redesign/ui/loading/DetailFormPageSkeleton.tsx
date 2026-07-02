import Skeleton from './Skeleton';
import SkeletonGroup from './SkeletonGroup';
import LoadingElapsed from './LoadingElapsed';

export interface DetailFormPageSkeletonProps {
  className?: string;
  showExtended?: boolean;
  elapsedMs?: number;
  label?: string;
}

/** Detail / form page — header, 2-col fields, action bar. */
export default function DetailFormPageSkeleton({
  className = '',
  showExtended = false,
  elapsedMs = 0,
  label,
}: DetailFormPageSkeletonProps) {
  return (
    <div className={`flex flex-1 flex-col min-h-0 anim-rise ${className}`} role="status" aria-busy aria-label={label ?? 'Se încarcă'}>
      {showExtended && <LoadingElapsed elapsedMs={elapsedMs} label={label} />}
      <div className="px-6 py-5 border-b border-line shrink-0">
        <SkeletonGroup className="flex flex-col gap-2 max-w-md">
          <Skeleton width="45%" height={22} waveIndex={0} />
          <Skeleton width="65%" height={12} waveIndex={1} />
        </SkeletonGroup>
      </div>
      <div className="flex-1 px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 max-w-4xl">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton width="35%" height={10} waveIndex={i % 3} />
              <Skeleton width="100%" height={36} borderRadius="lg" waveIndex={(i + 1) % 3} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line shrink-0">
        <Skeleton width={88} height={36} borderRadius="lg" waveIndex={0} />
        <Skeleton width={104} height={36} borderRadius="lg" waveIndex={1} />
      </div>
    </div>
  );
}
