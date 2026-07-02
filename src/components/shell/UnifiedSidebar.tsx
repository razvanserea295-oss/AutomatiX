import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, LogOut, ChevronRight, PanelLeftClose, PanelLeft, Settings,
} from '@/icons';
import { useLayoutStore } from '@/store/layoutStore';
import { useAuthStore } from '@/store/authStore';
import GearLogo from '@/components/ui/GearLogo';
import { type SidebarItem } from './WorkspacePanel';
import { WORKSPACE_SUBPAGES } from '@/config/workspaceNav';
import { getInitials } from './search-types';
import { avatarUrl } from '@/lib/avatar';

const SETTINGS_IDS = new Set(['sistem-workspace', 'settings']);

interface UnifiedSidebarProps {
  items: SidebarItem[];
  currentPage: string;
  activeTabId?: string | null;
  onNavigate: (pageId: string) => void;
  onSearchClick?: () => void;
  onLogout: () => void;
  userName?: string;
  roleName?: string;
  jobTitle?: string | null;
}

function UnifiedSidebar({
  items,
  currentPage,
  activeTabId,
  onNavigate,
  onSearchClick,
  onLogout,
  userName = '',
  roleName = '',
  jobTitle,
}: UnifiedSidebarProps) {
  const collapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);

  const authUser = useAuthStore((s) => s.user);
  const avatar = avatarUrl(authUser);
  const initials = getInitials(userName || '?');

  // Workspace sections start expanded
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(items.map((i) => i.id)),
  );
  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Collapsed flyout
  const [flyoutId, setFlyoutId] = useState<string | null>(null);
  const [flyoutAnchor, setFlyoutAnchor] = useState<{ left: number; top: number } | null>(null);
  const flyoutBtnRef = useRef<HTMLButtonElement | null>(null);
  const flyoutPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { if (!collapsed) setFlyoutId(null); }, [collapsed]);

  useEffect(() => {
    if (!flyoutId) { setFlyoutAnchor(null); return; }
    const measure = () => {
      const r = flyoutBtnRef.current?.getBoundingClientRect();
      if (r) setFlyoutAnchor({ left: r.right + 8, top: r.top });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [flyoutId]);

  useEffect(() => {
    if (!flyoutId) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!flyoutBtnRef.current?.contains(t) && !flyoutPanelRef.current?.contains(t)) {
        setFlyoutId(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [flyoutId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFlyoutId(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const mainItems = items.filter((i) => !SETTINGS_IDS.has(i.id));
  const settingsItem = items.find((i) => SETTINGS_IDS.has(i.id));
  const activeSubPage = activeTabId ?? currentPage;
  const isSubActive = (id: string) => activeSubPage === id;
  const isWsActive = (wsId: string) => {
    const subs = WORKSPACE_SUBPAGES[wsId] ?? [];
    return currentPage === wsId || subs.some((s) => s.id === currentPage || s.id === activeSubPage);
  };

  const flyItem = flyoutId ? items.find((i) => i.id === flyoutId) : null;
  const flySubs = flyoutId ? (WORKSPACE_SUBPAGES[flyoutId] ?? []) : [];

  return (
    <aside
      className="relative flex flex-col shrink-0 bg-surface-nav border-r border-line select-none overflow-hidden transition-[width] duration-200 ease-in-out"
      style={{ width: collapsed ? 56 : 240 }}
    >
      {/* Brand */}
      <div className={`shrink-0 flex items-center h-12 border-b border-line ${collapsed ? 'justify-center' : 'px-3 gap-2'}`}>
        {collapsed ? (
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            title="Acasă"
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl text-accent hover:bg-surface-nav-hover transition-smooth duration-150 active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
          >
            <GearLogo size={20} />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              title="Acasă"
              className="flex items-center gap-2 flex-1 min-w-0 rounded-lg px-1 py-1 hover:bg-surface-nav-hover transition-smooth duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
            >
              <GearLogo size={20} className="shrink-0 text-accent" />
              <span className="font-semibold text-pm-base text-content-primary tracking-tight truncate">Automatix</span>
            </button>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Restrânge bara"
              className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-lg text-content-muted hover:text-accent hover:bg-surface-nav-hover transition-smooth duration-150 active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Expand toggle (collapsed only) */}
      {collapsed && (
        <div className="flex justify-center pt-2 pb-1">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Extinde bara"
            className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-content-muted hover:text-accent hover:bg-surface-nav-hover transition-smooth duration-150 active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Search */}
      {onSearchClick && (
        <div className={`shrink-0 ${collapsed ? 'flex justify-center py-1' : 'px-3 py-2'}`}>
          {collapsed ? (
            <button
              type="button"
              onClick={onSearchClick}
              title="Caută (Ctrl+K)"
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-nav-hover transition-smooth duration-150 active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
            >
              <Search className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSearchClick}
              className="flex h-8 w-full items-center gap-2 rounded-lg border border-line/60 bg-black/[0.04] px-2.5 text-pm-sm text-content-muted transition-smooth duration-150 hover:border-accent/40 hover:bg-surface-nav-hover hover:text-content-secondary focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] dark:bg-white/[0.04]"
            >
              <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
              <span className="flex-1 text-left leading-5">Caută…</span>
              <kbd className="shell-search-kbd shrink-0 border-line/60 bg-surface-secondary text-content-muted">Ctrl K</kbd>
            </button>
          )}
        </div>
      )}

      {/* Nav list */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1 scrollbar-thin">
        {mainItems.map((item) => {
          const Icon = item.icon;
          const subs = WORKSPACE_SUBPAGES[item.id] ?? [];
          const wsActive = isWsActive(item.id);

          if (collapsed) {
            const hasFlyout = subs.length > 0;
            const isFlyoutOpen = flyoutId === item.id;
            return (
              <div key={item.id} className="flex justify-center py-0.5">
                <button
                  type="button"
                  ref={isFlyoutOpen ? flyoutBtnRef : undefined}
                  onClick={hasFlyout
                    ? () => setFlyoutId(isFlyoutOpen ? null : item.id)
                    : item.onClick}
                  title={item.label}
                  aria-label={item.label}
                  className={`relative h-9 w-9 inline-flex items-center justify-center rounded-xl transition-smooth duration-150 active:scale-[0.94] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                    wsActive || isFlyoutOpen
                      ? 'text-accent bg-surface-nav-active'
                      : 'text-content-muted hover:text-content-primary hover:bg-surface-nav-hover'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {wsActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r-full bg-accent" aria-hidden />
                  )}
                  {item.badge != null && item.badge > 0 && (
                    <span className="absolute right-0.5 top-0.5 h-3.5 min-w-[14px] inline-flex items-center justify-center rounded-full bg-status-red px-0.5 text-[8px] font-bold text-white leading-none tabular-nums">
                      {item.badge > 99 ? '99' : item.badge}
                    </span>
                  )}
                </button>
              </div>
            );
          }

          // Expanded
          const isExpanded = expanded.has(item.id);
          return (
            <div key={item.id} className="px-2 mb-0.5">
              <button
                type="button"
                onClick={subs.length > 0 ? () => toggleExpanded(item.id) : item.onClick}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] text-pm-2xs font-semibold uppercase tracking-[0.07em] ${
                  wsActive
                    ? 'text-accent'
                    : 'text-content-muted hover:text-content-primary hover:bg-surface-nav-hover'
                }`}
              >
                <Icon className="h-[14px] w-[14px] shrink-0" />
                <span className="flex-1 min-w-0 text-left truncate">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="shrink-0 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-status-red text-white text-[8px] font-bold leading-none tabular-nums">
                    {item.badge > 99 ? '99' : item.badge}
                  </span>
                )}
                {subs.length > 0 && (
                  <ChevronRight className={`shrink-0 h-3 w-3 text-content-muted/50 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`} />
                )}
              </button>

              {subs.length > 0 && isExpanded && (
                <div className="ml-3.5 mt-0.5 mb-1 pl-2 border-l border-line/40 flex flex-col gap-px">
                  {subs.map((sub) => {
                    const SubIcon = sub.icon;
                    const active = isSubActive(sub.id);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => onNavigate(sub.id)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-pm-sm transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] text-left w-full ${
                          active
                            ? 'text-accent bg-surface-nav-active font-medium'
                            : 'text-content-secondary hover:text-content-primary hover:bg-surface-nav-hover'
                        }`}
                      >
                        <SubIcon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-accent' : 'text-content-muted'}`} />
                        <span className="min-w-0 flex-1 truncate">{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom: settings + user */}
      <div className="shrink-0 border-t border-line py-2 px-2 flex flex-col gap-1">
        {collapsed ? (
          <>
            {settingsItem && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => onNavigate('settings')}
                  title="Setări"
                  className={`h-9 w-9 inline-flex items-center justify-center rounded-xl transition-smooth duration-150 active:scale-[0.94] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                    settingsItem.isActive
                      ? 'text-accent bg-surface-nav-active'
                      : 'text-content-muted hover:text-content-primary hover:bg-surface-nav-hover'
                  }`}
                >
                  <Settings className="h-[18px] w-[18px]" />
                </button>
              </div>
            )}
            <div className="flex justify-center">
              <span
                title={`${userName}\n${jobTitle || roleName}`}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-pm-2xs font-bold text-accent overflow-hidden"
              >
                {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials}
              </span>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onLogout}
                title="Deconectare"
                className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-content-muted hover:text-status-red hover:bg-status-red/10 transition-smooth duration-150 active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : (
          <>
            {settingsItem && (
              <button
                type="button"
                onClick={() => onNavigate('settings')}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-pm-sm transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                  settingsItem.isActive
                    ? 'text-accent bg-surface-nav-active font-medium'
                    : 'text-content-muted hover:text-content-primary hover:bg-surface-nav-hover'
                }`}
              >
                <Settings className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 min-w-0 truncate text-pm-xs font-semibold uppercase tracking-[0.07em]">Setări</span>
              </button>
            )}
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-nav-hover transition-smooth duration-150 group/user">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-pm-2xs font-bold text-accent overflow-hidden">
                {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-pm-xs font-semibold text-content-primary leading-tight truncate">{userName || 'Utilizator'}</p>
                <p className="text-pm-2xs text-content-muted leading-tight truncate">{jobTitle || roleName}</p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Deconectare"
                className="shrink-0 h-6 w-6 inline-flex items-center justify-center rounded-lg text-content-muted opacity-0 group-hover/user:opacity-100 hover:text-status-red hover:bg-status-red/10 transition-smooth duration-150 active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Collapsed flyout */}
      {collapsed && flyItem && flySubs.length > 0 && flyoutAnchor && createPortal(
        <div
          ref={flyoutPanelRef}
          role="menu"
          style={{ position: 'fixed', left: flyoutAnchor.left, top: flyoutAnchor.top, zIndex: 9999 }}
          className="min-w-[196px] rounded-lg border border-line bg-surface-nav p-1 shadow-[var(--elevation-3)] origin-left"
        >
          <p className="px-3 pt-1 pb-0.5 text-pm-2xs font-semibold uppercase tracking-[0.07em] text-content-muted">{flyItem.label}</p>
          <div className="h-px bg-line/50 mx-2 mb-1" />
          {flySubs.map((sub) => {
            const SubIcon = sub.icon;
            const active = isSubActive(sub.id);
            return (
              <button
                key={sub.id}
                type="button"
                role="menuitem"
                onClick={() => { setFlyoutId(null); onNavigate(sub.id); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-pm-sm text-left transition-smooth duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                  active ? 'text-accent bg-accent/8 font-medium' : 'text-content-primary hover:bg-surface-nav-hover'
                }`}
              >
                <SubIcon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-accent' : 'text-content-muted'}`} />
                <span className="flex-1 min-w-0 truncate">{sub.label}</span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </aside>
  );
}

export default memo(UnifiedSidebar);
