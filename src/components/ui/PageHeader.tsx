import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import Tabs, { type TabDescriptor } from './Tabs';
import { type BreadcrumbSegment } from './Breadcrumb';

interface PageHeaderProps<T extends string = string> {
  title: string;
  icon?: ReactNode;
  subtitle?: string;
  onBack?: () => void;
  
  breadcrumb?: BreadcrumbSegment[];
  
  children?: ReactNode;
  
  tabs?: TabDescriptor<T>[];
  activeTab?: T;
  onTabChange?: (id: T) => void;
}












export default function PageHeader<T extends string = string>({
  title,
  icon,
  subtitle,
  onBack,
  children,
  tabs,
  activeTab,
  onTabChange,
}: PageHeaderProps<T>) {
  const hasTabs = !!(tabs && tabs.length > 0 && activeTab != null && onTabChange);
  const hasActions = !!children;
  const hasBack = !!onBack;

  if (!hasTabs && !hasActions && !hasBack) return null;

  
  
  
  
  return (
    <div className="relative shrink-0 border-b border-line/70 bg-surface-secondary">
      {(hasBack || hasActions) && (
        <div className="flex items-center gap-3 px-5 h-12">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 h-8 px-3 rounded-md border border-line/80 text-pm-sm font-medium text-content-secondary hover:bg-surface-tertiary hover:text-content-primary hover:border-content-muted/40 flex items-center gap-1.5 transition-all duration-150 focus-ring-soft"
            >
              <ArrowLeft className="h-3 w-3" />
              Înapoi
            </button>
          )}

          {(icon || title) && (
            <div className="flex items-center gap-2 min-w-0">
              {icon && <span className="shrink-0 text-accent [&>svg]:h-[18px] [&>svg]:w-[18px]">{icon}</span>}
              {title && (
                <div className="min-w-0">
                  <h1 className="text-pm-md font-semibold tracking-tight text-content-primary truncate leading-tight">{title}</h1>
                  {subtitle && <p className="text-pm-2xs text-content-muted truncate leading-tight">{subtitle}</p>}
                </div>
              )}
            </div>
          )}

          <div className="flex-1" />

          {children && (
            <div className="flex items-center gap-2 shrink-0">
              {children}
            </div>
          )}
        </div>
      )}

      {hasTabs && (
        <div className="px-3 -mb-px">
          <Tabs<T> tabs={tabs!} activeId={activeTab!} onChange={onTabChange!} />
        </div>
      )}
    </div>
  );
}
