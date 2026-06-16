import { Suspense, useState, useEffect } from 'react';
import { CheckSquare, Calendar, MapPin, Loader2 } from 'lucide-react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';
import { lazyWithRetry } from '@/utils/lazyWithRetry';



const PersonalTasksPage = lazyWithRetry(() => import('@/redesign/pages/tasks/PersonalTasksPage'));
const CalendarPage = lazyWithRetry(() => import('@/redesign/pages/calendar/CalendarPage'));
const DeplasariPage = lazyWithRetry(() => import('@/redesign/pages/deplasari/DeplasariPage'));

const TABS: WorkspaceTab[] = [
  { id: 'tasks',     label: 'Task-uri',  icon: CheckSquare },
  { id: 'calendar',  label: 'Calendar',  icon: Calendar },
  { id: 'deplasari', label: 'Deplasări', icon: MapPin },
];

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function PersonalWorkspace({ user, onNavigate, initialTab }: Props) {
  const [tab, setTab] = useState(initialTab || 'tasks');
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
          {tab === 'tasks'     && <PersonalTasksPage user={user} />}
          {tab === 'calendar'  && <CalendarPage user={user} />}
          {tab === 'deplasari' && <DeplasariPage user={user} />}
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
