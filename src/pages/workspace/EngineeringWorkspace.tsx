import { lazy, Suspense, useState, useEffect } from 'react';
import { ClipboardList, Network, BookOpen, Loader2, Truck, MessageCircle, FileCog } from 'lucide-react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';



const ProjectBriefingsPage = lazy(() => import('@/redesign/pages/ProjectBriefingsPage'));
const FisaProiectantPage = lazy(() => import('@/redesign/pages/checklist/FisaProiectantPage'));
const FisaTemplatesPage = lazy(() => import('@/redesign/pages/FisaTemplatesPage'));
const PartsTreePage = lazy(() => import('@/redesign/pages/PartsTreePage'));
const PiecesOrderingPage = lazy(() => import('@/redesign/pages/PiecesOrderingPage'));
const LibrariesPage = lazy(() => import('@/redesign/pages/libraries/LibrariesPage'));

const TABS: WorkspaceTab[] = [
  { id: 'briefings', label: 'Briefing', icon: MessageCircle },
  { id: 'fisa-proiectant', label: 'Fișa proiectant', icon: ClipboardList },
  { id: 'fisa-templates', label: 'Template-uri fișe', icon: FileCog },
  { id: 'parts-tree', label: 'Arbore piese', icon: Network },
  { id: 'parts-ordering', label: 'De comandat', icon: Truck },
  { id: 'libraries', label: 'Biblioteci', icon: BookOpen },
];

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function EngineeringWorkspace({ user, onNavigate, initialTab }: Props) {
  
  
  const safeInitial = !initialTab || initialTab === 'engineering' ? 'fisa-proiectant' : initialTab;
  const [tab, setTab] = useState(safeInitial);
  useEffect(() => { if (initialTab && initialTab !== 'engineering') setTab(initialTab); }, [initialTab]);

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
          {user && (
            <>
              {tab === 'briefings' && <ProjectBriefingsPage />}
              {tab === 'fisa-proiectant' && <FisaProiectantPage user={user} />}
              {tab === 'fisa-templates' && <FisaTemplatesPage />}
              {tab === 'parts-tree' && <PartsTreePage user={user} />}
              {tab === 'parts-ordering' && <PiecesOrderingPage />}
              {tab === 'libraries' && <LibrariesPage user={user} />}
            </>
          )}
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
