import type { ReactNode } from 'react';
import { cn } from '@/v2/lib/cn';
import { useDashboardEntrance } from '@/v2/analytics/hooks/useDashboardEntrance';

export type DashboardWidget = {
  id: string;
  colSpan?: number;
  rowSpan?: number;
  children: ReactNode;
};

export type DashboardGridProps = {
  toolbar?: ReactNode;
  breadcrumbs?: ReactNode;
  kpis?: ReactNode;
  charts?: ReactNode;
  table?: ReactNode;
  secondary?: ReactNode;
  widgets?: DashboardWidget[];
  className?: string;
};

export function DashboardGrid({
  toolbar,
  breadcrumbs,
  kpis,
  charts,
  table,
  secondary,
  widgets,
  className,
}: DashboardGridProps) {
  const { isVisible } = useDashboardEntrance();

  return (
    <div className={cn('analytics-dashboard flex flex-col gap-[var(--density-gap-section)]', className)}>
      {(toolbar || breadcrumbs) && (
        <div
          className={cn(
            'analytics-dash-toolbar density-toolbar flex flex-wrap items-center justify-between',
            isVisible('toolbar') ? 'analytics-entrance-visible' : 'analytics-entrance-hidden',
          )}
        >
          {breadcrumbs}
          {toolbar}
        </div>
      )}

      {kpis && (
        <div
          className={cn(
            'analytics-dash-kpis analytics-kpi-strip grid grid-cols-12 gap-[var(--density-gap-card)]',
            isVisible('kpis') ? 'analytics-entrance-kpi' : 'analytics-entrance-hidden',
          )}
        >
          {kpis}
        </div>
      )}

      <div
        className={cn(
          'analytics-dash-main min-h-0 flex-1',
          isVisible('content') ? 'analytics-entrance-content' : 'analytics-entrance-hidden',
        )}
      >
        {widgets ? (
          <div className="analytics-widget-grid grid grid-cols-12 gap-[var(--density-gap-card)] auto-rows-[minmax(64px,auto)]">
            {widgets.map((w, i) => (
              <div
                key={w.id}
                className={cn(
                  'analytics-widget rounded-lg border bg-card p-[var(--density-card-p-compact)]',
                  isVisible('charts') && 'analytics-entrance-widget',
                )}
                style={{
                  gridColumn: `span ${w.colSpan ?? 6}`,
                  gridRow: `span ${w.rowSpan ?? 2}`,
                  animationDelay: `${i * 60}ms`,
                }}
              >
                {w.children}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid min-h-0 gap-[var(--density-gap-card)] lg:grid-cols-12">
            {charts && (
              <div
                className={cn(
                  'lg:col-span-8',
                  isVisible('charts') ? 'analytics-entrance-charts' : 'analytics-entrance-hidden',
                )}
              >
                {charts}
              </div>
            )}
            {secondary && (
              <div
                className={cn(
                  'lg:col-span-4',
                  isVisible('secondary') ? 'analytics-entrance-secondary' : 'analytics-entrance-hidden',
                )}
              >
                {secondary}
              </div>
            )}
            {table && (
              <div
                className={cn(
                  'lg:col-span-12',
                  isVisible('table') ? 'analytics-entrance-table' : 'analytics-entrance-hidden',
                )}
              >
                {table}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
