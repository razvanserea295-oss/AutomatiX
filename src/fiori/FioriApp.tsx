import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType, type LazyExoticComponent } from 'react';
import { Router, Switch, Route, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { BusyIndicator, MessageStrip, Button } from '@ui5/webcomponents-react';
import BootLoader from '@/components/BootLoader';
import { useAuthStore } from '@/store/authStore';
import { useUiModeStore } from '@/store/uiModeStore';
import FioriShell from '@/redesign/shell/FioriShell';
import FioriLogin from './pages/FioriLogin';
import FioriPlaceholder from './pages/FioriPlaceholder';
import {
  buildFioriNav, selectedIdsForRoute, routeForNavId, titleForPage, allPageIds,
} from './shell/fioriNavConfig';
import type { User } from '@/core/types';

// Real UI5 page implementations, keyed by page id. Ids not listed here (tutorial,
// download-app) fall back to FioriPlaceholder, so the app stays fully navigable.
const REAL_PAGES: Record<string, LazyExoticComponent<ComponentType<{ user: User }>>> = {
  dashboard: lazy(() => import('./pages/dashboard/FioriDashboard')),
  // Vânzări
  'sales-hub': lazy(() => import('./pages/sales/FioriSalesHub')),
  quotations: lazy(() => import('./pages/sales/FioriQuotations')),
  clients: lazy(() => import('./pages/sales/FioriClients')),
  // Proiecte & Contracte
  projects: lazy(() => import('./pages/projects/FioriProjects')),
  contracts: lazy(() => import('./pages/projects/FioriContracts')),
  // Inginerie
  briefings: lazy(() => import('./pages/engineering/FioriBriefings')),
  'fisa-proiectant': lazy(() => import('./pages/engineering/FioriFisaProiectant')),
  'fisa-templates': lazy(() => import('./pages/engineering/FioriTemplates')),
  'parts-tree': lazy(() => import('./pages/engineering/FioriPartsTree')),
  'parts-ordering': lazy(() => import('./pages/engineering/FioriPartsOrdering')),
  libraries: lazy(() => import('./pages/engineering/FioriLibraries')),
  // Producție
  production: lazy(() => import('./pages/production/FioriProduction')),
  maintenance: lazy(() => import('./pages/production/FioriMaintenance')),
  'service-tickets': lazy(() => import('./pages/production/FioriServiceTickets')),
  // Aprovizionare
  warehouse: lazy(() => import('./pages/procurement/FioriWarehouse')),
  materials: lazy(() => import('./pages/procurement/FioriMaterials')),
  'purchase-orders': lazy(() => import('./pages/procurement/FioriPurchaseOrders')),
  // Financiar
  finance: lazy(() => import('./pages/finance/FioriFinance')),
  documents: lazy(() => import('./pages/finance/FioriDocuments')),
  reports: lazy(() => import('./pages/finance/FioriReports')),
  // Instrumente
  'birou-control': lazy(() => import('./pages/instrumente/FioriBirouControl')),
  email: lazy(() => import('./pages/instrumente/FioriEmail')),
  chat: lazy(() => import('./pages/instrumente/FioriChat')),
  alerts: lazy(() => import('./pages/instrumente/FioriAlerts')),
  // Personal
  tasks: lazy(() => import('./pages/personal/FioriTasks')),
  calendar: lazy(() => import('./pages/personal/FioriCalendar')),
  deplasari: lazy(() => import('./pages/personal/FioriDeplasari')),
  // Sistem
  users: lazy(() => import('./pages/sistem/FioriUsers')),
  sessions: lazy(() => import('./pages/sistem/FioriSessions')),
  settings: lazy(() => import('./pages/sistem/FioriSettingsPage')),
};

function FioriContent({ user, pageId }: { user: User; pageId: string }) {
  const Real = REAL_PAGES[pageId];
  if (Real) return <Real user={user} />;
  return <FioriPlaceholder pageId={pageId} />;
}

function FioriShellRouter({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [location, navigate] = useLocation();
  const { wsId, pageId } = selectedIdsForRoute(location);

  const navItems = useMemo(() => {
    return buildFioriNav(user).map(it => ({
      ...it,
      selected: it.id === wsId && (!it.subItems || it.subItems.length === 0),
      subItems: it.subItems?.map(s => ({ ...s, selected: s.id === pageId })),
    }));
  }, [user, wsId, pageId]);

  const pageIds = useMemo(() => allPageIds(user), [user]);

  const initials = (user.full_name || user.username || 'U')
    .split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <FioriShell
      pageTitle={titleForPage(pageId)}
      selectedId={wsId}
      navItems={navItems}
      onNavigate={(id) => navigate(routeForNavId(id, user))}
      onLogout={onLogout}
      userInitials={initials}
    >
      <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><BusyIndicator active size="L" /></div>}>
        <Switch>
          {pageIds.map(id => (
            <Route key={id} path={id === 'dashboard' ? '/dashboard' : `/${id}`}>
              {() => <FioriContent user={user} pageId={id} />}
            </Route>
          ))}
          <Route path="/">{() => <FioriContent user={user} pageId="dashboard" />}</Route>
          <Route>{() => <FioriContent user={user} pageId={pageId || 'dashboard'} />}</Route>
        </Switch>
      </Suspense>
    </FioriShell>
  );
}

export default function FioriApp() {
  const { user, isAuthenticated, isLoadingSession, restoreSession, logout } = useAuthStore();
  const setMode = useUiModeStore(s => s.setMode);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    let active = true;
    void restoreSession().finally(() => { if (active) setBooted(true); });
    return () => { active = false; };
  }, [restoreSession]);

  if (!booted || isLoadingSession) return <BootLoader />;
  if (!isAuthenticated || !user) return <FioriLogin />;

  if (user.must_change_password) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ maxWidth: '30rem' }}>
          <MessageStrip design="Critical" hideCloseButton>
            Trebuie să-ți schimbi parola la prima autentificare. Continuă din interfața Modern, apoi revino la Fiori.
          </MessageStrip>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <Button design="Emphasized" onClick={() => setMode('saas')}>Mergi la interfața Modern</Button>
            <Button design="Transparent" onClick={() => void logout()}>Deconectare</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router hook={useHashLocation}>
      <div style={{ height: '100vh' }}>
        <FioriShellRouter user={user} onLogout={() => void logout()} />
      </div>
    </Router>
  );
}
