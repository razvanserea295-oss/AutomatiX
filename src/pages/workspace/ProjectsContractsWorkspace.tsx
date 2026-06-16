import { lazy, Suspense, useState, useEffect } from 'react';
import { FolderKanban, ScrollText, Loader2 } from 'lucide-react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';

const ProjectsPage = lazy(() => import('@/redesign/pages/ProjectsPage'));
const ContractPage = lazy(() => import('@/redesign/pages/contract/ContractPage'));

const TABS: WorkspaceTab[] = [
  { id: 'projects',  label: 'Proiecte',  icon: FolderKanban },
  { id: 'contracts', label: 'Contracte', icon: ScrollText },
];

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function ProjectsContractsWorkspace({ user, onNavigate, initialTab }: Props) {
  const [tab, setTab] = useState(initialTab || 'projects');
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
          {tab === 'projects' && <ProjectsPage user={user} onNavigate={onNavigate} />}
          {tab === 'contracts' && <ContractPage user={user} />}
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
