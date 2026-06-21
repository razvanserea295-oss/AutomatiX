import { lazy, Suspense, useState, useEffect } from 'react';
import { Factory, Wrench, AlertTriangle } from 'lucide-react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';
import WorkspaceSkeleton from '@/redesign/ui/WorkspaceSkeleton';

const KanbanPage = lazy(() => import('@/redesign/pages/KanbanPage'));
const MaintenancePage = lazy(() => import('@/redesign/pages/maintenance/MaintenancePage'));
const ServiceTicketsPage = lazy(() => import('@/redesign/pages/service/ServiceTicketsPage'));

const TABS: WorkspaceTab[] = [
  { id: 'production',      label: 'Producție', icon: Factory,       prefetch: () => import('@/redesign/pages/KanbanPage') },
  { id: 'maintenance',     label: 'Service',   icon: Wrench,        prefetch: () => import('@/redesign/pages/maintenance/MaintenancePage') },
  { id: 'service-tickets', label: 'Tichete',   icon: AlertTriangle, prefetch: () => import('@/redesign/pages/service/ServiceTicketsPage') },
];

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function ProductionWorkspace({ user, onNavigate, initialTab }: Props) {
  const safeInitial = !initialTab || initialTab === 'time-tracking' || initialTab === 'stations'
    ? 'production' : initialTab;
  const [tab, setTab] = useState(safeInitial);
  const [visited, setVisited] = useState(() => new Set([safeInitial]));

  useEffect(() => {
    if (initialTab && initialTab !== 'time-tracking' && initialTab !== 'stations') {
      setTab(initialTab);
      setVisited(p => { const s = new Set(p); s.add(initialTab); return s; });
    }
  }, [initialTab]);

  const handleTabChange = (t: string) => {
    setVisited(prev => { const s = new Set(prev); s.add(t); return s; });
    setTab(t);
    onNavigate(t);
  };

  return (
    <Page fit layout="row">
      <WorkspaceTabs tabs={TABS} active={tab} onChange={handleTabChange} />
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <div className={tab === 'production' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('production') && <KanbanPage user={user} onNavigate={onNavigate} />}
          </Suspense>
        </div>
        <div className={tab === 'maintenance' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('maintenance') && <MaintenancePage user={user} />}
          </Suspense>
        </div>
        <div className={tab === 'service-tickets' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('service-tickets') && <ServiceTicketsPage user={user} />}
          </Suspense>
        </div>
      </div>
    </Page>
  );
}
