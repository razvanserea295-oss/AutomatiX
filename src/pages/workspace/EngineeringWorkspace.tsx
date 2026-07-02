import { lazy, Suspense, useState, useEffect } from 'react';
import type { User } from '@/core/types';
import WorkspaceShell from './WorkspaceShell';
import WorkspaceSkeleton from '@/redesign/ui/WorkspaceSkeleton';

const ProjectBriefingsPage = lazy(() => import('@/redesign/pages/ProjectBriefingsPage'));
const FisaProiectantPage = lazy(() => import('@/redesign/pages/checklist/FisaProiectantPage'));
const FisaTemplatesPage = lazy(() => import('@/redesign/pages/FisaTemplatesPage'));
const PartsTreePage = lazy(() => import('@/redesign/pages/PartsTreePage'));
const PiecesOrderingPage = lazy(() => import('@/redesign/pages/PiecesOrderingPage'));
const LibrariesPage = lazy(() => import('@/redesign/pages/libraries/LibrariesPage'));

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function EngineeringWorkspace({ user, onNavigate: _onNavigate, initialTab }: Props) {
  const safeInitial = !initialTab || initialTab === 'engineering' ? 'fisa-proiectant' : initialTab;
  const [tab, setTab] = useState(safeInitial);
  const [visited, setVisited] = useState(() => new Set([safeInitial]));

  useEffect(() => {
    if (initialTab && initialTab !== 'engineering') {
      setTab(initialTab);
      setVisited(p => { const s = new Set(p); s.add(initialTab); return s; });
    }
  }, [initialTab]);

  return (
    <WorkspaceShell>
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <div className={tab === 'briefings' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('briefings') && <ProjectBriefingsPage />}
          </Suspense>
        </div>
        <div className={tab === 'fisa-proiectant' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('fisa-proiectant') && user && <FisaProiectantPage user={user} />}
          </Suspense>
        </div>
        <div className={tab === 'fisa-templates' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('fisa-templates') && <FisaTemplatesPage />}
          </Suspense>
        </div>
        <div className={tab === 'parts-tree' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('parts-tree') && user && <PartsTreePage user={user} />}
          </Suspense>
        </div>
        <div className={tab === 'parts-ordering' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('parts-ordering') && <PiecesOrderingPage />}
          </Suspense>
        </div>
        <div className={tab === 'libraries' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('libraries') && user && <LibrariesPage user={user} />}
          </Suspense>
        </div>
      </div>
    </WorkspaceShell>
  );
}
