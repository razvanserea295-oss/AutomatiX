import { lazy, Suspense, useState, useEffect } from 'react';
import { Target, FileText, Users, Loader2 } from 'lucide-react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';

const SalesHubPage = lazy(() => import('@/redesign/pages/sales/SalesHubPage'));
const QuotationsPage = lazy(() => import('@/redesign/pages/sales/QuotationsPage'));
const ClientsPage = lazy(() => import('@/redesign/pages/clients/ClientsPage'));

const TABS: WorkspaceTab[] = [
  { id: 'sales-hub', label: 'Pipeline', icon: Target },
  { id: 'quotations', label: 'Oferte', icon: FileText },
  { id: 'clients', label: 'Clienți', icon: Users },
];

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function SalesWorkspace({ user, onNavigate, initialTab }: Props) {
  const [tab, setTab] = useState(initialTab || 'sales-hub');
  useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);

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
          {tab === 'sales-hub' && <SalesHubPage user={user} />}
          {tab === 'quotations' && <QuotationsPage user={user} />}
          {tab === 'clients' && <ClientsPage user={user} />}
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
