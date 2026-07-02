import { lazy, Suspense, useState, useEffect } from 'react';
import type { User } from '@/core/types';
import WorkspaceShell from './WorkspaceShell';
import WorkspaceSkeleton from '@/redesign/ui/WorkspaceSkeleton';

const ProjectsPage = lazy(() => import('@/redesign/pages/ProjectsPage'));
const ContractPage = lazy(() => import('@/redesign/pages/contract/ContractPage'));

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

  return (
    <WorkspaceShell>
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
    </WorkspaceShell>
  );
}
