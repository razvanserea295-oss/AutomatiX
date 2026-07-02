import { memo, useId, useMemo } from 'react';
import { cn } from '@/v2/lib/cn';
import { useReducedMotion } from '@/v2/hooks/useReducedMotion';

export type AnalyticsSparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  stroke?: string;
};

function AnalyticsSparkline({
  data,
  width = 120,
  height = 36,
  className,
  stroke = 'hsl(var(--primary))',
}: AnalyticsSparklineProps) {
  const reduced = useReducedMotion();
  const uid = useId();
  const gid = `spark-grad-${uid.replace(/:/g, '')}`;

  const geo = useMemo(() => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const stepX = width / (data.length - 1);
    const pts = data.map((v, i) => [i * stepX, height - ((v - min) / span) * height] as const);
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `${line} L${width},${height} L0,${height} Z`;
    return { line, area };
  }, [data, width, height]);

  if (!geo) return null;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
      className={cn('analytics-sparkline', !reduced && 'analytics-sparkline-animated', className)}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.2} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={geo.area} fill={`url(#${gid})`} className="analytics-sparkline-area" />
      <path
        d={geo.line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
        className="analytics-sparkline-line"
      />
    </svg>
  );
}

export default memo(AnalyticsSparkline);
