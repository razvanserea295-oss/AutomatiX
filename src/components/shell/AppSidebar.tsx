import { memo, useCallback, useMemo, useState } from 'react';
import { ChevronRight, LogOut, Settings } from '@/icons';
import { avatarUrl } from '@/lib/avatar';
import { useAuthStore } from '@/store/authStore';
import { type SidebarVariant, useLayoutStore } from '@/store/layoutStore';
import { WORKSPACE_SUBPAGES } from '@/config/workspaceNav';
import type { SidebarItem } from './WorkspacePanel';
import { getInitials } from './search-types';

const SETTINGS_IDS = new Set(['sistem-workspace', 'settings']);

interface AppSidebarProps {
  items: SidebarItem[];
  currentPage: string;
  activeTabId?: string | null;
  variant?: SidebarVariant;
  onNavigate: (pageId: string) => void;
  onSearchClick?: () => void;
  onLogout: () => void;
  userName?: string;
  roleName?: string;
  jobTitle?: string | null;
}

function AppSidebar({
  items,
  currentPage,
  activeTabId,
  variant = 'enterprise',
  onNavigate,
  onLogout,
  userName = '',
  roleName = '',
  jobTitle,
}: AppSidebarProps) {
  const collapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const authUser = useAuthStore((s) => s.user);
  const avatar = avatarUrl(authUser);
  const initials = getInitials(userName || '?');
  const activeSubPage = activeTabId ?? currentPage;
  const isContrast = variant === 'contrast';

  const { primaryItems, settingsItem } = useMemo(() => ({
    primaryItems: items.filter((item) => !SETTINGS_IDS.has(item.id)),
    settingsItem: items.find((item) => SETTINGS_IDS.has(item.id)),
  }), [items]);

  const activeWorkspaceId = useMemo(() => {
    if (WORKSPACE_SUBPAGES[currentPage]) return currentPage;
    for (const [workspaceId, subpages] of Object.entries(WORKSPACE_SUBPAGES)) {
      if (subpages.some((subpage) => subpage.id === currentPage || subpage.id === activeSubPage)) {
        return workspaceId;
      }
    }
    return null;
  }, [activeSubPage, currentPage]);

  const [openWorkspaces, setOpenWorkspaces] = useState<Set<string>>(
    () => new Set(items.filter((item) => WORKSPACE_SUBPAGES[item.id]?.length).map((item) => item.id)),
  );

  const toggleWorkspace = useCallback((workspaceId: string) => {
    setOpenWorkspaces((prev) => {
      const next = new Set(prev);
      if (next.has(workspaceId)) next.delete(workspaceId);
      else next.add(workspaceId);
      return next;
    });
  }, []);

  const navigate = useCallback((pageId: string) => {
    onNavigate(pageId);
  }, [onNavigate]);

  const renderEnterpriseWorkspace = (item: SidebarItem) => {
    const Icon = item.icon;
    const subpages = WORKSPACE_SUBPAGES[item.id] ?? [];
    const isWorkspaceActive = item.id === activeWorkspaceId || item.isActive;
    const isOpen = openWorkspaces.has(item.id) || isWorkspaceActive;
    const hasSubnav = subpages.length > 0;

    if (collapsed) {
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => navigate(hasSubnav ? (subpages.find((subpage) => subpage.id === activeSubPage)?.id ?? subpages[0].id) : item.id)}
          title={item.label}
          aria-label={item.label}
          className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-smooth duration-150 active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
            isWorkspaceActive
              ? 'bg-accent text-white shadow-[0_10px_18px_rgba(0,0,0,0.22)]'
              : 'text-content-secondary hover:bg-surface-nav-hover hover:text-content-primary'
          }`}
        >
          <Icon className="shell-nav-icon h-4.5 w-4.5" />
          {item.badge != null && item.badge > 0 && (
            <span className="shell-nav-badge absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-status-red px-1 text-[8px] font-bold leading-none text-white">
              {item.badge > 99 ? '99' : item.badge}
            </span>
          )}
        </button>
      );
    }

    return (
      <div key={item.id} className="rounded-2xl">
        <button
          type="button"
          onClick={() => (hasSubnav ? toggleWorkspace(item.id) : navigate(item.id))}
          className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
            isWorkspaceActive
              ? 'bg-[var(--color-nav-active-bg)] text-white shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-accent)_45%,transparent)]'
              : 'text-content-secondary hover:bg-surface-nav-hover hover:text-content-primary'
          }`}
        >
          <span className={`shell-nav-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isWorkspaceActive ? 'bg-accent text-white' : 'bg-surface-secondary text-content-muted group-hover:text-content-primary'
          }`}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 truncate text-pm-sm font-semibold">{item.label}</span>
          {item.badge != null && item.badge > 0 && (
            <span className="shell-nav-badge rounded-full bg-status-red px-1.5 py-0.5 text-[10px] font-bold leading-none text-white tabular-nums">
              {item.badge > 99 ? '99' : item.badge}
            </span>
          )}
          {hasSubnav && (
            <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-content-muted/90 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} />
          )}
        </button>

        {hasSubnav && isOpen && (
          <div className="ml-7 mt-1.5 space-y-1 border-l border-line/55 pl-3">
            {subpages.map((subpage) => {
              const SubIcon = subpage.icon;
              const active = activeSubPage === subpage.id;
              return (
                <button
                  key={subpage.id}
                  type="button"
                  onClick={() => navigate(subpage.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-pm-sm transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                    active
                      ? 'bg-[var(--color-nav-active-bg)] font-semibold text-white shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-accent)_40%,transparent)]'
                      : 'text-content-muted hover:bg-surface-nav-hover hover:text-content-primary'
                  }`}
                >
                  <SubIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{subpage.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderContrastWorkspace = (item: SidebarItem) => {
    const Icon = item.icon;
    const subpages = WORKSPACE_SUBPAGES[item.id] ?? [];
    const isWorkspaceActive = item.id === activeWorkspaceId || item.isActive;
    const isOpen = openWorkspaces.has(item.id) || isWorkspaceActive;
    const hasSubnav = subpages.length > 0;

    if (collapsed) {
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => navigate(hasSubnav ? (subpages.find((subpage) => subpage.id === activeSubPage)?.id ?? subpages[0].id) : item.id)}
          title={item.label}
          aria-label={item.label}
          className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition-smooth duration-150 active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
            isWorkspaceActive
              ? 'border-accent bg-accent text-[var(--color-on-accent)] shadow-[var(--elevation-2)]'
              : 'border-line/70 bg-surface-secondary/70 text-content-secondary hover:border-accent/35 hover:text-content-primary'
          }`}
        >
          <Icon className="shell-nav-icon h-4 w-4" />
          {item.badge != null && item.badge > 0 && (
            <span className="shell-nav-badge absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-status-red px-1 text-[8px] font-bold leading-none text-white">
              {item.badge > 99 ? '99' : item.badge}
            </span>
          )}
        </button>
      );
    }

    return (
      <section
        key={item.id}
        className={`rounded-2xl border p-1.5 transition-smooth duration-150 ${
          isWorkspaceActive
            ? 'border-accent/35 bg-accent/8'
            : 'border-line/70 bg-surface-secondary/65'
        }`}
      >
        <button
          type="button"
          onClick={() => (hasSubnav ? toggleWorkspace(item.id) : navigate(item.id))}
          className={`group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
            isWorkspaceActive
              ? 'bg-surface-primary/85 text-accent'
              : 'text-content-secondary hover:bg-surface-nav-hover hover:text-content-primary'
          }`}
        >
          <span className={`shell-nav-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
            isWorkspaceActive
              ? 'border-accent/35 bg-accent/12 text-accent'
              : 'border-line/60 bg-surface-primary text-content-muted group-hover:text-content-primary'
          }`}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 truncate text-pm-sm font-semibold">{item.label}</span>
          {item.badge != null && item.badge > 0 && (
            <span className="shell-nav-badge rounded-full bg-status-red px-1.5 py-0.5 text-[10px] font-bold leading-none text-white tabular-nums">
              {item.badge > 99 ? '99' : item.badge}
            </span>
          )}
          {hasSubnav && (
            <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-content-muted transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} />
          )}
        </button>

        {hasSubnav && isOpen && (
          <div className="mt-2 space-y-1 border-t border-line/60 pt-2">
            {subpages.map((subpage) => {
              const SubIcon = subpage.icon;
              const active = activeSubPage === subpage.id;
              return (
                <button
                  key={subpage.id}
                  type="button"
                  onClick={() => navigate(subpage.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-pm-sm transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                    active
                      ? 'bg-accent text-[var(--color-on-accent)] shadow-[var(--elevation-1)]'
                      : 'text-content-secondary hover:bg-surface-primary hover:text-content-primary'
                  }`}
                >
                  <SubIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{subpage.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  const renderWorkspace = isContrast ? renderContrastWorkspace : renderEnterpriseWorkspace;

  return (
    <aside
      aria-label="Navigare aplicație"
      data-collapsed={collapsed ? 'true' : 'false'}
      data-variant={variant}
      className={`shell-app-sidebar flex shrink-0 flex-col border-r border-line text-content-primary backdrop-blur-xl transition-[width] duration-200 ease-out ${
        isContrast
          ? 'shell-app-sidebar--contrast bg-surface-page/95 shadow-[inset_-1px_0_0_rgba(255,255,255,0.05)]'
          : 'bg-surface-nav/95 shadow-[inset_-1px_0_0_rgba(255,255,255,0.02)]'
      }`}
    >

      <div className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin ${collapsed ? 'space-y-2 px-2 py-3' : (isContrast ? 'px-3 py-3.5' : 'px-3 py-3.5')}`}>
        {!collapsed && (
          <p className={`shell-nav-section-label mb-2 px-1 text-pm-2xs font-bold uppercase tracking-[0.12em] ${isContrast ? 'text-content-muted' : 'text-content-muted/85'}`}>
            Workspace-uri
          </p>
        )}
        <div className={collapsed ? 'space-y-2' : (isContrast ? 'space-y-2.5' : 'space-y-1.5')}>
          {primaryItems.map(renderWorkspace)}
        </div>
      </div>

      <div className={`shell-nav-footer-zone shrink-0 border-t ${isContrast ? 'border-line/70 bg-surface-page/95' : 'border-line/80 bg-surface-nav/90'} ${collapsed ? 'space-y-2 px-2 py-3' : (isContrast ? 'space-y-2.5 px-3 py-3.5' : 'space-y-2.5 px-3 py-3')}`}>
        {!collapsed && (
          <p className="shell-nav-section-label px-1 text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted">
            Sistem
          </p>
        )}

        {settingsItem && (
          <button
            type="button"
            onClick={() => navigate('settings')}
            title="Setări"
            className={`flex w-full items-center transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
              settingsItem.isActive
                ? (isContrast ? 'border-accent/35 bg-accent/10 text-accent' : 'bg-accent/12 text-accent')
                : (isContrast ? 'border-line/70 bg-surface-secondary/65 text-content-secondary hover:border-accent/35 hover:text-content-primary' : 'text-content-secondary hover:bg-surface-nav-hover hover:text-content-primary')
            } ${collapsed
              ? (isContrast ? 'h-11 justify-center rounded-xl border' : 'h-10 justify-center rounded-xl')
              : (isContrast ? 'gap-3 rounded-xl border px-3 py-2.5 text-left' : 'gap-3 rounded-xl px-3 py-2.5 text-left')}`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="min-w-0 flex-1 truncate text-pm-sm font-semibold">Setări</span>}
          </button>
        )}

        <div className={`flex items-center ${isContrast
          ? (collapsed ? 'justify-center rounded-xl border border-line/70 bg-surface-secondary/55 p-2' : 'gap-2.5 rounded-xl border border-line/70 bg-surface-secondary/55 p-2.5')
          : (collapsed ? 'justify-center rounded-xl bg-surface-secondary/70 p-1.5' : 'gap-2.5 rounded-xl bg-surface-secondary/70 p-2')}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 text-pm-2xs font-bold text-accent">
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials}
          </span>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-pm-xs font-semibold leading-tight">{userName || 'Utilizator'}</p>
                <p className="truncate text-pm-2xs leading-tight text-content-muted">{jobTitle || roleName || 'Conectat'}</p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Deconectare"
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center text-content-muted transition-smooth duration-150 hover:bg-status-red/10 hover:text-status-red active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                  isContrast ? 'rounded-lg' : 'rounded-xl'
                }`}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={onLogout}
            title="Deconectare"
            className={`flex w-full items-center justify-center text-content-muted transition-smooth duration-150 hover:bg-status-red/10 hover:text-status-red active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
              isContrast ? 'h-11 rounded-xl border border-line/70 bg-surface-secondary/55' : 'h-10 rounded-xl'
            }`}
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}

export default memo(AppSidebar);
