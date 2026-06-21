import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Router, Switch, Route, useLocation, useRoute } from 'wouter';
import { useTransitionLocation } from '@/hooks/useTransitionLocation';
import PageTransitionDriver from '@/components/shell/PageTransitionDriver';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { applyUiScale } from '@/lib/uiScale';
import { useLayoutStore } from '@/store/layoutStore';
import type { User } from '@/core/types';
import SplashScreen from '@/components/SplashScreen';
import BootLoader from '@/components/BootLoader';
import { toast } from '@/store/toastStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useUserNotificationsStore } from '@/store/userNotificationsStore';
import { useUserNotificationsPolling } from '@/hooks/useUserNotificationsPolling';
import { LayoutDashboard, Factory, FolderKanban, FileText, Package, CircleDollarSign, Bell, ShieldCheck, Wrench, Settings, Building2, Warehouse, ShoppingCart, Truck, Cog, Network, ScrollText, GitBranch, Library, Container, MapPin, ClipboardCheck, Target, MessageCircle, Mail, Hammer, Loader2, Calendar, GitMerge, Inbox, BarChart3, CheckSquare, PackageCheck, Smartphone, GraduationCap, Gauge, Clock } from 'lucide-react';
import AppShell from '@/components/shell/AppShell';
import type { SidebarItem } from '@/components/shell/WorkspacePanel';
import { getServerUrl, setServerUrl } from '@/config/server';
import LoginPage from '@/pages/LoginPage';
import MaintenanceScreen from '@/components/MaintenanceScreen';
import { useMaintenanceStore } from '@/store/maintenanceStore';



import ForcePasswordChangePage from '@/pages/ForcePasswordChangePage';


const DashboardPage           = lazy(() => import('@/redesign/pages/DashboardPage'));
const ManagerControlPage      = lazy(() => import('@/redesign/pages/ManagerControlPage'));
const StationDetailPage       = lazy(() => import('@/redesign/pages/stations/StationDetailPage'));
const PartsTreePage           = lazy(() => import('@/redesign/pages/PartsTreePage'));
const CustomerPortalPage      = lazy(() => import('@/pages/portal/CustomerPortalPage'));
const RfqResponsePage         = lazy(() => import('@/pages/portal/RfqResponsePage'));
const DownloadPage            = lazy(() => import('@/pages/DownloadPage'));
const LeadDetailPage          = lazy(() => import('@/redesign/pages/sales/LeadDetailPage'));




// MobileApp removed — the single responsive shell below serves every width.


const SalesWorkspace          = lazy(() => import('@/pages/workspace/SalesWorkspace'));
const EngineeringWorkspace    = lazy(() => import('@/pages/workspace/EngineeringWorkspace'));
const ProductionWorkspace     = lazy(() => import('@/pages/workspace/ProductionWorkspace'));
const ProcurementWorkspace    = lazy(() => import('@/pages/workspace/ProcurementWorkspace'));
const FinanceWorkspace        = lazy(() => import('@/pages/workspace/FinanceWorkspace'));
const ProjectsContractsWorkspace = lazy(() => import('@/pages/workspace/ProjectsContractsWorkspace'));
const InstrumenteWorkspace    = lazy(() => import('@/pages/workspace/InstrumenteWorkspace'));
const SistemWorkspace         = lazy(() => import('@/pages/workspace/SistemWorkspace'));
const PersonalWorkspace       = lazy(() => import('@/pages/workspace/PersonalWorkspace'));

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConfirmDialogHost } from '@/components/ConfirmDialog';
import ToastContainer from '@/components/ui/ToastContainer';
import AdminSetupGate from '@/components/setup/AdminSetupGate';
import { apiCommand } from '@/api/commands';
import { normalizeRole, canAccessPage, isPageGated, type AppPage } from '@/lib/access';
import { getRoleDisplayLabel } from '@/lib/roleWorkspace';
import AccessDeniedView from '@/components/AccessDeniedView';
import { getNavGroupsForRole } from '@/lib/roleWorkspace';
import { useBusinessTypeStore } from '@/store/businessTypeStore';
import { PAGE_IDS, PAGE_TITLES, type PageId } from '@/config/constants';
import { WORKSPACE_SUBPAGES, workspaceIdForNav } from '@/config/workspaceNav';
import ConnectionBanner from '@/components/shell/ConnectionBanner';
import { useServerConnection } from '@/hooks/useServerConnection';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useLiveEvents } from '@/hooks/useLiveEvents';
import { usePageCustomizationApplier } from '@/hooks/usePageCustomizationApplier';
import { useLayoutEditStore } from '@/store/layoutEditStore';
import PatchNotesModal from '@/components/PatchNotesModal';
import BroadcastPopup from '@/components/BroadcastPopup';
import UpdateProgressOverlay from '@/components/UpdateProgressOverlay';
import KeyboardShortcutsOverlay, { type ShortcutEntry } from '@/components/KeyboardShortcutsOverlay';
import WorkspaceSkeleton from '@/redesign/ui/WorkspaceSkeleton';

function PageFallback() {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <WorkspaceSkeleton />
    </div>
  );
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  [PAGE_IDS.DASHBOARD]: LayoutDashboard,
  [PAGE_IDS.PROJECTS]: FolderKanban,
  [PAGE_IDS.PRODUCTION]: Factory,
  [PAGE_IDS.PARTS_TREE]: Network,
  [PAGE_IDS.CLIENTS]: Building2,
  [PAGE_IDS.STATIONS]: Wrench,
  [PAGE_IDS.MATERIALS]: Package,
  [PAGE_IDS.SUPPLIERS]: Warehouse,
  [PAGE_IDS.PURCHASE_ORDERS]: ShoppingCart,
  [PAGE_IDS.GOODS_RECEIPTS]: Truck,
  [PAGE_IDS.DOCUMENTS]: FileText,
  [PAGE_IDS.FINANCE]: CircleDollarSign,
  [PAGE_IDS.ALERTS]: Bell,
  [PAGE_IDS.USERS]: ShieldCheck,
  [PAGE_IDS.SETTINGS]: Settings,
  [PAGE_IDS.OPERATII_CONFIG]: Cog,
  [PAGE_IDS.CONTRACTS]: ScrollText,
  [PAGE_IDS.ENGINEERING]: GitBranch,
  [PAGE_IDS.LIBRARIES]: Library,
  [PAGE_IDS.WAREHOUSE]: Container,
  [PAGE_IDS.DEPLASARI]: MapPin,
  [PAGE_IDS.FISA_PROIECTANT]: ClipboardCheck,
  [PAGE_IDS.SALES_HUB]: Target,
  [PAGE_IDS.CHAT]: MessageCircle,
  [PAGE_IDS.EMAIL]: Mail,
  [PAGE_IDS.MAINTENANCE]: Hammer,
  [PAGE_IDS.QUOTATIONS]: FileText,
  [PAGE_IDS.CALENDAR]: Calendar,
  [PAGE_IDS.TIME_TRACKING]: Clock,
  [PAGE_IDS.SERVICE_TICKETS]: Wrench,
  [PAGE_IDS.THREE_WAY_MATCH]: GitMerge,
  [PAGE_IDS.RFQS]: Inbox,
  [PAGE_IDS.REPORTS]: BarChart3,
  [PAGE_IDS.TASKS]: CheckSquare,
  [PAGE_IDS.GOODS_RECEIPT]: PackageCheck,
  [PAGE_IDS.TABLET]: Smartphone,
  [PAGE_IDS.TUTORIAL]: GraduationCap,
  [PAGE_IDS.MANAGER_CONTROL]: Gauge,
  
  [PAGE_IDS.SALES_WORKSPACE]: Target,
  [PAGE_IDS.ENGINEERING_WORKSPACE]: GitBranch,
  [PAGE_IDS.PRODUCTION_WORKSPACE]: Factory,
  [PAGE_IDS.PROCUREMENT_WORKSPACE]: Warehouse,
  [PAGE_IDS.FINANCE_WORKSPACE]: CircleDollarSign,
  [PAGE_IDS.PROJECTS_CONTRACTS_WORKSPACE]: FolderKanban,
  [PAGE_IDS.INSTRUMENTE_WORKSPACE]: GraduationCap,
  [PAGE_IDS.PERSONAL_WORKSPACE]: CheckSquare,
  [PAGE_IDS.SISTEM_WORKSPACE]: Settings,
};







const WORKSPACE_DEFAULT_TAB: Record<string, string> = {
  [PAGE_IDS.SALES_WORKSPACE]: 'sales-hub',
  
  
  [PAGE_IDS.ENGINEERING_WORKSPACE]: 'fisa-proiectant',
  [PAGE_IDS.PRODUCTION_WORKSPACE]: 'production',
  [PAGE_IDS.PROCUREMENT_WORKSPACE]: 'warehouse',
  [PAGE_IDS.FINANCE_WORKSPACE]: 'finance',
  [PAGE_IDS.PROJECTS_CONTRACTS_WORKSPACE]: 'projects',
  [PAGE_IDS.INSTRUMENTE_WORKSPACE]: 'tutorial',
  [PAGE_IDS.PERSONAL_WORKSPACE]: 'tasks',
  [PAGE_IDS.SISTEM_WORKSPACE]: 'users',
};

function pageIdToPath(pageId: string, opts?: { projectId?: number; stationId?: number }): string {
  if (pageId === PAGE_IDS.DASHBOARD) return '/';
  if (pageId === PAGE_IDS.STATION_DETAIL) {
    return opts?.stationId ? `/stations/${opts.stationId}` : '/stations';
  }
  if (pageId === PAGE_IDS.PARTS_TREE) {
    return opts?.projectId ? `/parts-tree/${opts.projectId}` : '/parts-tree';
  }
  
  const defaultTab = WORKSPACE_DEFAULT_TAB[pageId];
  if (defaultTab) return `/${defaultTab}`;
  return `/${pageId}`;
}


const TAB_TO_WORKSPACE: Record<string, string> = {
  'sales-hub': PAGE_IDS.SALES_WORKSPACE,
  'quotations': PAGE_IDS.SALES_WORKSPACE,
  'clients': PAGE_IDS.SALES_WORKSPACE,
  'engineering': PAGE_IDS.ENGINEERING_WORKSPACE,
  'fisa-proiectant': PAGE_IDS.ENGINEERING_WORKSPACE,
  'fisa-templates': PAGE_IDS.ENGINEERING_WORKSPACE,
  'parts-tree': PAGE_IDS.ENGINEERING_WORKSPACE,
  'parts-ordering': PAGE_IDS.ENGINEERING_WORKSPACE,
  'briefings': PAGE_IDS.ENGINEERING_WORKSPACE,
  'libraries': PAGE_IDS.ENGINEERING_WORKSPACE,
  'production': PAGE_IDS.PRODUCTION_WORKSPACE,
  'time-tracking': PAGE_IDS.PRODUCTION_WORKSPACE,
  'stations': PAGE_IDS.PRODUCTION_WORKSPACE,
  'maintenance': PAGE_IDS.PRODUCTION_WORKSPACE,
  'service-tickets': PAGE_IDS.PRODUCTION_WORKSPACE,
  'warehouse': PAGE_IDS.PROCUREMENT_WORKSPACE,
  'materials': PAGE_IDS.PROCUREMENT_WORKSPACE,
  'suppliers': PAGE_IDS.PROCUREMENT_WORKSPACE,
  'purchase-orders': PAGE_IDS.PROCUREMENT_WORKSPACE,
  'goods-receipt': PAGE_IDS.PROCUREMENT_WORKSPACE,
  'rfqs': PAGE_IDS.PROCUREMENT_WORKSPACE,
  'three-way-match': PAGE_IDS.PROCUREMENT_WORKSPACE,
  'finance': PAGE_IDS.FINANCE_WORKSPACE,
  'documents': PAGE_IDS.FINANCE_WORKSPACE,
  'reports': PAGE_IDS.FINANCE_WORKSPACE,
  'projects': PAGE_IDS.PROJECTS_CONTRACTS_WORKSPACE,
  'contracts': PAGE_IDS.PROJECTS_CONTRACTS_WORKSPACE,
  'tutorial': PAGE_IDS.INSTRUMENTE_WORKSPACE,
  'email': PAGE_IDS.INSTRUMENTE_WORKSPACE,
  'chat': PAGE_IDS.INSTRUMENTE_WORKSPACE,
  'alerts': PAGE_IDS.INSTRUMENTE_WORKSPACE,
  'download-app': PAGE_IDS.INSTRUMENTE_WORKSPACE,
  'tasks': PAGE_IDS.PERSONAL_WORKSPACE,
  'calendar': PAGE_IDS.PERSONAL_WORKSPACE,
  'deplasari': PAGE_IDS.PERSONAL_WORKSPACE,
  'users': PAGE_IDS.SISTEM_WORKSPACE,
  'sessions': PAGE_IDS.SISTEM_WORKSPACE,
  'settings': PAGE_IDS.SISTEM_WORKSPACE,
  'operatii-config': PAGE_IDS.SISTEM_WORKSPACE,
};

function pathToPageId(path: string): string {
  if (path === '/' || path === '') return PAGE_IDS.DASHBOARD;
  
  if (/^\/stations\/\d+/.test(path)) return PAGE_IDS.STATION_DETAIL;
  if (/^\/parts-tree\/\d+/.test(path)) return PAGE_IDS.PARTS_TREE;
  
  const seg = path.split('/').filter(Boolean)[0] ?? '';
  
  return TAB_TO_WORKSPACE[seg] || seg || PAGE_IDS.DASHBOARD;
}





interface ShellProps {
  user: User;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  notificationCount: number;
  chatUnread: number;
  onLogout: () => void;
}

function AppShellRouted({
  user, theme, setTheme, notificationCount, chatUnread,
  onLogout,
}: ShellProps) {
  const [location, setLocation] = useLocation();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);


  const businessType = useBusinessTypeStore(s => s.businessType);
  useEffect(() => { void useBusinessTypeStore.getState().fetch(); }, []);

  const inferredBusinessType = businessType;

  useLiveEvents();

  const openPalette = useCallback(() => useLayoutStore.getState().openCommandPalette(), []);

  
  
  const createNew = useCallback(() => {
    const seg = location.split('/').filter(Boolean)[0] ?? '';
    const ws = TAB_TO_WORKSPACE[seg];
    const target =
      ws === PAGE_IDS.FINANCE_WORKSPACE ? '/finance'
      : ws === PAGE_IDS.PROCUREMENT_WORKSPACE ? '/materials'
      : ws === PAGE_IDS.PROJECTS_CONTRACTS_WORKSPACE ? '/projects'
      : ws === PAGE_IDS.PERSONAL_WORKSPACE ? '/tasks'
      : '/quotations'; 
    setLocation(target);
  }, [location, setLocation]);

  
  
  const saveActive = useCallback(() => {
    window.dispatchEvent(new CustomEvent('promix:save'));
  }, []);

  useKeyboardShortcuts([
    { keys: 'Shift+?', description: 'Scurtături',         handler: () => setShortcutsOpen(v => !v) },
    { keys: 'Mod+K',   description: 'Paletă de comenzi',  handler: openPalette },
    { keys: 'Mod+/',   description: 'Paletă de comenzi',  handler: openPalette },
    { keys: 'Mod+,',   description: 'Setări',             handler: () => setLocation('/settings') },
    { keys: 'Mod+n',   description: 'Creează nou',        handler: createNew },
    { keys: 'Mod+s',   description: 'Salvează',           handler: saveActive },
    
    { keys: 'g d', description: 'Dashboard',  handler: () => setLocation('/') },
    { keys: 'g r', description: 'Proiecte',   handler: () => setLocation('/projects') },
    { keys: 'g v', description: 'Vânzări',    handler: () => setLocation('/sales-hub') },
    { keys: 'g f', description: 'Financiar',  handler: () => setLocation('/finance') },
    { keys: 'g p', description: 'Personal',   handler: () => setLocation('/tasks') },
    { keys: 'g c', description: 'Mesaje',     handler: () => setLocation('/chat') },
    { keys: 'Escape', description: 'Închide modal', when: () => shortcutsOpen, handler: () => setShortcutsOpen(false) },
  ]);

  const shortcutsForOverlay: ShortcutEntry[] = [
    { group: 'Navigare',  keys: 'g d',      description: 'Dashboard' },
    { group: 'Navigare',  keys: 'g r',      description: 'Proiecte' },
    { group: 'Navigare',  keys: 'g v',      description: 'Vânzări' },
    { group: 'Navigare',  keys: 'g f',      description: 'Financiar' },
    { group: 'Navigare',  keys: 'g p',      description: 'Personal / Task-uri' },
    { group: 'Navigare',  keys: 'g c',      description: 'Mesaje' },
    { group: 'Acțiuni',   keys: 'Mod+K',    description: 'Paletă de comenzi' },
    { group: 'Acțiuni',   keys: 'Mod+/',    description: 'Paletă de comenzi (alt.)' },
    { group: 'Acțiuni',   keys: 'Mod+N',    description: 'Creează nou (în context)' },
    { group: 'Acțiuni',   keys: 'Mod+,',    description: 'Deschide setările' },
    { group: 'Editare',   keys: 'Mod+S',    description: 'Salvează formularul activ' },
    { group: 'Editare',   keys: 'Escape',   description: 'Închide modal / dialog' },
    { group: 'Ajutor',    keys: 'Shift+?',  description: 'Afișează acest panel' },
  ];

  
  useEffect(() => {
    if (location && location !== '/') {
      localStorage.setItem('promix_last_path', location);
    }
  }, [location]);





  const currentPage = pathToPageId(location);

  // Per-page appearance overrides → data-pc-* on <html> for the active page.
  usePageCustomizationApplier(currentPage);
  // Leave card-positioning "edit mode" whenever the route changes.
  const setLayoutEdit = useLayoutEditStore((s) => s.set);
  useEffect(() => { setLayoutEdit(false); }, [currentPage, setLayoutEdit]);

  const activeWorkspaceId = currentPage in WORKSPACE_SUBPAGES ? currentPage : null;

  
  // Mobile version disabled — one responsive shell serves every width (the
  // search bar collapses to an icon and the nav to a hamburger drawer below
  // lg; see Titlebar / Navbar). No phone routing, no PhoneGate.

  const navigateTo = useCallback((page: string, opts?: { projectId?: number; stationId?: number }) => {
    setLocation(pageIdToPath(page, opts));
  }, [setLocation]);

  const goBack = useCallback(() => {
    if (window.history.length > 1) window.history.back();
  }, []);

  
  
  const handleNotificationsClick = useCallback(() => navigateTo(PAGE_IDS.ALERTS), [navigateTo]);
  const handleNavigateToPage = useCallback((pageId: string) => navigateTo(pageId as PageId), [navigateTo]);

  
  
  
  const navbarItems: SidebarItem[] = useMemo(() => {
    const role = normalizeRole(user.role_name);
    const navGroups = getNavGroupsForRole(role);
    const flatIds = navGroups.flatMap((g) => g.itemIds);
    const uniqueIds = [...new Set(flatIds)];

    
    
    
    
    const extraIds: string[] = [];

    if (user.custom_pages && role !== 'admin') {
      try {
        const parsed = JSON.parse(user.custom_pages);
        const pageIds = Array.isArray(parsed) ? parsed : Object.keys(parsed);
        if (pageIds.length > 0) {
          
          
          for (const id of pageIds) {
            if (!flatIds.includes(id) && id !== PAGE_IDS.DASHBOARD && id !== PAGE_IDS.SETTINGS) {
              extraIds.push(id);
              uniqueIds.push(id);
            }
          }
        }
      } catch {  }
    }

    const buildItem = (id: string, group: string): SidebarItem => {
      const ws = workspaceIdForNav(id);
      return {
        id,
        icon: iconMap[id],
        label: PAGE_TITLES[id as PageId] ?? id,
        
        
        isActive: ws ? ws === activeWorkspaceId : currentPage === id,
        onClick: () => navigateTo(id),
        
        
        badge: id === PAGE_IDS.INSTRUMENTE_WORKSPACE
          ? (((notificationCount || 0) + (chatUnread || 0)) || undefined)
          : id === PAGE_IDS.ALERTS ? notificationCount
          : id === PAGE_IDS.CHAT ? (chatUnread || undefined)
          : undefined,
        group,
      };
    };

    
    const items: SidebarItem[] = navGroups.flatMap((g) => {
      return g.itemIds
        .filter((id) => uniqueIds.includes(id) && iconMap[id])
        .map((id) => buildItem(id, g.title));
    });

    
    
    for (const id of extraIds) {
      if (!iconMap[id]) continue;
      items.push(buildItem(id, 'Adăugate'));
    }

    return items;
  }, [user.role_name, user.custom_pages, currentPage, activeWorkspaceId, notificationCount, chatUnread, navigateTo]);

  
  const pageTitle = PAGE_TITLES[currentPage as PageId] ?? currentPage;

  const workspaceTabToWorkspace = useMemo(() => {
    const map = new Map<string, string>();
    for (const [workspaceId, tabs] of Object.entries(WORKSPACE_SUBPAGES)) {
      for (const tab of tabs) {
        map.set(tab.id, workspaceId);
      }
    }
    return map;
  }, []);

  const renderWorkspaceTab = useCallback((tabId: string) => {
    const workspaceId = workspaceTabToWorkspace.get(tabId);
    if (!workspaceId) return null;

    switch (workspaceId) {
      case PAGE_IDS.SALES_WORKSPACE:
        return <SalesWorkspace user={user} onNavigate={navigateTo} initialTab={tabId} />;
      case PAGE_IDS.ENGINEERING_WORKSPACE:
        return <EngineeringWorkspace user={user} onNavigate={navigateTo} initialTab={tabId} />;
      case PAGE_IDS.PRODUCTION_WORKSPACE:
        return <ProductionWorkspace user={user} onNavigate={navigateTo} initialTab={tabId} />;
      case PAGE_IDS.PROCUREMENT_WORKSPACE:
        return <ProcurementWorkspace user={user} onNavigate={navigateTo} initialTab={tabId} />;
      case PAGE_IDS.FINANCE_WORKSPACE:
        return <FinanceWorkspace user={user} onNavigate={navigateTo} initialTab={tabId} />;
      case PAGE_IDS.PROJECTS_CONTRACTS_WORKSPACE:
        return <ProjectsContractsWorkspace user={user} onNavigate={navigateTo} initialTab={tabId} />;
      case PAGE_IDS.INSTRUMENTE_WORKSPACE:
        return <InstrumenteWorkspace user={user} onNavigate={navigateTo} initialTab={tabId} />;
      case PAGE_IDS.PERSONAL_WORKSPACE:
        return <PersonalWorkspace user={user} onNavigate={navigateTo} initialTab={tabId} />;
      case PAGE_IDS.SISTEM_WORKSPACE:
        return <SistemWorkspace user={user} onNavigate={navigateTo} initialTab={tabId} currentTheme={theme} onThemeChange={setTheme} />;
      default:
        return null;
    }
  }, [navigateTo, theme, user, workspaceTabToWorkspace]);

  
  
  
  
  
  return (
    <AppShell
      title={pageTitle}
      businessType={inferredBusinessType}
      userName={user.full_name || user.username}
      roleName={user.role_name || ''}
      jobTitle={user.job_title || null}
      notificationCount={notificationCount}
      navbarItems={navbarItems}
      routeKey={currentPage}
      onBack={window.history.length > 1 ? goBack : undefined}
      onSearchNavigate={(hit) => {
        sessionStorage.setItem(`promix_focus_${hit.type}`, String(hit.id));
        switch (hit.type) {
          case 'project':  navigateTo(PAGE_IDS.PROJECTS); break;
          case 'client':   navigateTo(PAGE_IDS.CLIENTS); break;
          case 'material': navigateTo(PAGE_IDS.MATERIALS); break;
          case 'document': navigateTo(PAGE_IDS.DOCUMENTS); break;
          case 'station':  navigateTo(PAGE_IDS.STATION_DETAIL, { stationId: hit.id }); break;
          case 'piece':    navigateTo(PAGE_IDS.PARTS_TREE); break;
        }
      }}
      onNotificationsClick={handleNotificationsClick}
      onNavigateToPage={handleNavigateToPage}
      onOpenShortcuts={() => setShortcutsOpen(true)}
      onLogout={onLogout}
    >
      <ErrorBoundary key={currentPage} scope={`${currentPage || 'dashboard'}`}>
        <div className="page-vt-root app-surface relative z-10 flex flex-1 flex-col min-h-0 overflow-hidden animate-page-in motion-reduce:animate-none">
          {

}
          {
            isPageGated(currentPage) && !canAccessPage(user.role_name, currentPage as AppPage, user.custom_pages) ? (
              <AccessDeniedView
                pageId={currentPage}
                pageLabel={PAGE_TITLES[currentPage as PageId] ?? currentPage}
                roleLabel={getRoleDisplayLabel(user.role_name)}
                onGoHome={() => navigateTo(PAGE_IDS.DASHBOARD)}
              />
            ) : (
          <Suspense fallback={<PageFallback />}>
            <Switch>
              <Route path="/"                  >{() => <DashboardPage user={user} onNavigate={navigateTo} />}</Route>
              <Route path="/dashboard"          >{() => <DashboardPage user={user} onNavigate={navigateTo} />}</Route>
              <Route path="/manager-control"    >{() => <ManagerControlPage user={user} />}</Route>
              <Route path="/projects"           >{() => <ProjectsContractsWorkspace user={user} onNavigate={navigateTo} initialTab="projects" />}</Route>
              <Route path="/production"         >{() => <ProductionWorkspace user={user} onNavigate={navigateTo} initialTab="production" />}</Route>
              <Route path="/parts-tree/:projectId">
                {(params) => <PartsTreePage user={user} initialProjectId={Number(params.projectId)} />}
              </Route>
              <Route path="/parts-tree"         >{() => <EngineeringWorkspace user={user} onNavigate={navigateTo} initialTab="parts-tree" />}</Route>
              <Route path="/parts-ordering"     >{() => <EngineeringWorkspace user={user} onNavigate={navigateTo} initialTab="parts-ordering" />}</Route>
              <Route path="/briefings"          >{() => <EngineeringWorkspace user={user} onNavigate={navigateTo} initialTab="briefings" />}</Route>
              <Route path="/fisa-templates"     >{() => <EngineeringWorkspace user={user} onNavigate={navigateTo} initialTab="fisa-templates" />}</Route>
              <Route path="/materials"          >{() => <ProcurementWorkspace user={user} onNavigate={navigateTo} initialTab="materials" />}</Route>
              <Route path="/finance"            >{() => <FinanceWorkspace user={user} onNavigate={navigateTo} initialTab="finance" />}</Route>
              <Route path="/users"              >{() => <SistemWorkspace user={user} onNavigate={navigateTo} initialTab="users" currentTheme={theme} onThemeChange={setTheme} />}</Route>
              <Route path="/sessions"           >{() => <SistemWorkspace user={user} onNavigate={navigateTo} initialTab="sessions" currentTheme={theme} onThemeChange={setTheme} />}</Route>
              <Route path="/settings"           >{() => <SistemWorkspace user={user} onNavigate={navigateTo} initialTab="settings" currentTheme={theme} onThemeChange={setTheme} />}</Route>
              <Route path="/alerts"             >{() => <InstrumenteWorkspace user={user} onNavigate={navigateTo} initialTab="alerts" />}</Route>
              <Route path="/clients"            >{() => <SalesWorkspace user={user} onNavigate={navigateTo} initialTab="clients" />}</Route>
              <Route path="/documents"          >{() => <FinanceWorkspace user={user} onNavigate={navigateTo} initialTab="documents" />}</Route>
              <Route path="/suppliers"          >{() => <ProcurementWorkspace user={user} onNavigate={navigateTo} initialTab="furnizori" />}</Route>
              <Route path="/purchase-orders"    >{() => <ProcurementWorkspace user={user} onNavigate={navigateTo} initialTab="purchase-orders" />}</Route>
              <Route path="/goods-receipts"     >{() => <ProcurementWorkspace user={user} onNavigate={navigateTo} initialTab="receptii" />}</Route>
              <Route path="/stations/:id">
                {(params) => (
                  <StationDetailPage user={user} stationId={Number(params.id)} onBack={() => navigateTo(PAGE_IDS.STATIONS)} />
                )}
              </Route>
              <Route path="/stations">
                {() => <ProductionWorkspace user={user} onNavigate={navigateTo} initialTab="stations" />}
              </Route>
              <Route path="/contracts"          >{() => <ProjectsContractsWorkspace user={user} onNavigate={navigateTo} initialTab="contracts" />}</Route>
              {
}
              <Route path="/engineering"        >{() => <EngineeringWorkspace user={user} onNavigate={navigateTo} initialTab="fisa-proiectant" />}</Route>
              <Route path="/libraries"          >{() => <EngineeringWorkspace user={user} onNavigate={navigateTo} initialTab="libraries" />}</Route>
              <Route path="/warehouse"          >{() => <ProcurementWorkspace user={user} onNavigate={navigateTo} initialTab="warehouse" />}</Route>
              <Route path="/deplasari"          >{() => <PersonalWorkspace user={user} onNavigate={navigateTo} initialTab="deplasari" />}</Route>
              <Route path="/fisa-proiectant"    >{() => <EngineeringWorkspace user={user} onNavigate={navigateTo} initialTab="fisa-proiectant" />}</Route>
              {

}
              <Route path="/sales-hub/:id">
                {(params: { id: string }) => {
                  const id = Number(params.id);
                  return Number.isFinite(id) && id > 0
                    ? <LeadDetailPage user={user} leadId={id} />
                    : <SalesWorkspace user={user} onNavigate={navigateTo} initialTab="sales-hub" />;
                }}
              </Route>
              <Route path="/sales-hub"          >{() => <SalesWorkspace user={user} onNavigate={navigateTo} initialTab="sales-hub" />}</Route>
              <Route path="/quotations"         >{() => <SalesWorkspace user={user} onNavigate={navigateTo} initialTab="quotations" />}</Route>
              <Route path="/calendar"           >{() => <PersonalWorkspace user={user} onNavigate={navigateTo} initialTab="calendar" />}</Route>
              {
}
              <Route path="/time-tracking"      >{() => <ProductionWorkspace user={user} onNavigate={navigateTo} initialTab="production" />}</Route>
              <Route path="/service-tickets"    >{() => <ProductionWorkspace user={user} onNavigate={navigateTo} initialTab="service-tickets" />}</Route>
              <Route path="/three-way-match"    >{() => <ProcurementWorkspace user={user} onNavigate={navigateTo} initialTab="comenzi" />}</Route>
              <Route path="/rfqs"               >{() => <ProcurementWorkspace user={user} onNavigate={navigateTo} initialTab="comenzi" />}</Route>
              <Route path="/tablet"             >{() => <ProductionWorkspace user={user} onNavigate={navigateTo} initialTab="production" />}</Route>
              <Route path="/reports"            >{() => <FinanceWorkspace user={user} onNavigate={navigateTo} initialTab="reports" />}</Route>
              <Route path="/tasks"              >{() => <PersonalWorkspace user={user} onNavigate={navigateTo} initialTab="tasks" />}</Route>
              <Route path="/goods-receipt"      >{() => <ProcurementWorkspace user={user} onNavigate={navigateTo} initialTab="receptii" />}</Route>
              <Route path="/chat"               >{() => <InstrumenteWorkspace user={user} onNavigate={navigateTo} initialTab="chat" />}</Route>
              <Route path="/email"              >{() => <InstrumenteWorkspace user={user} onNavigate={navigateTo} initialTab="email" />}</Route>
              <Route path="/maintenance"        >{() => <ProductionWorkspace user={user} onNavigate={navigateTo} initialTab="maintenance" />}</Route>
              <Route path="/tutorial"           >{() => <InstrumenteWorkspace user={user} onNavigate={navigateTo} initialTab="tutorial" />}</Route>
              <Route path="/download-app"       >{() => <InstrumenteWorkspace user={user} onNavigate={navigateTo} initialTab="download-app" />}</Route>
              <Route path="/shared-files"       >{() => <InstrumenteWorkspace user={user} onNavigate={navigateTo} initialTab="shared-files" />}</Route>
              <Route path="/arhiva"             >{() => <InstrumenteWorkspace user={user} onNavigate={navigateTo} initialTab="arhiva" />}</Route>
              {}
              <Route path="/operatii-config"    >{() => <SistemWorkspace user={user} onNavigate={navigateTo} initialTab="settings" currentTheme={theme} onThemeChange={setTheme} />}</Route>
              <Route path="/:tabId">
                {(params: { tabId?: string }) => (params.tabId ? renderWorkspaceTab(params.tabId) : null)}
              </Route>
              <Route>
                {() => (
                  <div className="flex flex-1 items-center justify-center p-6">
                    <p className="text-sm text-content-muted">Pagina &quot;{location}&quot; nu este disponibilă.</p>
                  </div>
                )}
              </Route>
            </Switch>
          </Suspense>
            )
          }
          {/* Transition veil — opaque cover INSIDE the page snapshot so the View
              Transition morph never reveals the translucent skeleton/glass
              rectangles ("cadrane transparente"). Fades out when `vt-active`
              clears. CSS lives in redesign/theme.css (`.vt-veil`). */}
          <div className="vt-veil" aria-hidden="true">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        </div>
      </ErrorBoundary>
      <KeyboardShortcutsOverlay
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        shortcuts={shortcutsForOverlay}
      />
      <PatchNotesModal />
      <BroadcastPopup />
      <UpdateProgressOverlay />
    </AppShell>
  );
}






// DesktopToggleFab removed — there is no separate mobile version to toggle.





function RestoreLastPath({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (restored) return;

    const stored = localStorage.getItem('promix_last_path');

    if (stored && stored !== location) {
      setLocation(stored, { replace: true });
    }
    setRestored(true);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  
  void location;
  return <>{children}</>;
}



void useRoute;

function App() {
  const { user, isAuthenticated } = useAuthStore();
  const { theme, restoreTheme, setTheme } = useThemeStore();
  const density = useLayoutStore((s) => s.density);
  
  
  
  
  
  
  
  const localNotifs = useNotificationStore((s) => s.unreadCount);
  const dbUnread = useUserNotificationsStore((s) => s.unread);
  const notificationCount = localNotifs + dbUnread;

  
  
  const maintenanceMode = useMaintenanceStore((s) => s.mode);
  const maintenanceMessage = useMaintenanceStore((s) => s.message);
  const maintenanceEta = useMaintenanceStore((s) => s.eta);
  const startMaintenancePoll = useMaintenanceStore((s) => s.startPolling);

  
  useUserNotificationsPolling(isAuthenticated);

  
  
  useEffect(() => {
    if (!isAuthenticated) return;
    const stop = startMaintenancePoll(20000);
    return stop;
  }, [isAuthenticated, startMaintenancePoll]);

  
  
  useEffect(() => {
    document.documentElement.dataset.density = density;
    applyUiScale({ density });
  }, [density]);
  const [booted, setBooted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    restoreTheme();

    async function syncAiToken() {
      
      
      
      if (!('electron' in window)) return;
      try {
        const tok = await window.electron.invoke('ai_token_get') as string;
        if (tok) localStorage.setItem('promix_ai_token', tok);
      } catch {  }
    }

    async function init() {
      
      await syncAiToken();

      
      
      
      
      
      if ('electron' in window) {
        const serverUrl = getServerUrl();
        if (serverUrl) {
          let reachable = false;
          try {
            const res = await fetch(`${serverUrl}/api/health`, { signal: AbortSignal.timeout(1500) });
            reachable = res.ok;
          } catch {  }
          if (!reachable) {
            // eslint-disable-next-line no-console
            console.warn(`[App] Server ${serverUrl} unreachable — switching to local IPC mode`);
            setServerUrl('');
          }
        }
      }

      
      
      
      
      const token = localStorage.getItem('promix_token');
      const userJson = localStorage.getItem('promix_user');
      if (token && userJson) {
        try {
          const u = JSON.parse(userJson);
          useAuthStore.setState({ token, user: u, isAuthenticated: true });
          useAuthStore.getState().validateSession().then(async (valid) => {
            if (valid) return;
            localStorage.removeItem('promix_token');
            localStorage.removeItem('promix_user');
            useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
            
            await tryAutoLoginFromSavedCreds();
          });
        } catch {
          
          
          localStorage.removeItem('promix_token');
          localStorage.removeItem('promix_user');
          await tryAutoLoginFromSavedCreds();
        }
      } else {
        
        await tryAutoLoginFromSavedCreds();
      }
      setBooted(true);
    }

    async function tryAutoLoginFromSavedCreds() {
      if (!('electron' in window)) return;
      if (localStorage.getItem('promix_remember_me') !== '1') return;
      try {
        const creds = await window.electron.invoke('creds_load') as { username: string; password: string } | null;
        if (!creds?.username || !creds?.password) return;
        await useAuthStore.getState().login(creds.username, creds.password);
      } catch {
        
      }
    }

    void init();

    
    
    
    
    
    const unsubs: Array<() => void> = [];
    if ('electron' in window && typeof window.electron.onUpdateAvailable === 'function') {
      unsubs.push(window.electron.onUpdateAvailable((info) => {
        toast.info(`Versiunea ${info.version} disponibilă — se descarcă în fundal`, 6000);
      }));
      unsubs.push(window.electron.onUpdateDownloaded((info) => {
        toast.success(`Versiunea ${info.version} pregătită — se va instala automat la închiderea aplicației`, 8000);
      }));
    }
    return () => { unsubs.forEach((u) => u()); };
  }, [restoreTheme]);

  const handleSplashFinished = useCallback(() => {
    setShowSplash(false);
  }, []);

  
  useEffect(() => {
    if (!isAuthenticated) return;
    let iv: ReturnType<typeof setInterval> | null = null;
    const fetchUnread = () => { apiCommand<number>('get_chat_unread_count').then(setChatUnread).catch(() => {}); };

    const start = () => {
      if (iv) return;
      fetchUnread();
      iv = setInterval(fetchUnread, 60000);
    };
    const stop = () => { if (iv) { clearInterval(iv); iv = null; } };

    if (!document.hidden) start();
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [isAuthenticated]);

  
  
  
  
  useEffect(() => {
    if (!isAuthenticated) return;
    let iv: ReturnType<typeof setInterval> | null = null;
    const tick = () => { apiCommand('email_sync_inbox').catch(() => {}); };
    const start = () => {
      if (iv) return;
      
      
      iv = setInterval(tick, 3 * 60 * 1000);
      setTimeout(tick, 30_000);
    };
    const stop = () => { if (iv) { clearInterval(iv); iv = null; } };
    if (!document.hidden) start();
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [isAuthenticated]);

  const handleLogin = async (username: string, password: string) => {
    const { login } = useAuthStore.getState();
    return await login(username, password);
  };

  const handleLogout = async () => {
    const { logout } = useAuthStore.getState();
    try { await logout(); } catch {  }
    // Drop the cached business type so the next login on this (possibly shared)
    // device re-resolves nav from the server instead of inheriting the prior
    // tenant's navigation.
    useBusinessTypeStore.getState().reset();

    localStorage.removeItem('promix_remember_me');
    if ('electron' in window) {
      try { await window.electron.invoke('creds_clear'); } catch {  }
    }
    location.hash = '/';
  };

  
  if (showSplash) {
    return <SplashScreen onFinished={handleSplashFinished} />;
  }

  if (!booted) {
    return <BootLoader />;
  }

  

  
  if (typeof window !== 'undefined' && (window.location.hash.startsWith('#/portal/') || window.location.hash.startsWith('#/rfq/') || window.location.hash.startsWith('#/download'))) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Router>
          <Switch>
            <Route path="/portal/:token">{() => <CustomerPortalPage />}</Route>
            <Route path="/rfq/:token">{() => <RfqResponsePage />}</Route>
            <Route path="/download">{() => <DownloadPage />}</Route>
          </Switch>
        </Router>
      </Suspense>
    );
  }

  if (!isAuthenticated || !user) {
    // User-based tenant routing: no firm chooser. The user just logs in; the
    // host broker (/api/auth/login) resolves which firm they belong to from
    // their credentials and the app re-boots through that firm's /t/<slug>.
    return <LoginPage onLogin={handleLogin} />;
  }

  
  
  const isAdmin = normalizeRole(user.role_name) === 'admin';
  if (maintenanceMode && !isAdmin) {
    return <MaintenanceScreen message={maintenanceMessage} eta={maintenanceEta} />;
  }

  
  
  
  
  
  
  
  
  if (user.must_change_password) {
    return <ForcePasswordChangePage username={user.username} onLogout={handleLogout} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <ConnectionStatusBanner />
      {maintenanceMode && isAdmin && (
        <div className="flex items-center justify-center gap-2 bg-status-amber/15 text-status-amber border-b border-status-amber/30 px-4 py-1.5 text-pm-xs font-semibold">
          <Wrench className="h-3.5 w-3.5" />
          Mod mentenanță activ — doar administratorii au acces. Dezactivează din Setări → Mod mentenanță.
        </div>
      )}
      <ConfirmDialogHost />
      <ToastContainer />
      <AdminSetupGate isAdmin={isAdmin} />
      <Router hook={useTransitionLocation}>
        <RestoreLastPath>
          <PageTransitionDriver />
          <AppShellRouted
            user={user}
            theme={theme}
            setTheme={setTheme}
            notificationCount={notificationCount}
            chatUnread={chatUnread}
            onLogout={handleLogout}
          />
        </RestoreLastPath>
      </Router>
    </div>
  );
}

function ConnectionStatusBanner() {
  const { state, retryInSec, retryNow, serverUrl } = useServerConnection();
  return (
    <ConnectionBanner
      state={state}
      serverUrl={serverUrl}
      retryInSec={retryInSec}
      onRetryNow={retryNow}
    />
  );
}

export default App;
