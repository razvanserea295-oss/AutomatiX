import Skeleton from './Skeleton';
import LoadingElapsed from './LoadingElapsed';

const ROW_WIDTHS = [
  ['42%', '18%', '14%', '12%'],
  ['55%', '16%', '12%', '10%'],
  ['38%', '20%', '15%', '11%'],
  ['48%', '14%', '16%', '10%'],
  ['52%', '18%', '12%', '8%'],
  ['36%', '22%', '14%', '12%'],
  ['44%', '16%', '18%', '10%'],
  ['50%', '14%', '14%', '12%'],
  ['40%', '20%', '12%', '14%'],
  ['46%', '18%', '16%', '8%'],
];

export interface TablePageSkeletonProps {
  className?: string;
  showExtended?: boolean;
  elapsedMs?: number;
  label?: string;
}

/** Table list page — toolbar (search + 2 buttons), header, 10 data rows. */
export default function TablePageSkeleton({
  className = '',
  showExtended = false,
  elapsedMs = 0,
  label,
}: TablePageSkeletonProps) {
  return (
    <div className={`flex flex-1 flex-col min-h-0 anim-rise ${className}`} role="status" aria-busy aria-label={label ?? 'Se încarcă'}>
      {showExtended && <LoadingElapsed elapsedMs={elapsedMs} label={label} />}
      <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-line shrink-0">
        <Skeleton width={220} height={36} borderRadius="lg" waveIndex={0} />
        <div className="ml-auto flex gap-2">
          <Skeleton width={88} height={36} borderRadius="lg" waveIndex={1} />
          <Skeleton width={104} height={36} borderRadius="lg" waveIndex={2} />
        </div>
      </div>
      <div className="px-6 py-3 border-b border-line bg-surface-secondary/30 shrink-0">
        <div className="flex gap-6">
          {['22%', '18%', '16%', '14%'].map((w, i) => (
            <Skeleton key={i} width={w} height={10} waveIndex={i} />
          ))}
        </div>
      </div>
      <div className="flex flex-col divide-y divide-line/40 flex-1 overflow-hidden">
        {ROW_WIDTHS.map((cols, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-6 py-4 shrink-0"
            style={{ opacity: i % 2 === 0 ? 1 : 0.72 }}
          >
            <Skeleton width={16} height={16} borderRadius="sm" waveIndex={i % 3} className="shrink-0" />
            {cols.map((w, j) => (
              <Skeleton key={j} width={w} height={12} waveIndex={(i + j) % 3} className={j === 0 ? 'flex-1' : 'shrink-0'} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
