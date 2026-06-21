import { lazy, Suspense, useState, useEffect } from 'react';
import { Target, FileText, Users } from 'lucide-react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';
import WorkspaceSkeleton from '@/redesign/ui/WorkspaceSkeleton';

const SalesHubPage = lazy(() => import('@/redesign/pages/sales/SalesHubPage'));
const QuotationsPage = lazy(() => import('@/redesign/pages/sales/QuotationsPage'));
const ClientsPage = lazy(() => import('@/redesign/pages/clients/ClientsPage'));

const TABS: WorkspaceTab[] = [
  { id: 'sales-hub',  label: 'Pipeline', icon: Target,   prefetch: () => import('@/redesign/pages/sales/SalesHubPage') },
  { id: 'quotations', label: 'Oferte',   icon: FileText,  prefetch: () => import('@/redesign/pages/sales/QuotationsPage') },
  { id: 'clients',    label: 'Clienți',  icon: Users,     prefetch: () => import('@/redesign/pages/clients/ClientsPage') },
];

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function SalesWorkspace({ user, onNavigate, initialTab }: Props) {
  const [tab, setTab] = useState(initialTab || 'sales-hub');
  const [visited, setVisited] = useState(() => new Set([initialTab || 'sales-hub']));

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
        <div className={tab === 'sales-hub' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('sales-hub') && <SalesHubPage user={user} />}
          </Suspense>
        </div>
        <div className={tab === 'quotations' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('quotations') && <QuotationsPage user={user} />}
          </Suspense>
        </div>
        <div className={tab === 'clients' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('clients') && <ClientsPage user={user} />}
          </Suspense>
        </div>
      </div>
    </Page>
  );
}
