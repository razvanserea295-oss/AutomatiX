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
}: KpiCardProps) {
  
  
  
  const isNum = typeof value === 'number' && Number.isFinite(value);
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
      className={`group surface-card surface-lift perf-contain relative flex flex-col bg-surface-primary rounded-2xl border border-line px-5 py-4 min-h-[96px] ${vtName ? 'vt-morph' : ''} ${className}`}
      style={vtName ? ({ viewTransitionName: vtName } as CSSProperties) : undefined}
    >
      {iconColor && (
        <span
          className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full transition-all duration-300 ${iconColor.replace('text-', 'bg-')} group-hover:shadow-[0_0_8px_currentColor] group-hover:opacity-90`}
          aria-hidden
        />
      )}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <p className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted leading-tight truncate">
          {label}
        </p>
        {Icon && (
          <Icon className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${iconColor || 'text-content-muted'}`} aria-hidden />
        )}
      </div>
      {loading ? (
        <div className="mt-2 h-7 w-20 rounded-lg bg-surface-tertiary animate-pulse" />
      ) : (
        <div className="mt-2 flex items-baseline gap-2 min-w-0">
          <span className="text-[28px] font-semibold tabular-nums text-content-primary leading-none truncate tracking-[-0.02em]">
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
