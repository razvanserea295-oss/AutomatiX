import { lazy, Suspense, useState, useEffect } from 'react';
import { DollarSign, FileText, BarChart3 } from 'lucide-react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';
import WorkspaceSkeleton from '@/redesign/ui/WorkspaceSkeleton';

const FinancePage = lazy(() => import('@/redesign/pages/FinancePage'));
const DocumentsPage = lazy(() => import('@/redesign/pages/documents/DocumentsPage'));
const ReportsPage = lazy(() => import('@/redesign/pages/reports/ReportsPage'));

const TABS: WorkspaceTab[] = [
  { id: 'finance',   label: 'Financiar', icon: DollarSign, prefetch: () => import('@/redesign/pages/FinancePage') },
  { id: 'documents', label: 'Documente', icon: FileText,   prefetch: () => import('@/redesign/pages/documents/DocumentsPage') },
  { id: 'reports',   label: 'Rapoarte',  icon: BarChart3,  prefetch: () => import('@/redesign/pages/reports/ReportsPage') },
];

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function FinanceWorkspace({ user, onNavigate, initialTab }: Props) {
  const [tab, setTab] = useState(initialTab || 'finance');
  const [visited, setVisited] = useState(() => new Set([initialTab || 'finance']));

  useEffect(() => {
    if (initialTab) {
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
    </Page>
  );
}
