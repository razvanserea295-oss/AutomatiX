import { lazy, Suspense, useState, useEffect } from 'react';
import { FolderKanban, ScrollText } from 'lucide-react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';
import WorkspaceSkeleton from '@/redesign/ui/WorkspaceSkeleton';

const ProjectsPage = lazy(() => import('@/redesign/pages/ProjectsPage'));
const ContractPage = lazy(() => import('@/redesign/pages/contract/ContractPage'));

const TABS: WorkspaceTab[] = [
  { id: 'projects',  label: 'Proiecte',  icon: FolderKanban, prefetch: () => import('@/redesign/pages/ProjectsPage') },
  { id: 'contracts', label: 'Contracte', icon: ScrollText,   prefetch: () => import('@/redesign/pages/contract/ContractPage') },
];

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function ProjectsContractsWorkspace({ user, onNavigate, initialTab }: Props) {
  const [tab, setTab] = useState(initialTab || 'projects');
  const [visited, setVisited] = useState(() => new Set([initialTab || 'projects']));

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
        <div className={tab === 'projects' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('projects') && <ProjectsPage user={user} onNavigate={onNavigate} />}
          </Suspense>
        </div>
        <div className={tab === 'contracts' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('contracts') && <ContractPage user={user} />}
          </Suspense>
        </div>
      </div>
    </Page>
  );
}
