import type { ReactNode } from 'react';
import { ArrowLeft } from '@/icons';
import Breadcrumb, { type BreadcrumbSegment } from '@/redesign/ui/Breadcrumb';
import {
  PageHeaderCount,
  PageHeaderLastUpdated,
  PageHeaderMetaRow,
  PageHeaderMetricChip,
  type PageHeaderMetric,
} from '@/redesign/ui/PageHeaderMeta';
import Tabs, { type TabDescriptor } from '@/redesign/ui/Tabs';

export type { PageHeaderMetric };

interface PageHeaderProps<T extends string = string> {
  title: string;
  icon?: ReactNode;
  subtitle?: string;
  breadcrumb?: BreadcrumbSegment[] | ReactNode;
  count?: number | string;
  countLabel?: string;
  status?: ReactNode;
  meta?: ReactNode;
  metrics?: PageHeaderMetric[];
  lastUpdated?: Date | string | number | null;
  refreshing?: boolean;
  onBack?: () => void;
  children?: ReactNode;
  secondaryActions?: ReactNode;
  tabs?: TabDescriptor<T>[];
  activeTab?: T;
  onTabChange?: (id: T) => void;
}

export default function PageHeader<T extends string = string>({
  title,
  icon,
  subtitle,
  breadcrumb,
  count,
  countLabel,
  status,
  meta,
  metrics,
  lastUpdated,
  refreshing,
  onBack,
  children,
  secondaryActions,
  tabs,
  activeTab,
  onTabChange,
}: PageHeaderProps<T>) {
  const hasTabs = !!(tabs && tabs.length > 0 && activeTab != null && onTabChange);
  const hasBreadcrumb = breadcrumb != null && (Array.isArray(breadcrumb) ? breadcrumb.length > 0 : true);
  const hasMetrics = !!(metrics && metrics.length > 0);
  const hasMetaRow = hasMetrics || meta || lastUpdated;

  return (
    <div className="pm-page-header relative shrink-0 border-b border-line/60 bg-surface-secondary">
      {hasBreadcrumb && (
        <div className="px-6 pt-2.5 pb-0 min-w-0">
          {Array.isArray(breadcrumb) ? <Breadcrumb segments={breadcrumb} /> : breadcrumb}
        </div>
      )}

      <div className="pm-page-header-bar flex min-h-[52px] flex-wrap items-center gap-3 px-6 py-2.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface-primary px-2.5 text-pm-xs font-medium text-content-secondary transition-smooth hover:bg-surface-tertiary hover:text-content-primary active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Înapoi
          </button>
        )}

        {(icon || title) && (
          <div className="flex min-w-0 flex-1 items-start gap-2">
            {icon && (
              <span
                data-page-icon
                className="inline-flex shrink-0 items-center justify-center text-accent [&>svg]:h-[18px] [&>svg]:w-[18px]"
              >
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="truncate text-pm-md font-semibold leading-tight tracking-tight text-content-primary">
                  {title}
                </h1>
                {count != null && <PageHeaderCount count={count} label={countLabel} />}
                {status}
              </div>
              {subtitle && (
                <p className="truncate text-pm-2xs leading-tight text-content-muted">{subtitle}</p>
              )}
              {hasMetaRow && (
                <PageHeaderMetaRow>
                  {metrics?.map((m) => (
                    <PageHeaderMetricChip key={m.label} {...m} />
                  ))}
                  {meta}
                  <PageHeaderLastUpdated at={lastUpdated} refreshing={refreshing} />
                </PageHeaderMetaRow>
              )}
            </div>
          </div>
        )}

        {(secondaryActions || children) && (
          <div className="flex shrink-0 items-center gap-2">
            {secondaryActions}
            {children}
          </div>
        )}
      </div>

      {hasTabs && (
        <div className="px-3 -mb-px">
          <Tabs<T> tabs={tabs!} activeId={activeTab!} onChange={onTabChange!} />
        </div>
      )}
    </div>
  );
}
