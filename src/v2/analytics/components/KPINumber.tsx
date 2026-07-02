import { cn } from '@/v2/lib/cn';
import { useCountUp, type CountUpFormat } from '@/v2/analytics/hooks/useCountUp';

export type KPINumberSize = 'md' | 'lg' | 'hero';

const SIZE_CLASS: Record<KPINumberSize, string> = {
  md: 'density-kpi-value text-[length:var(--density-fs-kpi-value)]',
  lg: 'density-kpi-value text-[length:var(--density-fs-kpi-value)]',
  hero: 'density-kpi-value text-[calc(var(--density-fs-kpi-value)*1.15)]',
};

export type KPINumberProps = {
  value: number;
  format?: CountUpFormat;
  locale?: string;
  currency?: string;
  decimals?: number;
  size?: KPINumberSize;
  className?: string;
  fixedWidth?: string;
  onCountComplete?: () => void;
};

export function KPINumber({
  value,
  format = 'integer',
  locale,
  currency,
  decimals,
  size = 'lg',
  className,
  fixedWidth,
  onCountComplete,
}: KPINumberProps) {
  const { formatted, flash } = useCountUp(value, {
    format,
    locale,
    currency,
    decimals,
    onComplete: onCountComplete,
  });

  return (
    <span
      className={cn(
        'inline-block font-bold tabular-nums text-foreground',
        SIZE_CLASS[size],
        flash === 'increase' && 'analytics-kpi-flash-up',
        flash === 'decrease' && 'analytics-kpi-flash-down',
        flash === 'neutral' && 'analytics-kpi-flash-neutral',
        className,
      )}
      style={{
        fontFeatureSettings: "'tnum'",
        ...(fixedWidth ? { minWidth: fixedWidth, display: 'inline-block' } : undefined),
      }}
    >
      {formatted}
    </span>
  );
}
