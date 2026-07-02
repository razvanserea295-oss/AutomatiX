







import { useCountUp } from '@/hooks/useCountUp';

export type MetricSize = 'regular' | 'display' | 'display-lg';

const SIZE: Record<MetricSize, string> = {
  regular: 'text-pm-2xl leading-none',
  display: 'text-display',
  'display-lg': 'text-display-lg',
};

const defaultFormat = (n: number) => new Intl.NumberFormat('ro-RO').format(Math.round(n));

export interface MetricValueProps {
  value: number;
  format?: (n: number) => string;
  size?: MetricSize;
  warn?: boolean;
  
  countUp?: boolean;
  className?: string;
}

export default function MetricValue({
  value, format = defaultFormat, size = 'display', warn = false, countUp = true, className = '',
}: MetricValueProps) {
  
  const animated = useCountUp(value);
  const shown = format(countUp ? animated : value);
  return (
    <span
      className={`${SIZE[size]} inline-block font-semibold tracking-tight tabular-nums ${warn ? 'text-status-red' : 'text-content-primary'} ${className}`}
      style={{ fontFeatureSettings: "'tnum'" }}
    >
      {shown}
    </span>
  );
}
