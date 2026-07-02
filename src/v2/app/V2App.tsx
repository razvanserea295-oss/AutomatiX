import { Suspense, useEffect, useState } from 'react';
import { Router, Switch, Route } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { Toaster } from 'sonner';
import { V2_TOASTER_PROPS } from '@/v2/lib/toaster';
import '@/v2/styles/globals.css';

import { useAuthStore } from '@/store/authStore';
import { useMaintenanceStore } from '@/store/maintenanceStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useUserNotificationsPolling } from '@/hooks/useUserNotificationsPolling';
import { useBusinessTypeStore } from '@/store/businessTypeStore';
import { normalizeRole } from '@/lib/access';
import { lazyWithRetry } from '@/utils/lazyWithRetry';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConfirmDialogHost } from '@/components/ConfirmDialog';
import MaintenanceScreen from '@/components/MaintenanceScreen';
import AccessDeniedView from '@/components/AccessDeniedView';
import V2AppShell from '@/v2/components/shell/V2AppShell';
import { Skeleton } from '@/v2/components/ui/skeleton';
import { GlobalProgressBar, NavigationProgress } from '@/redesign/ui/loading';
import { getServerUrl, setServerUrl } from '@/config/server';

import LoginPage from '@/v2/pages/auth/LoginPage';
import ForcePasswordChangePage from '@/v2/pages/auth/ForcePasswordChangePage';
import LicenseActivationPage from '@/v2/pages/auth/LicenseActivationPage';
import LicenseLoginGate from '@/v2/pages/auth/LicenseLoginGate';

// Greenfield pages — backend only, no legacy UI
const DashboardPage = lazyWithRetry(() => import('@/v2/pages/dashboard/DashboardPage'));
const ManagerControlPage = lazyWithRetry(() => import('@/v2/pages/admin/ManagerControlPage'));
const PipelinePage = lazyWithRetry(() => import('@/v2/pages/sales/PipelinePage'));
const LeadPage = lazyWithRetry(() => import('@/v2/pages/sales/LeadPage'));
const ClientsPage = lazyWithRetry(() => import('@/v2/pages/sales/ClientsPage'));
const ProjectsPage = lazyWithRetry(() => import('@/v2/pages/projects/ProjectsPage'));
const ProjectDetailPage = lazyWithRetry(() => import('@/v2/pages/projects/ProjectDetailPage'));
const KanbanPage = lazyWithRetry(() => import('@/v2/pages/production/KanbanPage'));
const StationsPage = lazyWithRetry(() => import('@/v2/pages/production/StationsPage'));
const StationDetailPage = lazyWithRetry(() => import('@/v2/pages/production/StationDetailPage'));
const FinancePage = lazyWithRetry(() => import('@/v2/pages/finance/FinancePage'));
const AlertsPage = lazyWithRetry(() => import('@/v2/pages/comunicare/AlertsPage'));
const ChatPage = lazyWithRetry(() => import('@/v2/pages/comunicare/ChatPage'));
const EmailPage = lazyWithRetry(() => import('@/v2/pages/comunicare/EmailPage'));
const SettingsPage = lazyWithRetry(() => import('@/v2/pages/admin/SettingsPage'));
const WarehousePage = lazyWithRetry(() => import('@/v2/pages/procurement/WarehousePage'));
const PartsTreePage = lazyWithRetry(() => import('@/v2/pages/engineering/PartsTreePage'));
const QuotationsPage = lazyWithRetry(() => import('@/v2/pages/sales/QuotationsPage'));
const PurchaseOrdersPage = lazyWithRetry(() => import('@/v2/pages/procurement/PurchaseOrdersPage'));
const GoodsReceiptsPage = lazyWithRetry(() => import('@/v2/pages/procurement/GoodsReceiptsPage'));
const ServiceTicketsPage = lazyWithRetry(() => import('@/v2/pages/production/ServiceTicketsPage'));
const FisaProiectantPage = lazyWithRetry(() => import('@/v2/pages/engineering/FisaProiectantPage'));
const UserSessionsPage = lazyWithRetry(() => import('@/v2/pages/admin/UserSessionsPage'));
const AiPage = lazyWithRetry(() => import('@/v2/pages/ai/AiPage'));
const RemoteSupportPage = lazyWithRetry(() => import('@/v2/pages/tools/RemoteSupportPage'));
const PrintPage = lazyWithRetry(() => import('@/v2/pages/tools/PrintPage'));
const TutorialPage = lazyWithRetry(() => import('@/v2/pages/tools/TutorialPage'));
const DownloadAppPage = lazyWithRetry(() => import('@/v2/pages/tools/DownloadAppPage'));
const SharedFilesPage = lazyWithRetry(() => import('@/v2/pages/tools/SharedFilesPage'));
const ArhivaPage = lazyWithRetry(() => import('@/v2/pages/admin/ArhivaPage'));
const DocumentsPage = lazyWithRetry(() => import('@/v2/pages/documents/DocumentsPage'));
const ContractsPage = lazyWithRetry(() => import('@/v2/pages/sales/ContractsPage'));
const SuppliersPage = lazyWithRetry(() => import('@/v2/pages/procurement/SuppliersPage'));
const MaterialsPage = lazyWithRetry(() => import('@/v2/pages/procurement/MaterialsPage'));
const BriefingsPage = lazyWithRetry(() => import('@/v2/pages/projects/BriefingsPage'));
const DeplasariPage = lazyWithRetry(() => import('@/v2/pages/personal/DeplasariPage'));
const UsersPage = lazyWithRetry(() => import('@/v2/pages/admin/UsersPage'));
const TasksPage = lazyWithRetry(() => import('@/v2/pages/tasks/TasksPage'));
const ReportsPage = lazyWithRetry(() => import('@/v2/pages/admin/ReportsPage'));
const FisaTemplatesPage = lazyWithRetry(() => import('@/v2/pages/engineering/FisaTemplatesPage'));
const LibrariesPage = lazyWithRetry(() => import('@/v2/pages/engineering/LibrariesPage'));
const PiecesOrderingPage = lazyWithRetry(() => import('@/v2/pages/engineering/PiecesOrderingPage'));
const CalendarPage = lazyWithRetry(() => import('@/v2/pages/comunicare/CalendarPage'));
const LicensesPage = lazyWithRetry(() => import('@/v2/pages/admin/LicensesPage'));

// Public greenfield pages
const CustomerPortalPage = lazyWithRetry(() => import('@/v2/pages/public/CustomerPortalPage'));
const RfqResponsePage = lazyWithRetry(() => import('@/v2/pages/public/RfqResponsePage'));
const DownloadPage = lazyWithRetry(() => import('@/v2/pages/public/DownloadPage'));
const QuickSupportGuestPage = lazyWithRetry(() => import('@/v2/pages/public/QuickSupportGuestPage'));

function PageFallback() {
  return (
    <div className="space-y-3 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function V2AuthenticatedApp() {
  const user = useAuthStore((s) => s.user)!;
  const notificationCount = useNotificationStore((s) => s.unreadCount);
  useUserNotificationsPolling(true);

  const handleLogout = async () => {
    const { logout } = useAuthStore.getState();
    try { await logout(); } catch { /* ignore */ }
    useBusinessTypeStore.getState().reset();
    window.location.hash = '/v2';
  };

  const nav = (path: string) => {
    window.location.hash = path.startsWith('/v2') ? path : `/v2${path.startsWith('/') ? path : `/${path}`}`;
  };

  return (
    <V2AppShell user={user} notificationCount={notificationCount} onLogout={handleLogout}>
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Switch>
            <Route path="/v2">{() => <DashboardPage user={user} onNavigate={nav} />}</Route>
            <Route path="/v2/dashboard">{() => <DashboardPage user={user} onNavigate={nav} />}</Route>
            <Route path="/v2/manager-control">{() => <ManagerControlPage />}</Route>
            <Route path="/v2/birou-control">{() => <ManagerControlPage />}</Route>
            <Route path="/v2/sales-hub/:id">{() => <LeadPage />}</Route>
            <Route path="/v2/sales-hub">{() => <PipelinePage />}</Route>
            <Route path="/v2/quotations">{() => <QuotationsPage />}</Route>
            <Route path="/v2/clients">{() => <ClientsPage />}</Route>
            <Route path="/v2/projects/:id">{() => <ProjectDetailPage />}</Route>
            <Route path="/v2/projects">{() => <ProjectsPage />}</Route>
            <Route path="/v2/contracts">{() => <ContractsPage />}</Route>
            <Route path="/v2/briefings">{() => <BriefingsPage />}</Route>
            <Route path="/v2/fisa-templates">{() => <FisaTemplatesPage />}</Route>
            <Route path="/v2/parts-tree/:projectId">{(p) => <PartsTreePage initialProjectId={Number(p.projectId)} />}</Route>
            <Route path="/v2/parts-tree">{() => <PartsTreePage />}</Route>
            <Route path="/v2/parts-ordering">{() => <PiecesOrderingPage />}</Route>
            <Route path="/v2/libraries">{() => <LibrariesPage />}</Route>
            <Route path="/v2/production">{() => <KanbanPage />}</Route>
            <Route path="/v2/stations/:id">{() => <StationDetailPage />}</Route>
            <Route path="/v2/stations">{() => <StationsPage />}</Route>
            <Route path="/v2/maintenance">{() => <ServiceTicketsPage />}</Route>
            <Route path="/v2/service-tickets">{() => <ServiceTicketsPage />}</Route>
            <Route path="/v2/warehouse">{() => <WarehousePage />}</Route>
            <Route path="/v2/materials">{() => <MaterialsPage />}</Route>
            <Route path="/v2/purchase-orders">{() => <PurchaseOrdersPage />}</Route>
            <Route path="/v2/suppliers">{() => <SuppliersPage />}</Route>
            <Route path="/v2/goods-receipts">{() => <GoodsReceiptsPage />}</Route>
            <Route path="/v2/finance">{() => <FinancePage />}</Route>
            <Route path="/v2/documents">{() => <DocumentsPage />}</Route>
            <Route path="/v2/reports">{() => <ReportsPage />}</Route>
            <Route path="/v2/email">{() => <EmailPage />}</Route>
            <Route path="/v2/chat">{() => <ChatPage />}</Route>
            <Route path="/v2/alerts">{() => <AlertsPage />}</Route>
            <Route path="/v2/tasks">{() => <TasksPage />}</Route>
            <Route path="/v2/calendar">{() => <CalendarPage />}</Route>
            <Route path="/v2/deplasari">{() => <DeplasariPage />}</Route>
            <Route path="/v2/tutorial">{() => <TutorialPage />}</Route>
            <Route path="/v2/download-app">{() => <DownloadAppPage />}</Route>
            <Route path="/v2/print">{() => <PrintPage />}</Route>
            <Route path="/v2/remote-support">{() => <RemoteSupportPage />}</Route>
            <Route path="/v2/shared-files">{() => <SharedFilesPage />}</Route>
            <Route path="/v2/arhiva">{() => <ArhivaPage />}</Route>
            <Route path="/v2/licente">{() => <LicensesPage />}</Route>
            <Route path="/v2/ai">{() => <AiPage />}</Route>
            <Route path="/v2/fisa-proiectant">{() => <FisaProiectantPage />}</Route>
            <Route path="/v2/users">{() => <UsersPage />}</Route>
            <Route path="/v2/sessions">{() => <UserSessionsPage />}</Route>
            <Route path="/v2/settings">{() => <SettingsPage />}</Route>
            <Route path="/v2/*">{() => <AccessDeniedView pageId="dashboard" onGoHome={() => nav('/dashboard')} />}</Route>
          </Switch>
        </Suspense>
      </ErrorBoundary>
    </V2AppShell>
  );
}

function BootScreen() {
  return (
    <div className="v2-root flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="v2-spinner" aria-hidden />
        <p className="text-sm text-muted-foreground">Se încarcă…</p>
      </div>
    </div>
  );
}

export default function V2App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const maintenanceMode = useMaintenanceStore((s) => s.mode);
  const maintenanceDetails = useMaintenanceStore((s) => ({ message: s.message, eta: s.eta }));
  const startMaintenancePoll = useMaintenanceStore((s) => s.startPolling);
  const requiresLicense = useAuthStore((s) => s.requiresLicense);
  const [preLicenseRequired, setPreLicenseRequired] = useState(false);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('v2-active');
    return () => document.documentElement.classList.remove('v2-active');
  }, []);

  useEffect(() => {
    let active = true;

    async function init() {
      const serverUrl = getServerUrl();
      if (serverUrl && typeof window !== 'undefined' && !('electron' in window)) {
        let reachable = false;
        try {
          const res = await fetch(`${serverUrl}/api/health`, { signal: AbortSignal.timeout(2500) });
          reachable = res.ok;
        } catch { /* ignore */ }
        if (!reachable) {
          setServerUrl('');
        }
      }

      await restoreSession();

      if ('electron' in window && localStorage.getItem('promix_remember_me') === '1') {
        try {
          const creds = await window.electron.invoke('creds_load') as { username: string; password: string } | null;
          if (creds?.username && creds?.password && !useAuthStore.getState().isAuthenticated) {
            await useAuthStore.getState().login(creds.username, creds.password);
          }
        } catch { /* ignore */ }
      }
    }

    void init().finally(() => {
      if (active) setBooted(true);
    });

    return () => { active = false; };
  }, [restoreSession]);

  useEffect(() => {
    if (!isAuthenticated) return;
    return startMaintenancePoll(20000);
  }, [isAuthenticated, startMaintenancePoll]);

  const handleLogin = async (username: string, password: string) => {
    return useAuthStore.getState().login(username, password);
  };

  const handleLogout = async () => {
    try { await useAuthStore.getState().logout(); } catch { /* ignore */ }
    useBusinessTypeStore.getState().reset();
    window.location.hash = '/v2';
  };

  if (typeof window !== 'undefined') {
    const hash = window.location.hash;
    const isPublic =
      hash.startsWith('#/v2/portal/') || hash.startsWith('#/v2/rfq/') ||
      hash === '#/v2/download' || hash.startsWith('#/v2/support/q/');
    if (isPublic) {
      return (
        <div className="v2-root min-h-screen">
          <GlobalProgressBar />
          <Suspense fallback={<PageFallback />}>
            <Router hook={useHashLocation}>
              <NavigationProgress />
              <Switch>
                <Route path="/v2/portal/:token">{() => <CustomerPortalPage />}</Route>
                <Route path="/v2/rfq/:token">{() => <RfqResponsePage />}</Route>
                <Route path="/v2/download">{() => <DownloadPage />}</Route>
                <Route path="/v2/support/q/:code">{() => <QuickSupportGuestPage />}</Route>
              </Switch>
            </Router>
          </Suspense>
          <Toaster {...V2_TOASTER_PROPS} />
        </div>
      );
    }
  }

  if (!booted) {
    return <BootScreen />;
  }

  if (!isAuthenticated || !user) {
    if (preLicenseRequired) return <LicenseLoginGate onActivated={() => setPreLicenseRequired(false)} />;
    return (
      <div className="v2-root min-h-screen">
        <LoginPage onLogin={handleLogin} />
        <Toaster {...V2_TOASTER_PROPS} />
      </div>
    );
  }

  if (maintenanceMode && normalizeRole(user.role_name) !== 'admin') {
    return <MaintenanceScreen {...maintenanceDetails} />;
  }
  if (user.must_change_password) {
    return <ForcePasswordChangePage username={user.username} onLogout={handleLogout} />;
  }
  if (requiresLicense) {
    return <LicenseActivationPage isAdmin={normalizeRole(user.role_name) === 'admin'} onLogout={handleLogout} />;
  }

  return (
    <>
      <GlobalProgressBar />
      <ConfirmDialogHost />
      <Toaster {...V2_TOASTER_PROPS} />
      <Router hook={useHashLocation}>
        <NavigationProgress />
        <V2AuthenticatedApp />
      </Router>
    </>
  );
}
