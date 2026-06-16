import { useState, useCallback, memo } from 'react';
import {
  LogOut, ChevronRight, PanelLeftClose, PanelLeft,
} from 'lucide-react';
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
  onLogout: () => void;
}

function WorkspacePanel({
  items,
  heading,
  onLogout,
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
      className="relative flex flex-col shrink-0 bg-surface-nav border-r border-line transition-[width] duration-200 ease-out select-none overflow-hidden"
      style={{ width: collapsed ? 56 : 220 }}
    >
      {
}
      <div className={`flex items-center shrink-0 border-b border-line ${collapsed ? 'justify-center h-11' : 'h-11 px-3 justify-between gap-2'}`}>
        {}
        {!collapsed && heading && (
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-content-secondary truncate" title={heading}>
            {heading}
          </span>
        )}
        {}
        <button
          type="button"
          onClick={toggleSidebar}
          className={`h-6 w-6 rounded flex items-center justify-center text-content-muted hover:text-accent hover:bg-surface-nav-hover transition-all duration-150 ${collapsed ? 'absolute -right-3 top-3 z-20 rounded-full border border-line bg-surface-secondary shadow-sm' : ''}`}
          aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
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
                    className="flex items-center w-full px-3 py-1.5 gap-1.5 group/hdr hover:bg-surface-nav-hover transition-colors rounded-sm mx-0.5"
                  >
                    <ChevronRight className={`h-2.5 w-2.5 text-content-muted transition-transform duration-150 ${isGroupCollapsed ? '' : 'rotate-90'}`} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-content-muted flex-1 text-left truncate">
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
                    className={`group relative flex items-center w-full transition-colors duration-100 ${
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
                      className={`flex items-center transition-colors duration-100 ${
                        collapsed
                          ? `h-8 w-8 justify-center rounded ${
                              item.isActive
                                ? 'text-accent bg-surface-nav-active'
                                : 'text-content-secondary hover:bg-surface-nav-hover hover:text-content-primary'
                            }`
                          : `flex-1 gap-2.5 mx-1 px-2.5 h-full rounded ${
                              item.isActive
                                ? 'text-accent bg-surface-nav-active font-semibold'
                                : 'text-content-secondary hover:bg-surface-nav-hover hover:text-content-primary'
                            }`
                      }`}
                    >
                      <Icon className={`h-[16px] w-[16px] shrink-0 ${
                        item.isActive ? 'text-accent' : ''
                      }`} />

                      {!collapsed && (
                        <span className={`text-[12px] whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left ${
                          item.isActive ? 'font-semibold' : 'font-normal'
                        }`}>
                          {item.label}
                        </span>
                      )}

                      {}
                      {hasBadge && (
                        collapsed ? (
                          <span className="absolute top-0.5 right-1 h-2 w-2 rounded-full bg-status-red" />
                        ) : (
                          <span className="flex items-center justify-center rounded-full bg-status-red text-white text-[9px] font-bold px-1 h-4 min-w-[16px] tabular-nums">
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

      {
}
      <div className="border-t border-line shrink-0 pt-1">
        {}
        <button
          type="button"
          aria-label="Logout"
          onClick={onLogout}
          className={`flex items-center w-full transition-colors duration-100 text-content-muted hover:text-status-red ${
            collapsed
              ? 'justify-center h-8 mb-1'
              : 'gap-2.5 h-8 mx-1 mb-1 px-2 rounded hover:bg-status-red/8'
          }`}
        >
          <LogOut className="h-[14px] w-[14px] shrink-0" />
          {!collapsed && <span className="text-[11px]">Deconectare</span>}
        </button>
      </div>
    </nav>
  );
}

export default memo(WorkspacePanel);
