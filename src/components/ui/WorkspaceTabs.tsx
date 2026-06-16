import type { ComponentType, ReactNode } from 'react';

export interface WorkspaceTab {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
}

interface WorkspaceTabsProps {
  tabs: WorkspaceTab[];
  active: string;
  onChange: (id: string) => void;
  title?: string;
  titleIcon?: ComponentType<{ className?: string }>;
  actions?: ReactNode;
}










export default function WorkspaceTabs({ tabs, active, onChange, title, titleIcon: TitleIcon, actions }: WorkspaceTabsProps) {
  if (!tabs?.length && !actions) return null;

  return (
    <div className="vt-ws-selector bg-surface-secondary border-b border-line shrink-0">
      <div className="mx-auto flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3">
          {title && (
            <div className="flex items-center gap-2">
              {TitleIcon && <TitleIcon className="h-4 w-4 text-content-secondary" />}
              <h1 className="text-pm-sm font-semibold text-content-primary">{title}</h1>
            </div>
          )}

          {tabs?.length ? (
            <nav className="flex flex-wrap items-center gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChange(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-pm-xs font-semibold transition-colors ${tab.id === active ? 'bg-surface-primary text-content-primary border-line' : 'bg-transparent text-content-muted border-transparent hover:bg-surface-primary hover:text-content-primary'}`}
                >
                  {tab.icon && <tab.icon className="h-3.5 w-3.5 text-current" />}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          ) : null}
        </div>

        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
