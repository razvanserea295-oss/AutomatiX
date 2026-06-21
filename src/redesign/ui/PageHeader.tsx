import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import Tabs, { type TabDescriptor } from '@/redesign/ui/Tabs';
import { type BreadcrumbSegment } from '@/redesign/ui/Breadcrumb';

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
    <div className="relative shrink-0 border-b border-line/60 bg-surface-secondary surface-frost">
      {(hasBack || hasActions) && (
        <div className="flex items-center gap-3 px-5 h-14">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-line text-pm-sm font-medium text-content-secondary bg-surface-primary transition-smooth duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-surface-tertiary hover:text-content-primary active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Înapoi
            </button>
          )}

          {(icon || title) && (
            <div className="flex items-center gap-2 min-w-0">
              {icon && <span className="shrink-0 inline-flex items-center justify-center text-accent [&>svg]:h-[18px] [&>svg]:w-[18px]">{icon}</span>}
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
