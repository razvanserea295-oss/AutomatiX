import { useCallback, useEffect, useId, useState } from 'react';
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/v2/lib/cn';
import { useReducedMotion } from '@/v2/hooks/useReducedMotion';
import { CHART_PALETTE } from '@/v2/analytics/lib/easing';

export type BarChartOrientation = 'vertical' | 'horizontal';
export type BarChartVariant = 'single' | 'grouped' | 'stacked';

export type AnalyticsBarChartProps<T extends Record<string, unknown>> = {
  data: T[];
  categoryKey: keyof T & string;
  series: { key: keyof T & string; label?: string; color?: string }[];
  variant?: BarChartVariant;
  orientation?: BarChartOrientation;
  height?: number;
  className?: string;
  formatValue?: (v: number) => string;
};

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
};

export function AnalyticsBarChart<T extends Record<string, unknown>>({
  data,
  categoryKey,
  series,
  variant = 'single',
  orientation = 'vertical',
  height = 280,
  className,
  formatValue = (v) => v.toLocaleString('ro-RO'),
}: AnalyticsBarChartProps<T>) {
  const reduced = useReducedMotion();
  const gradId = useId().replace(/:/g, '');
  const [hovered, setHovered] = useState<string | null>(null);
  const [gridVisible, setGridVisible] = useState(reduced);
  const [labelsVisible, setLabelsVisible] = useState(reduced);

  const maxBars = data.length;
  const animationCompleteDelay = reduced ? 0 : 500 + maxBars * 40 + 200;

  useEffect(() => {
    if (reduced) return undefined;
    const gridTimer = window.setTimeout(() => setGridVisible(true), animationCompleteDelay);
    const labelTimer = window.setTimeout(() => setLabelsVisible(true), animationCompleteDelay + 100);
    return () => {
      window.clearTimeout(gridTimer);
      window.clearTimeout(labelTimer);
    };
  }, [animationCompleteDelay, reduced]);

  const isHorizontal = orientation === 'horizontal';
  const stackId = variant === 'stacked' ? 'stack' : undefined;

  const onBarEnter = useCallback((key: string) => setHovered(key), []);
  const onBarLeave = useCallback(() => setHovered(null), []);

  return (
    <div className={cn('analytics-chart analytics-bar-chart', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={!isHorizontal}
            horizontal={isHorizontal}
            className={cn('analytics-chart-grid', gridVisible && 'analytics-chart-grid-visible')}
          />
          {isHorizontal ? (
            <>
              <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey={categoryKey}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, opacity: labelsVisible ? 1 : 0 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                width={80}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={categoryKey}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, opacity: labelsVisible ? 1 : 0 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
            </>
          )}
          <Tooltip
            cursor={{ fill: 'hsl(var(--primary) / 0.08)' }}
            contentStyle={tooltipStyle}
            formatter={(v: number, name: string) => [formatValue(Number(v)), name]}
          />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {series.map((s, si) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label ?? s.key}
              stackId={stackId}
              fill={variant === 'single' ? `url(#${gradId})` : (s.color ?? CHART_PALETTE[si % CHART_PALETTE.length])}
              radius={[4, 4, 0, 0]}
              isAnimationActive={!reduced}
              animationDuration={500}
              animationEasing="ease-out"
              animationBegin={si * 40}
              onMouseEnter={() => onBarEnter(s.key)}
              onMouseLeave={onBarLeave}
            >
              {data.map((_entry, i) => {
                const dimmed = hovered !== null && hovered !== s.key;
                return (
                  <Cell
                    key={`${s.key}-${i}`}
                    fillOpacity={dimmed ? 0.4 : 1}
                    className="analytics-bar-cell"
                  />
                );
              })}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
