import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/v2/lib/cn';
import { useReducedMotion } from '@/v2/hooks/useReducedMotion';
import { CHART_PALETTE } from '@/v2/analytics/lib/easing';

export type AnalyticsLineChartProps<T extends Record<string, unknown>> = {
  data: T[];
  xKey: keyof T & string;
  series: { key: keyof T & string; label?: string; color?: string }[];
  height?: number;
  referenceValue?: number;
  referenceLabel?: string;
  enableZoom?: boolean;
  className?: string;
  formatValue?: (v: number) => string;
};

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
};

export function AnalyticsLineChart<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  height = 280,
  referenceValue,
  referenceLabel = 'Target',
  enableZoom = false,
  className,
  formatValue = (v) => v.toLocaleString('ro-RO'),
}: AnalyticsLineChartProps<T>) {
  const reduced = useReducedMotion();
  const [areaVisible, setAreaVisible] = useState(reduced);
  const [windowStart, setWindowStart] = useState(0);
  const [windowSize, setWindowSize] = useState(data.length);
  const dragRef = useRef<{ x: number; start: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleData = useMemo(() => {
    if (!enableZoom) return data;
    const start = Math.max(0, Math.min(windowStart, data.length - 1));
    const end = Math.min(data.length, start + Math.max(2, windowSize));
    return data.slice(start, end);
  }, [data, enableZoom, windowStart, windowSize]);

  useEffect(() => {
    if (reduced) {
      setAreaVisible(true);
      return;
    }
    const t = window.setTimeout(() => setAreaVisible(true), 1200);
    return () => window.clearTimeout(t);
  }, [reduced, data]);

  useEffect(() => {
    setWindowStart(0);
    setWindowSize(data.length);
  }, [data.length]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!enableZoom) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      setWindowSize((s) => Math.max(3, Math.min(data.length, s + delta * 2)));
    },
    [enableZoom, data.length],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enableZoom) return;
      dragRef.current = { x: e.clientX, start: windowStart };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [enableZoom, windowStart],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !enableZoom) return;
      const dx = e.clientX - dragRef.current.x;
      const step = Math.round(dx / 12);
      const next = Math.max(0, Math.min(data.length - windowSize, dragRef.current.start - step));
      setWindowStart(next);
    },
    [enableZoom, data.length, windowSize],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onDoubleClick = useCallback(() => {
    setWindowStart(0);
    setWindowSize(data.length);
  }, [data.length]);

  const lastValue = visibleData.length
    ? Number(visibleData[visibleData.length - 1][series[0]?.key])
    : 0;
  const nearRef =
    referenceValue !== undefined &&
    Math.abs(lastValue - referenceValue) / (referenceValue || 1) < 0.05;

  return (
    <div
      ref={containerRef}
      className={cn('analytics-chart analytics-line-chart', enableZoom && 'analytics-chart-zoomable', className)}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={visibleData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
          />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            cursor={{ stroke: 'hsl(var(--primary))', strokeOpacity: 0.25 }}
            contentStyle={tooltipStyle}
            formatter={(v: number, name: string) => [formatValue(Number(v)), name]}
          />
          {referenceValue !== undefined && (
            <ReferenceLine
              y={referenceValue}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              className={cn(nearRef && 'analytics-ref-glow')}
              label={{
                value: referenceLabel,
                position: 'right',
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 10,
              }}
            />
          )}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label ?? s.key}
              stroke={s.color ?? CHART_PALETTE[i % CHART_PALETTE.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                className: 'analytics-line-dot-active',
              }}
              isAnimationActive={!reduced}
              animationDuration={1000}
              animationEasing="ease-out"
              animationBegin={i * 150}
              className={cn(!reduced && 'analytics-line-draw')}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
      {!reduced && (
        <div
          className={cn('analytics-line-area-overlay pointer-events-none', areaVisible && 'is-visible')}
          aria-hidden
        />
      )}
    </div>
  );
}
