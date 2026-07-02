import type { ReactNode } from 'react';

export interface TabDescriptor<T extends string = string> {
  id: T;
  label: string;
  icon?: ReactNode;
  count?: number;
  disabled?: boolean;
}

interface TabsProps<T extends string> {
  tabs: TabDescriptor<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
  variant?: 'underline' | 'pill' | 'segmented';
}









export default function Tabs<T extends string>({
  tabs,
  activeId,
  onChange,
  className = '',
  variant = 'underline',
}: TabsProps<T>) {
  if (variant === 'segmented') {
    return (
      <div
        className={`inline-flex items-center gap-0.5 rounded-xl border border-line/70 bg-surface-secondary p-1 ${className}`}
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`relative flex min-w-0 items-center gap-1.5 h-8 px-3 rounded-lg text-pm-2xs font-semibold uppercase tracking-wide transition-smooth duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:pointer-events-none disabled:opacity-40 ${
                  isActive
                    ? 'bg-surface-primary text-content-primary shadow-[var(--elevation-1)]'
                    : 'text-content-muted hover:text-content-primary'
              }`}
            >
              {tab.icon && <span className="inline-flex shrink-0 items-center justify-center [&>svg]:h-3.5 [&>svg]:w-3.5">{tab.icon}</span>}
              <span className="truncate">{tab.label}</span>
              {tab.count != null && (
                <span className={`shrink-0 tabular-nums normal-case text-pm-2xs ${isActive ? 'text-accent' : 'text-content-muted/80'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center gap-1 rounded-full border border-line/70 bg-surface-secondary p-1 ${className}`}
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`flex min-w-0 items-center gap-1.5 h-8 px-3.5 rounded-full text-pm-xs font-semibold transition-smooth duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:pointer-events-none disabled:opacity-40 ${
                isActive
                  ? 'bg-accent-muted text-accent shadow-[var(--elevation-1)]'
                  : 'text-content-secondary hover:text-content-primary hover:bg-surface-tertiary'
              }`}
              aria-pressed={isActive}
            >
              {tab.icon && <span className="inline-flex shrink-0 items-center justify-center [&>svg]:h-3.5 [&>svg]:w-3.5">{tab.icon}</span>}
              <span className="truncate">{tab.label}</span>
              {tab.count != null && (
                <span className={`shrink-0 tabular-nums text-pm-2xs ${isActive ? 'text-accent/80' : 'text-content-muted/70'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 border-b border-line/70 ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            aria-pressed={isActive}
            className={`group relative flex min-w-0 items-center gap-2 px-4 h-10 text-pm-base font-medium transition-smooth duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] rounded-t-lg disabled:pointer-events-none disabled:opacity-40 ${
              isActive
                ? 'text-accent'
                : 'text-content-muted hover:text-content-primary hover:bg-surface-secondary/60'
            }`}
          >
            {tab.icon && <span className="inline-flex shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4">{tab.icon}</span>}
            <span className={`truncate ${isActive ? 'tracking-tight' : ''}`}>{tab.label}</span>
            {tab.count != null && tab.count > 0 && (
              <span className={`shrink-0 tabular-nums text-pm-2xs px-1.5 py-px rounded-full transition-colors ${
                isActive ? 'bg-accent-muted text-accent' : 'bg-surface-tertiary text-content-muted'
              }`}>
                {tab.count}
              </span>
            )}
            {}
            <span
              className={`ds-tab-indicator absolute left-3 right-3 -bottom-px h-[2px] rounded-full transition-smooth duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isActive ? 'bg-accent opacity-100'
                  : 'bg-accent/0 opacity-0 group-hover:opacity-40 group-hover:bg-content-muted'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
