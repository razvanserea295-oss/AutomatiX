import { memo } from 'react';
import type { ComponentType, CSSProperties } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';

interface KpiCardProps {
  label: string;
  value: string | number;
  
  icon?: ComponentType<{ className?: string }>;
  
  iconColor?: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
  
  hint?: string;
  loading?: boolean;
  className?: string;
  
  vtName?: string;

  countUp?: boolean;
  /** Featured "hero" KPI — bigger figure, accent wash + border, raised elevation. */
  hero?: boolean;
  /** Slim variant — shorter card, smaller figure; a zero value is muted. For
   *  strips where the KPIs support a richer main view (e.g. a Kanban board) and
   *  shouldn't shout, especially when several read 0. */
  compact?: boolean;
}

const roNumber = new Intl.NumberFormat('ro-RO');
const roDecimal = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 1 });

const trendConfig = {
  up:   { Icon: TrendingUp,   color: 'text-status-green' },
  down: { Icon: TrendingDown, color: 'text-status-red' },
  flat: { Icon: Minus,        color: 'text-content-muted' },
};








function KpiCard({
  label,
  value,
  icon: Icon,
  iconColor,
  trend,
  trendValue,
  hint,
  loading = false,
  className = '',
  vtName,
  countUp = true,
  hero = false,
  compact = false,
}: KpiCardProps) {



  const isNum = typeof value === 'number' && Number.isFinite(value);
  // A literal-zero KPI carries no information — in compact strips, mute it so the
  // eye lands on the numbers that matter (HIG: don't give weight to nothing).
  const isZero = value === 0 || value === '0';
  const animated = useCountUp(isNum && countUp ? value : 0, { from: 0 });
  const display = !isNum
    ? value
    : !countUp
      ? (Number.isInteger(value) ? roNumber.format(value) : roDecimal.format(value))
      : Number.isInteger(value)
        ? roNumber.format(Math.round(animated))
        : roDecimal.format(animated);
  return (
    






    <div
      className={`group surface-card surface-lift perf-contain relative flex flex-col rounded-2xl ${compact ? 'px-4 py-3' : 'px-5 py-4'} ${
        hero
          ? 'bg-gradient-to-br from-accent-muted/55 via-surface-primary to-surface-primary border border-accent/30 shadow-[var(--elevation-3)] min-h-[116px]'
          : compact
            ? 'bg-surface-primary border border-line min-h-[64px]'
            : 'bg-surface-primary border border-line min-h-[96px]'
      } ${vtName ? 'vt-morph' : ''} ${className}`}
      style={vtName ? ({ viewTransitionName: vtName } as CSSProperties) : undefined}
    >
      {(iconColor || hero) && (
        <span
          className={`absolute left-0 top-4 bottom-4 rounded-r-full transition-all duration-300 group-hover:shadow-[0_0_8px_currentColor] group-hover:opacity-90 ${
            hero ? 'w-[4px] bg-accent' : `w-[3px] ${(iconColor || 'text-content-muted').replace('text-', 'bg-')}`
          }`}
          aria-hidden
        />
      )}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <p className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted leading-tight truncate">
          {label}
        </p>
        {Icon && (
          <Icon className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${hero ? 'text-accent' : (iconColor || 'text-content-muted')}`} aria-hidden />
        )}
      </div>
      {loading ? (
        <div className="mt-2 h-7 w-20 rounded-lg bg-surface-tertiary animate-pulse" />
      ) : (
        <div className={`${compact ? 'mt-1' : 'mt-2'} flex items-baseline gap-2 min-w-0`}>
          <span className={`font-semibold tabular-nums leading-none truncate tracking-[-0.02em] ${hero ? 'text-[30px]' : compact ? 'text-[20px]' : 'text-[28px]'} ${compact && isZero ? 'text-content-muted/50' : 'text-content-primary'}`}>
            {display}
          </span>
          {trend && trendValue && (
            <span className={`flex items-center gap-0.5 text-pm-xs font-semibold tabular-nums ${trendConfig[trend].color}`}>
              {(() => { const T = trendConfig[trend].Icon; return <T className="h-3 w-3" />; })()}
              {trendValue}
            </span>
          )}
        </div>
      )}
      {hint && !loading && (
        <p className="text-pm-2xs text-content-muted mt-auto pt-1.5 truncate">{hint}</p>
      )}
    </div>
  );
}



export default memo(KpiCard);
