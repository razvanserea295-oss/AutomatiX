







import { memo, useMemo } from 'react';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  animate?: boolean;
  className?: string;
}

function Sparkline({ data, width = 100, height = 32, animate = true, className = '' }: SparklineProps) {
  const geo = useMemo(() => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const stepX = width / (data.length - 1);
    const pts = data.map((v, i) => [i * stepX, height - ((v - min) / span) * height] as const);
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `${line} L${width},${height} L0,${height} Z`;
    const last = pts[pts.length - 1];
    return { line, area, lx: last[0], ly: last[1] };
  }, [data, width, height]);

  if (!geo) return null;
  const gid = `spark-${width}x${height}-${data.length}`;

  return (
    <svg
      width="100%" height={height} viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none" aria-hidden="true"
      className={`ds-sparkline ${animate ? 'is-animated' : ''} ${className}`}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={geo.area} fill={`url(#${gid})`} />
      <path className="ds-spark-line" d={geo.line} pathLength={1} fill="none"
        stroke="var(--color-accent)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={geo.lx} cy={geo.ly} r="2.25" fill="var(--color-accent)" />
    </svg>
  );
}



export default memo(Sparkline);
