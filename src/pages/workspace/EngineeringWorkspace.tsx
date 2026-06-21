import { lazy, Suspense, useState, useEffect } from 'react';
import { ClipboardList, Network, BookOpen, Truck, MessageCircle, FileCog } from 'lucide-react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';
import WorkspaceSkeleton from '@/redesign/ui/WorkspaceSkeleton';

const ProjectBriefingsPage = lazy(() => import('@/redesign/pages/ProjectBriefingsPage'));
const FisaProiectantPage = lazy(() => import('@/redesign/pages/checklist/FisaProiectantPage'));
const FisaTemplatesPage = lazy(() => import('@/redesign/pages/FisaTemplatesPage'));
const PartsTreePage = lazy(() => import('@/redesign/pages/PartsTreePage'));
const PiecesOrderingPage = lazy(() => import('@/redesign/pages/PiecesOrderingPage'));
const LibrariesPage = lazy(() => import('@/redesign/pages/libraries/LibrariesPage'));

const TABS: WorkspaceTab[] = [
  { id: 'briefings',       label: 'Briefing',           icon: MessageCircle, prefetch: () => import('@/redesign/pages/ProjectBriefingsPage') },
  { id: 'fisa-proiectant', label: 'Fișa proiectant',    icon: ClipboardList, prefetch: () => import('@/redesign/pages/checklist/FisaProiectantPage') },
  { id: 'fisa-templates',  label: 'Template-uri fișe',  icon: FileCog,       prefetch: () => import('@/redesign/pages/FisaTemplatesPage') },
  { id: 'parts-tree',      label: 'Arbore piese',       icon: Network,       prefetch: () => import('@/redesign/pages/PartsTreePage') },
  { id: 'parts-ordering',  label: 'De comandat',        icon: Truck,         prefetch: () => import('@/redesign/pages/PiecesOrderingPage') },
  { id: 'libraries',       label: 'Biblioteci',         icon: BookOpen,      prefetch: () => import('@/redesign/pages/libraries/LibrariesPage') },
];

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function EngineeringWorkspace({ user, onNavigate, initialTab }: Props) {
  const safeInitial = !initialTab || initialTab === 'engineering' ? 'fisa-proiectant' : initialTab;
  const [tab, setTab] = useState(safeInitial);
  const [visited, setVisited] = useState(() => new Set([safeInitial]));

  useEffect(() => {
    if (initialTab && initialTab !== 'engineering') {
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
    </Page>
  );
}
