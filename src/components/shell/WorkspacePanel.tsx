import { useState, useCallback, memo } from 'react';
import {
  ChevronRight, PanelLeftClose, PanelLeft,
} from '@/icons';
import { useLayoutStore } from '@/store/layoutStore';

export interface SidebarItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
  group?: string;
}

interface WorkspacePanelProps {
  items: SidebarItem[];
  heading?: string;
}

function WorkspacePanel({
  items,
  heading,
}: WorkspacePanelProps) {
  const collapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((name: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, []);

  
  const groups: { name: string; items: SidebarItem[] }[] = [];
  let currentGroup: string | null = null;
  for (const item of items) {
    const g = item.group || '';
    if (g !== currentGroup || groups.length === 0) {
      groups.push({ name: g, items: [item] });
      currentGroup = g;
    } else {
      groups[groups.length - 1].items.push(item);
    }
  }

  return (
    <nav
      className="shell-workspace-panel relative flex flex-col shrink-0 bg-surface-nav border-r border-line select-none overflow-hidden"
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      {
}
      <div className={`flex items-center shrink-0 border-b border-line ${collapsed ? 'justify-center h-11' : 'h-11 px-3 justify-between gap-2'}`}>
        {}
        {!collapsed && heading && (
          <span className="min-w-0 text-pm-xs font-bold uppercase tracking-[0.08em] text-content-secondary truncate" title={heading}>
            {heading}
          </span>
        )}
        {}
        <button
          type="button"
          onClick={toggleSidebar}
          className={`h-6 w-6 rounded-lg inline-flex items-center justify-center text-content-muted hover:text-accent hover:bg-surface-nav-hover transition-smooth duration-150 active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:opacity-40 ${collapsed ? 'absolute -right-3 top-3 z-20 rounded-full border border-line bg-surface-secondary shadow-[var(--elevation-1)]' : ''}`}
          aria-label={collapsed ? 'Extinde panoul' : 'Restrânge panoul'}
        >
          {collapsed
            ? <PanelLeft className="h-3 w-3" />
            : <PanelLeftClose className="h-3 w-3" />
          }
        </button>
      </div>

      {}
      <div className="flex-1 flex flex-col pt-1.5 pb-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {groups.map((group, gi) => {
          const isGroupCollapsed = group.name ? collapsedGroups.has(group.name) : false;
          const hasActiveChild = group.items.some(i => i.isActive);

          return (
            <div key={gi} className={gi > 0 && group.name ? 'mt-0.5' : ''}>
              {}
              {group.name && (
                collapsed ? (
                  <div className="flex justify-center py-1.5">
                    <div className={`h-px w-5 ${hasActiveChild ? 'bg-accent' : 'bg-line'}`} />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.name)}
                    className="flex items-center w-full px-3 py-1.5 gap-1.5 group/hdr hover:bg-surface-nav-hover transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] rounded-lg mx-0.5"
                  >
                    <ChevronRight className={`h-2.5 w-2.5 shrink-0 text-content-muted transition-transform duration-150 ${isGroupCollapsed ? '' : 'rotate-90'}`} />
                    <span className="text-pm-2xs font-semibold uppercase tracking-[0.06em] text-content-muted min-w-0 flex-1 text-left truncate">
                      {group.name}
                    </span>
                  </button>
                )
              )}

              {}
              {!isGroupCollapsed && group.items.map((item) => {
                const Icon = item.icon;
                const hasBadge = item.badge != null && item.badge > 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.label}
                    onClick={item.onClick}
                    title={collapsed ? item.label : undefined}
                    className={`group relative flex items-center w-full transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] rounded-lg ${
                      collapsed ? 'justify-center h-9 mx-auto' : 'h-8 mx-0'
                    }`}
                  >
                    {}
                    <span
                      className={`absolute left-0 top-1 bottom-1 w-[3px] rounded-r transition-colors duration-150 ${
                        item.isActive
                          ? 'bg-accent shadow-[var(--glow-accent-sm)]'
                          : 'bg-transparent group-hover:bg-content-muted/20'
                      }`}
                    />

                    {}
                    <div
                      className={`flex items-center transition-smooth duration-150 min-w-0 ${
                        collapsed
                          ? `h-8 w-8 justify-center rounded-lg ${
                              item.isActive
                                ? 'text-accent bg-surface-nav-active'
                                : 'text-content-secondary hover:bg-surface-nav-hover hover:text-content-primary'
                            }`
                          : `flex-1 gap-2.5 mx-1 px-2.5 h-full rounded-lg ${
                              item.isActive
                                ? 'text-accent bg-surface-nav-active font-semibold'
                                : 'text-content-secondary hover:bg-surface-nav-hover hover:text-content-primary'
                            }`
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${
                        item.isActive ? 'text-accent' : ''
                      }`} />

                      {!collapsed && (
                        <span className={`text-pm-sm whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1 text-left ${
                          item.isActive ? 'font-semibold' : 'font-normal'
                        }`}>
                          {item.label}
                        </span>
                      )}

                      {}
                      {hasBadge && (
                        collapsed ? (
                          <span className="absolute right-1 top-0.5 h-2 w-2 rounded-full bg-status-red" />
                        ) : (
                          <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-status-red px-1 text-pm-2xs font-bold tabular-nums text-white">
                            {item.badge! > 99 ? '99' : item.badge}
                          </span>
                        )
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export default memo(WorkspacePanel);
