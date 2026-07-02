import React, { lazy, Suspense, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Titlebar from './Titlebar';
import AppSidebar from './AppSidebar';
import StatusBar from './StatusBar';
import RouteProgress from './RouteProgress';
import PageTransitionOverlay from './PageTransitionOverlay';
import ShellNavDrawer from './ShellNavDrawer';
import { WORKSPACE_SUBPAGES } from '@/config/workspaceNav';
import { ViewportSelector } from '@/redesign/ui/ResponsivePreview';
const CommandPalette = lazy(() => import('./CommandPalette'));
import { LayoutGrid, CircleDot } from '@/icons';
import { type SearchHit, getInitials } from './search-types';
import { type SidebarItem } from './WorkspacePanel';
import { useLayoutStore } from '@/store/layoutStore';
import { useUiModeStore } from '@/store/uiModeStore';
import { PageHeaderActionsProvider } from '@/context/PageHeaderActionsContext';
import AppBackground from '@/components/ui/AppBackground';
import FioriShell from '@/redesign/shell/FioriShell';
const CodeShell = lazy(() => import('@/redesign/shell/CodeShell'));
const HybridShell = lazy(() => import('@/redesign/shell/HybridShell'));
const Launchpad = lazy(() => import('./Launchpad'));
const RadialNav = lazy(() => import('./RadialNav'));

interface AppShellProps {
  /** Workspace context for the titlebar. */
  contextLabel?: string;
  currentPage: string;
  /** Route segment when inside a workspace tab (e.g. `chat` on `/chat`). */
  activeTabId?: string | null;
  userName: string;
  roleName?: string;
  jobTitle?: string | null;
  notificationCount?: number;
  businessType?: string;
  navbarItems: SidebarItem[];
  routeKey: string;
  banners?: React.ReactNode;
  onBack?: () => void;
  onSearchNavigate?: (hit: SearchHit) => void;
  onNotificationsClick?: () => void;
  onNavigateToPage?: (pageId: string) => void;
  onOpenShortcuts?: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function AppShell({
  contextLabel,
  currentPage,
  activeTabId,
  userName,
  roleName = '',
  jobTitle,
  notificationCount,
  navbarItems,
  routeKey,
  banners,
  onBack,
  onSearchNavigate,
  onNotificationsClick,
  onNavigateToPage,
  onOpenShortcuts,
  onLogout,
  children,
}: AppShellProps) {
  const commandPaletteOpen = useLayoutStore((s) => s.commandPaletteOpen);
  const openCommandPalette = useLayoutStore((s) => s.openCommandPalette);
  const closeCommandPalette = useLayoutStore((s) => s.closeCommandPalette);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const sidebarCollapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const sidebarVariant = useLayoutStore((s) => s.sidebarVariant);
  const navLayout = useLayoutStore((s) => s.navLayout);
  const breakpoint = useLayoutStore((s) => s.breakpoint);
  const setBreakpoint = useLayoutStore((s) => s.setBreakpoint);
  const isCompactNav = breakpoint === 'mobile' || breakpoint === 'tablet';

  // Launchpad / radial are admin-only alternatives to the sidebar, and only on
  // a roomy (desktop) viewport — compact stays on the mobile drawer + bottom nav.
  const isAdmin = (roleName || '').toLowerCase() === 'admin';
  const effectiveNav = isAdmin ? navLayout : 'sidebar';
  const useLaunchpad = effectiveNav === 'launchpad' && !isCompactNav;
  const useRadial = effectiveNav === 'radial' && !isCompactNav;
  const useAltNav = useLaunchpad || useRadial;

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [altNavOpen, setAltNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mqTablet = window.matchMedia('(max-width: 1023px)');
    const mqMobile = window.matchMedia('(max-width: 767px)');

    const sync = () => {
      const w = window.innerWidth;
      const bp = w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';
      setBreakpoint(bp);
    };

    sync();
    mqTablet.addEventListener('change', sync);
    mqMobile.addEventListener('change', sync);
    window.addEventListener('resize', sync);
    return () => {
      mqTablet.removeEventListener('change', sync);
      mqMobile.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
    };
  }, [setBreakpoint]);

  useEffect(() => {
    if (!isCompactNav) setMobileNavOpen(false);
  }, [isCompactNav]);

  useEffect(() => {
    if (isCompactNav) setDesktopSearchOpen(false);
  }, [isCompactNav]);

  const handleNavToggle = useCallback(() => {
    if (useAltNav) { setAltNavOpen((o) => !o); return; }
    if (isCompactNav) setMobileNavOpen((o) => !o);
    else toggleSidebar();
  }, [useAltNav, isCompactNav, toggleSidebar]);

  // Drop the launchpad/radial overlay whenever we leave alt-nav mode.
  useEffect(() => { if (!useAltNav) setAltNavOpen(false); }, [useAltNav]);

  const handleSearchActivate = useCallback(() => {
    if (isCompactNav) {
      openCommandPalette();
      return;
    }
    setDesktopSearchOpen(true);
  }, [isCompactNav, openCommandPalette]);

  const handleSearchValueChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (!isCompactNav) setDesktopSearchOpen(true);
  }, [isCompactNav]);

  // Ctrl+\ toggles the activity-bar (desktop) or mobile drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '\\') { e.preventDefault(); handleNavToggle(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleNavToggle]);

  const uiMode = useUiModeStore((s) => s.mode);

  const [paletteRequested, setPaletteRequested] = useState(false);
  useEffect(() => {
    if (commandPaletteOpen || desktopSearchOpen) setPaletteRequested(true);
  }, [commandPaletteOpen, desktopSearchOpen]);

  useEffect(() => {
    if (uiMode === 'fiori' || uiMode === 'code' || uiMode === 'hybrid') return;
    if (!commandPaletteOpen || isCompactNav) return;
    setDesktopSearchOpen(true);
    requestAnimationFrame(() => {
      desktopSearchInputRef.current?.focus({ preventScroll: true });
    });
    closeCommandPalette();
  }, [closeCommandPalette, commandPaletteOpen, isCompactNav, uiMode]);

  const activeWorkspaceId = useMemo(() => {
    if (WORKSPACE_SUBPAGES[currentPage]) return currentPage;
    for (const [wsId, subs] of Object.entries(WORKSPACE_SUBPAGES)) {
      if (subs.some((s) => s.id === currentPage)) return wsId;
    }
    return null;
  }, [currentPage]);

  const { panelItems, panelHeading } = useMemo(() => {
    if (!activeWorkspaceId) return { panelItems: [], panelHeading: '' };
    const activeWsItem = navbarItems.find((i) => i.id === activeWorkspaceId);
    const subs = WORKSPACE_SUBPAGES[activeWorkspaceId] ?? [];
    if (!subs.length) return { panelItems: [], panelHeading: '' };
    const tabKey = activeTabId ?? currentPage;
    return {
      panelHeading: activeWsItem?.label ?? '',
      panelItems: subs.map((sub): SidebarItem => ({
        id: sub.id,
        icon: sub.icon,
        label: sub.label,
        isActive: tabKey === sub.id,
        onClick: () => onNavigateToPage?.(sub.id),
      })),
    };
  }, [activeWorkspaceId, navbarItems, currentPage, activeTabId, onNavigateToPage]);

  const mobileBottomItems = useMemo(() => {
    const byId = new Map(navbarItems.map((item) => [item.id, item]));
    const subpages = Object.values(WORKSPACE_SUBPAGES).flat();
    const pick = (id: string, fallbackLabel: string): SidebarItem | null => {
      const navItem = byId.get(id);
      const subpage = subpages.find((item) => item.id === id);
      const Icon = navItem?.icon ?? subpage?.icon;
      if (!Icon) return null;
      return {
        id,
        label: fallbackLabel,
        icon: Icon,
        isActive: currentPage === id || activeTabId === id || navItem?.isActive === true,
        onClick: () => onNavigateToPage?.(id),
        badge: navItem?.badge,
      };
    };
    return [
      pick('dashboard', 'Start'),
      pick('sales-hub', 'Vânzări'),
      pick('chat', 'Mesaje'),
      pick('reports', 'Rapoarte'),
      pick('settings', 'Setări'),
    ].filter((item): item is SidebarItem => item !== null);
  }, [activeTabId, currentPage, navbarItems, onNavigateToPage]);

  if (uiMode === 'fiori') {
    const fioriNav = navbarItems.map((i) => ({
      id: i.id,
      text: i.label,
      selected: i.isActive,
    }));
    return (
      <div className="shell-root bg-surface-page">
        {banners}
        <FioriShell
          pageTitle={contextLabel ?? ''}
          navItems={fioriNav}
          userInitials={getInitials(userName || '?')}
          notificationsCount={notificationCount ?? 0}
          onNavigate={(id) => onNavigateToPage?.(id)}
          onNotificationsClick={onNotificationsClick}
          onSearch={openCommandPalette}
          onLogout={onLogout}
        >
          {children}
        </FioriShell>
        {paletteRequested && (
          <Suspense fallback={null}>
            <CommandPalette
              open={commandPaletteOpen}
              onClose={closeCommandPalette}
              onSearchNavigate={onSearchNavigate}
              onNavigatePage={onNavigateToPage}
              onOpenShortcuts={onOpenShortcuts}
            />
          </Suspense>
        )}
      </div>
    );
  }

  if (uiMode === 'code') {
    return (
      <Suspense fallback={<div className="shell-root" style={{ background: '#1e1e1e' }} />}>
        <CodeShell
          title={contextLabel ?? ''}
          userName={userName}
          roleName={roleName}
          notificationCount={notificationCount}
          navbarItems={navbarItems}
          onSearchNavigate={onSearchNavigate}
          onNotificationsClick={onNotificationsClick}
          onNavigateToPage={onNavigateToPage}
          onOpenShortcuts={onOpenShortcuts}
          onLogout={onLogout}
        >
          {children}
        </CodeShell>
      </Suspense>
    );
  }

  if (uiMode === 'hybrid') {
    return (
      <Suspense fallback={<div className="shell-root" style={{ background: '#1e1e1e' }} />}>
        <HybridShell
          title={contextLabel ?? ''}
          userName={userName}
          roleName={roleName}
          notificationCount={notificationCount}
          navbarItems={navbarItems}
          onSearchNavigate={onSearchNavigate}
          onNotificationsClick={onNotificationsClick}
          onNavigateToPage={onNavigateToPage}
          onOpenShortcuts={onOpenShortcuts}
          onLogout={onLogout}
        >
          {children}
        </HybridShell>
      </Suspense>
    );
  }

  // SaaS: banners → titlebar → [sidebar | main] → status bar
  return (
    <PageHeaderActionsProvider>
    <div className="shell-root bg-surface-page">
      {banners}

      <div className="shell-titlebar-host dark shrink-0">
        <Titlebar
          contextLabel={contextLabel}
          onBack={onBack}
          userName={userName}
          roleName={roleName}
          jobTitle={jobTitle}
          notificationCount={notificationCount}
          onNotificationsClick={onNotificationsClick}
          onSearchClick={handleSearchActivate}
          searchValue={searchQuery}
          onSearchValueChange={handleSearchValueChange}
          onSearchFocus={handleSearchActivate}
          searchOpen={!isCompactNav && desktopSearchOpen}
          searchInputRef={desktopSearchInputRef}
          searchAnchorRef={desktopSearchAnchorRef}
          onLogout={onLogout}
          onHome={() => onNavigateToPage?.('dashboard')}
          onNavToggle={handleNavToggle}
          navOpen={useAltNav ? altNavOpen : (isCompactNav ? mobileNavOpen : !sidebarCollapsed)}
          onNavigateToPage={onNavigateToPage}
        />
      </div>

      <div className="shell-chrome-stack">
        {!useAltNav && (
          <div className="shell-sidebar-host dark">
            <AppSidebar
              items={navbarItems}
              currentPage={currentPage}
              activeTabId={activeTabId}
              variant={sidebarVariant}
              onNavigate={(id) => onNavigateToPage?.(id)}
              onSearchClick={openCommandPalette}
              onLogout={onLogout}
              userName={userName}
              roleName={roleName}
              jobTitle={jobTitle}
            />
          </div>
        )}

          <main className="shell-main">
            <AppBackground />
            <RouteProgress routeKey={routeKey} />
            <PageTransitionOverlay routeKey={routeKey} />
            {import.meta.env.DEV && (
              <ViewportSelector className="absolute top-3 right-3 z-30" />
            )}
            {children}
          </main>
        </div>

      <div className="dark shrink-0">
        <MobileBottomNav
          items={mobileBottomItems}
          onNavigate={(id) => onNavigateToPage?.(id)}
        />
      </div>

      <div className="shell-status-host dark shrink-0">
        <StatusBar userName={userName} roleName={roleName} />
      </div>

      <ShellNavDrawer
        open={isCompactNav && mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        variant={sidebarVariant}
        workspaceLabel={panelHeading}
        workspaceItems={panelItems}
        railItems={navbarItems}
        onNavigate={(id) => onNavigateToPage?.(id)}
      />

      {useAltNav && !altNavOpen && (
        <button
          type="button"
          onClick={() => setAltNavOpen(true)}
          title={useLaunchpad ? 'Launchpad (Ctrl+\\)' : 'Meniu radial (Ctrl+\\)'}
          aria-label="Deschide navigarea"
          className="fixed bottom-8 left-5 z-[90] flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-[var(--color-on-accent)] shadow-[0_12px_28px_rgba(0,0,0,0.3)] transition-smooth duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
        >
          {useLaunchpad ? <LayoutGrid className="h-5 w-5" /> : <CircleDot className="h-5 w-5" />}
        </button>
      )}

      {useAltNav && (
        <Suspense fallback={null}>
          {useLaunchpad && (
            <Launchpad
              open={altNavOpen}
              onClose={() => setAltNavOpen(false)}
              items={navbarItems}
              role={roleName}
              currentPage={currentPage}
              activeTabId={activeTabId}
              onNavigate={(id) => { onNavigateToPage?.(id); setAltNavOpen(false); }}
            />
          )}
          {useRadial && (
            <RadialNav
              open={altNavOpen}
              onClose={() => setAltNavOpen(false)}
              items={navbarItems}
              role={roleName}
              currentPage={currentPage}
              activeTabId={activeTabId}
              onNavigate={(id) => { onNavigateToPage?.(id); setAltNavOpen(false); }}
            />
          )}
        </Suspense>
      )}

      {paletteRequested && (
        <Suspense fallback={null}>
          <>
            <CommandPalette
              open={isCompactNav && commandPaletteOpen}
              onClose={closeCommandPalette}
              onSearchNavigate={onSearchNavigate}
              onNavigatePage={onNavigateToPage}
              onOpenShortcuts={onOpenShortcuts}
            />
            <CommandPalette
              open={!isCompactNav && desktopSearchOpen}
              onClose={() => setDesktopSearchOpen(false)}
              onSearchNavigate={onSearchNavigate}
              onNavigatePage={onNavigateToPage}
              onOpenShortcuts={onOpenShortcuts}
              query={searchQuery}
              onQueryChange={handleSearchValueChange}
              anchorRef={desktopSearchAnchorRef}
              showInput={false}
            />
          </>
        </Suspense>
      )}
    </div>
    </PageHeaderActionsProvider>
  );
}

function MobileBottomNav({
  items,
  onNavigate,
}: {
  items: SidebarItem[];
  onNavigate: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Navigare rapidă"
      className="mobile-bottom-nav border-t border-white/10 bg-[#1A1B1D]/98 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 text-white shadow-[0_-12px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl lg:hidden"
    >
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={item.isActive ? 'page' : undefined}
              className={`relative flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-pm-2xs font-semibold transition-smooth duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                item.isActive
                  ? 'bg-white/12 text-white'
                  : 'text-white/55 hover:bg-white/8 hover:text-white'
              }`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-xl ${item.isActive ? 'bg-accent text-[var(--color-on-accent)]' : 'bg-white/8'}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="max-w-full truncate">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-red px-1 text-[8px] font-bold leading-none text-white tabular-nums">
                  {item.badge > 99 ? '99' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export type { SidebarItem, SearchHit };
