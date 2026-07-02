import { cn } from '@/v2/lib/cn';
import { useAnimatedValue } from '@/v2/analytics/hooks/useAnimatedValue';

export type ConnectionQualityProps = {
  /** Latency in ms — drives bar height and color */
  latencyMs: number;
  bars?: number;
  className?: string;
};

function barColor(latencyMs: number, index: number, total: number): string {
  const threshold = (index + 1) / total;
  const normalized = Math.min(1, latencyMs / 300);
  if (normalized <= threshold * 0.5) return 'bg-status-green';
  if (normalized <= threshold) return 'bg-status-amber';
  return 'bg-status-red/40';
}

export function ConnectionQuality({ latencyMs, bars = 4, className }: ConnectionQualityProps) {
  const animated = useAnimatedValue(latencyMs);

  return (
    <div
      className={cn('inline-flex items-end gap-0.5', className)}
      role="img"
      aria-label={`Connection latency ${Math.round(animated)} milliseconds`}
    >
      {Array.from({ length: bars }, (_, i) => {
        const active = animated <= ((i + 1) / bars) * 300;
        const height = 4 + (i + 1) * 3;
        return (
          <span
            key={i}
            className={cn(
              'w-1 rounded-sm transition-all duration-300',
              active ? barColor(animated, i, bars) : 'bg-muted',
            )}
            style={{ height: active ? height : 4 }}
          />
        );
      })}
    </div>
  );
}
