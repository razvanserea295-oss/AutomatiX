import { ArrowDown, ArrowUp, Minus } from '@/icons';
import { cn } from '@/v2/lib/cn';

export type TrendDirection = 'up' | 'down' | 'neutral';

export type TrendIndicatorProps = {
  value: number;
  direction?: TrendDirection;
  label?: string;
  /** Delay fade-in until count-up completes */
  visible?: boolean;
  className?: string;
};

function resolveDirection(value: number, direction?: TrendDirection): TrendDirection {
  if (direction) return direction;
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'neutral';
}

export function TrendIndicator({
  value,
  direction,
  label,
  visible = true,
  className,
}: TrendIndicatorProps) {
  const dir = resolveDirection(value, direction);
  const Icon = dir === 'up' ? ArrowUp : dir === 'down' ? ArrowDown : Minus;
  const pct = `${value > 0 ? '+' : ''}${value.toLocaleString('ro-RO', { maximumFractionDigits: 1 })}%`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums',
        'analytics-trend',
        visible ? 'analytics-trend-visible' : 'opacity-0',
        dir === 'up' && 'bg-status-green/10 text-status-green',
        dir === 'down' && 'bg-status-red/10 text-status-red',
        dir === 'neutral' && 'text-muted-foreground',
        className,
      )}
      style={{ fontFeatureSettings: "'tnum'" }}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      <span>{pct}</span>
      {label && <span className="font-normal text-muted-foreground">{label}</span>}
    </span>
  );
}
