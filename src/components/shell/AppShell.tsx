import React, { lazy, Suspense } from 'react';
import Titlebar from './Titlebar';
import WorkspacePanel from './WorkspacePanel';
import StatusBar from './StatusBar';
import RouteProgress from './RouteProgress';
import PageTransitionOverlay from './PageTransitionOverlay;



const CommandPalette = lazy(() => import('./CommandPalette'));
import { type SearchHit, getInitials } from './search-types';
import { useLayoutStore } from '@/store/layoutStore';
import { useUiModeStore } from '@/store/uiModeStore';
import AppBackground from '@/components/ui/AppBackground';
import FioriShell from '@/redesign/shell/FioriShell';

interface AppShellProps {
  title: string;
  userName: string;
  roleName?: string;
  
  jobTitle?: string | null;
  notificationCount?: number;
  
  businessType?: string;
  navbarItems: SidebarItem[];

  sidebarItems: SidebarItem[];
  
  sidebarHeading?: string;
  routeKey: string;
  onBack?: () => void;
  onRefresh?: () => void;
  onSearchNavigate?: (hit: SearchHit) => void;
  onNotificationsClick?: () => void;
  

  onNavigateToPage?: (pageId: string) => void;
  
  onOpenShortcuts?: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}








export default function AppShell({
  title,
  userName,
  roleName = '',
  jobTitle,
  notificationCount,
  businessType,
  navbarItems,
  routeKey,
  onBack,
  onRefresh,
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
  const uiMode = useUiModeStore((s) => s.mode);

  
  const [paletteRequested, setPaletteRequested] = useState(false);
  useEffect(() => {
    if (commandPaletteOpen) setPaletteRequested(true);
  }, [commandPaletteOpen]);

  // Fiori UI mode (or the restaurant/ZET context) → authentic SAP Fiori shell
  // (ShellBar + 2-tier SideNavigation). SaaS manufacturing keeps the custom shell.
  if (uiMode === 'fiori' || businessType === 'restaurant') {
    // Sidebar shows ONLY the top-level workspaces; each workspace renders its
    // subpages as a horizontal sub-navbar (WorkspaceTabs) in the content area —
    // matching the SaaS shell. (Previously subpages were nested as
    // SideNavigationSubItems under the active workspace.)
    const fioriNav = navbarItems.map((i) => ({
      id: i.id,
      text: i.label,
      selected: i.isActive,
    }));
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-page">
        <FioriShell
          pageTitle={title}
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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-page">
      {}
      <div className="dark contents">
        <Titlebar
          title={title}
          onBack={onBack}
          userName={userName}
          roleName={roleName}
          jobTitle={jobTitle}
          notificationCount={notificationCount}
          onNotificationsClick={onNotificationsClick}
          onSearchClick={openCommandPalette}
          onLogout={onLogout}
          onHome={() => onNavigateToPage?.('dashboard')}
        />
      </div>

      {/* Top-level WORKSPACES live in the left sidebar; each workspace renders
          its own subpages as a horizontal sub-navbar (WorkspaceTabs) in the
          content area. (Previously workspaces were a top horizontal Navbar and
          subpages filled this sidebar — now inverted.) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <WorkspacePanel
          items={navbarItems}
          heading="Spații de lucru"
          onLogout={onLogout}
        />
        <main className="relative isolate flex flex-1 flex-col overflow-hidden min-h-0 bg-surface-page">
          {
}
          <AppBackground />
          <RouteProgress routeKey={routeKey} />
          <PageTransitionOverlay routeKey={routeKey} />
          {children}
        </main>
      </div>

      {}
      <div className="dark contents">
        <StatusBar currentPage={title} userName={userName} roleName={roleName} />
      </div>

      {}
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

export type { SidebarItem, SearchHit };