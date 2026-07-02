import { useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/v2/components/ui/card';
import { cn } from '@/v2/lib/cn';
import { KPINumber, type KPINumberProps } from '@/v2/analytics/components/KPINumber';
import { TrendIndicator, type TrendIndicatorProps } from '@/v2/analytics/components/TrendIndicator';
import AnalyticsSparkline from '@/v2/analytics/components/Sparkline';
import { useReducedMotion } from '@/v2/hooks/useReducedMotion';

export type KPICardProps = {
  label: string;
  value: number;
  format?: KPINumberProps['format'];
  currency?: string;
  trend?: Omit<TrendIndicatorProps, 'visible'>;
  sparkline?: number[];
  hint?: string;
  icon?: ReactNode;
  hero?: boolean;
  anomaly?: boolean;
  className?: string;
};

export function KPICard({
  label,
  value,
  format,
  currency,
  trend,
  sparkline,
  hint,
  icon,
  hero,
  anomaly,
  className,
}: KPICardProps) {
  const reduced = useReducedMotion();
  const [countDone, setCountDone] = useState(reduced);

  return (
    <Card
      className={cn(
        'analytics-kpi-card density-kpi shadow-none',
        hero && 'border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card',
        anomaly && 'analytics-kpi-anomaly',
        className,
      )}
    >
      <CardHeader className="flex-row items-start justify-between space-y-0 p-[var(--density-card-p-compact)] pb-0">
        <CardTitle className="density-kpi-label mb-0 text-muted-foreground">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="space-y-1 p-[var(--density-card-p-compact)] pt-0">
        <KPINumber
          value={value}
          format={format}
          currency={currency}
          size={hero ? 'hero' : 'lg'}
          onCountComplete={() => setCountDone(true)}
        />
        {trend && (
          <TrendIndicator {...trend} visible={countDone} />
        )}
        {sparkline && sparkline.length > 1 && (
          <div className="pt-1">
            <AnalyticsSparkline data={sparkline} height={hero ? 44 : 32} />
          </div>
        )}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
