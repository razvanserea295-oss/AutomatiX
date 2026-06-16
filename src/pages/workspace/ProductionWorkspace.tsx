import { lazy, Suspense, useState, useEffect } from 'react';
import { Factory, Wrench, AlertTriangle, Loader2 } from 'lucide-react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';



const KanbanPage = lazy(() => import('@/redesign/pages/KanbanPage'));
const MaintenancePage = lazy(() => import('@/redesign/pages/maintenance/MaintenancePage'));
const ServiceTicketsPage = lazy(() => import('@/redesign/pages/service/ServiceTicketsPage'));

const TABS: WorkspaceTab[] = [
  { id: 'production', label: 'Producție', icon: Factory },
  { id: 'maintenance', label: 'Service', icon: Wrench },
  { id: 'service-tickets', label: 'Tichete', icon: AlertTriangle },
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
  useEffect(() => {
    if (initialTab && initialTab !== 'time-tracking' && initialTab !== 'stations') setTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (t: string) => {
    setTab(t);
    onNavigate(t);
  };

  return (
    <Page fit>
      <WorkspaceTabs
        tabs={TABS}
        active={tab}
        onChange={handleTabChange}
      />
      <Suspense fallback={<Loading />}>
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          {tab === 'production' && <KanbanPage user={user} onNavigate={onNavigate} />}
          {tab === 'maintenance' && <MaintenancePage user={user} />}
          {tab === 'service-tickets' && <ServiceTicketsPage user={user} />}
        </div>
      </Suspense>
    </Page>
  );
}

function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
    </div>
  );
}
