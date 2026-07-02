import { useEffect, useId, useState } from 'react';
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/v2/lib/cn';
import { useReducedMotion } from '@/v2/hooks/useReducedMotion';

export type AnalyticsAreaChartProps<T extends Record<string, unknown>> = {
  data: T[];
  xKey: keyof T & string;
  yKey: keyof T & string;
  height?: number;
  color?: string;
  referenceValue?: number;
  referenceLabel?: string;
  className?: string;
  formatValue?: (v: number) => string;
};

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
};

export function AnalyticsAreaChart<T extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  height = 280,
  color = 'hsl(var(--primary))',
  referenceValue,
  referenceLabel = 'Avg',
  className,
  formatValue = (v) => v.toLocaleString('ro-RO'),
}: AnalyticsAreaChartProps<T>) {
  const reduced = useReducedMotion();
  const gradId = useId().replace(/:/g, '');
  const [fillVisible, setFillVisible] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setFillVisible(true);
      return;
    }
    const t = window.setTimeout(() => setFillVisible(true), 1200);
    return () => window.clearTimeout(t);
  }, [reduced, data]);

  const lastValue = data.length ? Number(data[data.length - 1][yKey]) : 0;
  const nearRef =
    referenceValue !== undefined &&
    Math.abs(lastValue - referenceValue) / (referenceValue || 1) < 0.05;

  return (
    <div className={cn('analytics-chart analytics-area-chart', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
          />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            cursor={{ stroke: color, strokeOpacity: 0.3 }}
            contentStyle={tooltipStyle}
            formatter={(v: number) => [formatValue(Number(v)), '']}
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
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            fillOpacity={fillVisible ? 1 : 0}
            className={cn('analytics-area-fill', fillVisible && 'is-visible')}
            dot={false}
            activeDot={{ r: 4, className: 'analytics-line-dot-active' }}
            isAnimationActive={!reduced}
            animationDuration={1000}
            animationEasing="ease-out"
          />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={!reduced}
            animationDuration={1000}
            className={cn(!reduced && 'analytics-line-draw')}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
