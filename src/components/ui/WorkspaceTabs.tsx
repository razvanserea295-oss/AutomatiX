import type { ComponentType, ReactNode } from 'react';
import { useLayoutStore } from '@/store/layoutStore';

export interface WorkspaceTab {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  prefetch?: () => void;
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
  const collapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const w = collapsed ? 56 : 220;

  if (!tabs?.length && !actions && !title) return null;

  return (
    <div
      className="vt-ws-selector bg-surface-secondary border-r border-line shrink-0 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden surface-frost"
      style={{ width: w }}
    >
      {/* Title — hidden when collapsed */}
      {!collapsed && title && (
        <div className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0">
          {TitleIcon && <TitleIcon className="h-4 w-4 text-content-secondary shrink-0" />}
          <h1 className="text-pm-sm font-semibold text-content-primary truncate">{title}</h1>
        </div>
      )}

      {/* Tab buttons — vertical list */}
      {tabs?.length ? (
        <nav className="flex flex-col gap-0.5 px-2 py-2 flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                onMouseEnter={() => tab.prefetch?.()}
                title={collapsed ? tab.label : undefined}
                className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-pm-xs font-semibold transition-all duration-150 active:scale-[0.98] w-full text-left ${
                  isActive
                    ? 'bg-surface-nav-active text-accent shadow-[inset_2px_0_0_var(--color-accent)]'
                    : 'text-content-muted hover:bg-surface-nav-hover hover:text-content-primary'
                }`}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0 text-current" />}
                {!collapsed && <span className="truncate">{tab.label}</span>}
              </button>
            );
          })}
        </nav>
      ) : null}

      {/* Actions — shown at bottom, only when expanded */}
      {!collapsed && actions ? (
        <div className="px-3 pb-3 shrink-0 border-t border-line pt-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
