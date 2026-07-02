import { memo, useEffect, useRef } from 'react';
import type { ComponentType } from 'react';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/cn';

export interface KpiProps {
  label: string;
  value: string | number;
  icon?: ComponentType<{ className?: string }>;
  iconColor?: string;
  hint?: string;
  loading?: boolean;
  locked?: boolean;
  className?: string;
  /** @deprecated ignored — one KPI style only */
  hero?: boolean;
  compact?: boolean;
  muted?: boolean;
  countUp?: boolean;
  vtName?: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
}

const ro = new Intl.NumberFormat('ro-RO');

function Kpi({
  label,
  value,
  icon: Icon,
  iconColor,
  hint,
  loading,
  locked,
  className = '',
  vtName,
  trend,
  trendValue,
  countUp = true,
}: KpiProps) {
  const numericValue = typeof value === 'number' && Number.isFinite(value) ? value : null;
  const animated = useCountUp(numericValue ?? 0, { duration: 600 });
  const prevRef = useRef(numericValue);
  const flashRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (numericValue !== null && prevRef.current !== null && prevRef.current !== numericValue) {
      flashRef.current?.classList.remove('ds-kpi-value-flash');
      void flashRef.current?.offsetWidth;
      flashRef.current?.classList.add('ds-kpi-value-flash');
    }
    prevRef.current = numericValue;
  }, [numericValue]);

  const display = locked
    ? '—'
    : numericValue !== null
      ? ro.format(countUp ? animated : numericValue)
      : value;

  const trendTone = trend === 'up'
    ? 'bg-status-green/10 text-status-green'
    : trend === 'down'
      ? 'bg-status-red/10 text-status-red'
      : 'bg-surface-tertiary text-content-muted';
  const showTrend = !!(trend && trendValue && !loading && !locked);

  return (
    <div
      className={cn(
        'ds-card ds-card--interactive pm-kpi surface-card ixn-border-hover relative flex h-full min-h-[var(--density-kpi-h)] flex-col overflow-hidden rounded-xl border border-line/60 bg-surface-primary px-4 py-4 sm:px-6',
        className,
      )}
      style={vtName ? { viewTransitionName: vtName } : undefined}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="truncate text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">{label}</p>
        <div className="flex shrink-0 items-center gap-2">
          {showTrend && (
            <span
              className={cn(
                'anim-fade-in inline-flex h-5 items-center rounded-md px-1.5 text-pm-2xs font-semibold leading-none',
                trendTone,
              )}
              style={{ animationDelay: '100ms' }}
            >
              {trendValue}
            </span>
          )}
          {Icon && <Icon className={cn('h-4 w-4 shrink-0', iconColor || 'text-content-muted')} aria-hidden />}
        </div>
      </div>
      {loading ? (
        <div className="mt-2 min-h-8 space-y-2" aria-hidden>
          <div className="ds-skeleton h-7 w-24 rounded-lg" />
          <div className="ds-skeleton h-2 w-16 rounded" />
        </div>
      ) : (
        <p
          ref={flashRef}
          className={cn(
            'anim-count-up mt-2 min-h-8 text-pm-2xl font-semibold leading-none tabular-nums',
            locked ? 'text-content-muted' : 'text-content-primary',
          )}
        >
          {display}
        </p>
      )}
      {hint && !loading && (
        <p className="mt-1 truncate text-pm-2xs text-content-muted">{hint}</p>
      )}
    </div>
  );
}

export default memo(Kpi);
export { Kpi as KpiCard };
