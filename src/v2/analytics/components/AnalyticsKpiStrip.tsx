import { Children, type ReactNode } from 'react';
import { cn } from '@/v2/lib/cn';
import { useDashboardEntrance } from '@/v2/analytics/hooks/useDashboardEntrance';

export type AnalyticsKpiStripProps = {
  children: ReactNode;
  className?: string;
};

/** KPI row with orchestrated stagger entrance — use on analytics dashboards */
export function AnalyticsKpiStrip({ children, className }: AnalyticsKpiStripProps) {
  const { isVisible } = useDashboardEntrance();

  return (
    <div
      className={cn(
        'analytics-kpi-strip grid shrink-0 grid-cols-12 gap-[var(--density-gap-card)]',
        isVisible('kpis') ? 'analytics-entrance-kpi' : 'analytics-entrance-hidden',
        className,
      )}
    >
      {Children.toArray(children).map((child, i) => (
        <div key={i} className="col-span-12 sm:col-span-6 xl:col-span-3">
          {child}
        </div>
      ))}
    </div>
  );
}
