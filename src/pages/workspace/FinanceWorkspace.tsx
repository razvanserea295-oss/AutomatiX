import { lazy, Suspense, useState, useEffect } from 'react';
import { DollarSign, FileText, BarChart3, Loader2 } from 'lucide-react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';

const FinancePage = lazy(() => import('@/redesign/pages/FinancePage'));
const DocumentsPage = lazy(() => import('@/redesign/pages/documents/DocumentsPage'));
const ReportsPage = lazy(() => import('@/redesign/pages/reports/ReportsPage'));

const TABS: WorkspaceTab[] = [
  { id: 'finance', label: 'Financiar', icon: DollarSign },
  { id: 'documents', label: 'Documente', icon: FileText },
  { id: 'reports', label: 'Rapoarte', icon: BarChart3 },
];

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function FinanceWorkspace({ user, onNavigate, initialTab }: Props) {
  const [tab, setTab] = useState(initialTab || 'finance');
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
          {tab === 'finance' && <FinancePage user={user} />}
          {tab === 'documents' && <DocumentsPage user={user} />}
          {tab === 'reports' && <ReportsPage user={user} />}
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
