import { lazy, Suspense, useState, useEffect } from 'react';
import type { User } from '@/core/types';
import WorkspaceShell from './WorkspaceShell';
import WorkspaceSkeleton from '@/redesign/ui/WorkspaceSkeleton';

const FinancePage = lazy(() => import('@/redesign/pages/FinancePage'));
const DocumentsPage = lazy(() => import('@/redesign/pages/documents/DocumentsPage'));
const ReportsPage = lazy(() => import('@/redesign/pages/reports/ReportsPage'));

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function FinanceWorkspace({ user, onNavigate: _onNavigate, initialTab }: Props) {
  const [tab, setTab] = useState(initialTab || 'finance');
  const [visited, setVisited] = useState(() => new Set([initialTab || 'finance']));

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
      setVisited(p => { const s = new Set(p); s.add(initialTab); return s; });
    }
  }, [initialTab]);

  return (
    <WorkspaceShell>
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <div className={tab === 'finance' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('finance') && <FinancePage user={user} />}
          </Suspense>
        </div>
        <div className={tab === 'documents' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('documents') && <DocumentsPage user={user} />}
          </Suspense>
        </div>
        <div className={tab === 'reports' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('reports') && <ReportsPage user={user} />}
          </Suspense>
        </div>
      </div>
    </WorkspaceShell>
  );
}
