import { lazy, Suspense, useState, useEffect } from 'react';
import type { User } from '@/core/types';
import WorkspaceShell from './WorkspaceShell';
import WorkspaceSkeleton from '@/redesign/ui/WorkspaceSkeleton';

const KanbanPage = lazy(() => import('@/redesign/pages/KanbanPage'));
const MaintenancePage = lazy(() => import('@/redesign/pages/maintenance/MaintenancePage'));
const ServiceTicketsPage = lazy(() => import('@/redesign/pages/service/ServiceTicketsPage'));

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

  return (
    <WorkspaceShell>
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
    </WorkspaceShell>
  );
}
