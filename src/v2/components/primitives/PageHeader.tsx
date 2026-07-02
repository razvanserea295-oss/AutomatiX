import type { ReactNode } from 'react';
import { ArrowLeft } from '@/icons';
import Tabs, { type TabDescriptor } from '@/v2/components/primitives/Tabs';

interface PageHeaderProps<T extends string = string> {
  title: string;
  icon?: ReactNode;
  subtitle?: string;
  onBack?: () => void;
  children?: ReactNode;
  tabs?: TabDescriptor<T>[];
  activeTab?: T;
  onTabChange?: (id: T) => void;
}

export default function PageHeader<T extends string = string>({
  title, icon, subtitle, onBack, children, tabs, activeTab, onTabChange,
}: PageHeaderProps<T>) {
  const hasTabs = !!(tabs && tabs.length > 0 && activeTab != null && onTabChange);

  return (
    <div className="pm-page-header relative shrink-0 border-b border-line/60 bg-surface-secondary surface-frost">
      <div className="pm-page-header-bar flex flex-wrap items-center gap-3 px-6 min-h-[56px] py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-line text-pm-sm font-medium text-content-secondary bg-surface-primary transition-smooth hover:bg-surface-tertiary hover:text-content-primary active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Înapoi
          </button>
        )}
        {(icon || title) && (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {icon && <span className="shrink-0 inline-flex items-center justify-center text-accent [&>svg]:h-[18px] [&>svg]:w-[18px]">{icon}</span>}
            <div className="min-w-0">
              <h1 className="text-pm-md font-semibold tracking-tight text-content-primary truncate leading-tight">{title}</h1>
              {subtitle && <p className="text-pm-2xs text-content-muted truncate leading-tight">{subtitle}</p>}
            </div>
          </div>
        )}
        {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
      </div>
      {hasTabs && (
        <div className="px-3 -mb-px">
          <Tabs<T> tabs={tabs!} activeId={activeTab!} onChange={onTabChange!} />
        </div>
      )}
    </div>
  );
}
