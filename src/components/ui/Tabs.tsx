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
        className={`inline-flex items-center rounded-md bg-surface-tertiary/40 p-0.5 ring-1 ring-line/40 ${className}`}
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
              className={`relative flex items-center gap-1 px-2.5 h-6 rounded-[5px] text-pm-2xs font-semibold uppercase tracking-wide transition-smooth duration-150 focus-ring-soft ${
                isActive
                  ? 'bg-surface-primary text-content-primary shadow-[var(--elevation-1)]'
                  : 'text-content-muted hover:text-content-primary disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count != null && (
                <span className={`tabular-nums normal-case text-pm-2xs ${isActive ? 'text-accent' : 'text-content-muted/80'}`}>
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
      <div className={`inline-flex items-center gap-0.5 rounded-lg bg-surface-tertiary/50 p-1 ring-1 ring-line/50 ${className}`}>
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium transition-smooth duration-150 focus-ring-soft ${
                isActive
                  ? 'bg-surface-primary text-content-primary shadow-[var(--elevation-1)] ring-1 ring-line/40'
                  : 'text-content-muted hover:text-content-primary hover:bg-surface-primary/40 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
              aria-pressed={isActive}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count != null && (
                <span className={`tabular-nums text-pm-2xs ${isActive ? 'text-content-muted' : 'text-content-muted/70'}`}>
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
    <div className={`flex items-center gap-0 border-b border-line/70 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            aria-pressed={isActive}
            className={`group relative flex items-center gap-2 px-4 h-10 text-pm-base font-medium transition-smooth duration-150 focus-ring-soft ${
              isActive
                ? 'text-accent'
                : 'text-content-muted hover:text-content-primary disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {tab.icon}
            <span className={isActive ? 'tracking-tight' : ''}>{tab.label}</span>
            {tab.count != null && tab.count > 0 && (
              <span className={`tabular-nums text-pm-2xs px-1.5 py-px rounded-full transition-colors ${
                isActive ? 'bg-accent/15 text-accent ring-1 ring-accent/20' : 'bg-surface-tertiary text-content-muted'
              }`}>
                {tab.count}
              </span>
            )}
            {}
            <span
              className={`absolute left-3 right-3 -bottom-px h-[2px] rounded-t transition-smooth duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isActive
                  ? 'bg-accent opacity-100 shadow-[0_0_8px_var(--color-accent)]'
                  : 'bg-accent/0 opacity-0 group-hover:opacity-30 group-hover:bg-content-muted'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
