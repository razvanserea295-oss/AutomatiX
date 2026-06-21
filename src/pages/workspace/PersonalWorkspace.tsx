import { Suspense, useState, useEffect } from 'react';
import { CheckSquare, Calendar, MapPin } from 'lucide-react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';
import WorkspaceSkeleton from '@/redesign/ui/WorkspaceSkeleton';
import { lazyWithRetry } from '@/utils/lazyWithRetry';

const PersonalTasksPage = lazyWithRetry(() => import('@/redesign/pages/tasks/PersonalTasksPage'));
const CalendarPage = lazyWithRetry(() => import('@/redesign/pages/calendar/CalendarPage'));
const DeplasariPage = lazyWithRetry(() => import('@/redesign/pages/deplasari/DeplasariPage'));

const TABS: WorkspaceTab[] = [
  { id: 'tasks',     label: 'Task-uri',  icon: CheckSquare, prefetch: () => import('@/redesign/pages/tasks/PersonalTasksPage') },
  { id: 'calendar',  label: 'Calendar',  icon: Calendar,    prefetch: () => import('@/redesign/pages/calendar/CalendarPage') },
  { id: 'deplasari', label: 'Deplasări', icon: MapPin,      prefetch: () => import('@/redesign/pages/deplasari/DeplasariPage') },
];

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function PersonalWorkspace({ user, onNavigate, initialTab }: Props) {
  const [tab, setTab] = useState(initialTab || 'tasks');
  const [visited, setVisited] = useState(() => new Set([initialTab || 'tasks']));

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
        <div className={tab === 'tasks' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('tasks') && <PersonalTasksPage user={user} />}
          </Suspense>
        </div>
        <div className={tab === 'calendar' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('calendar') && <CalendarPage user={user} />}
          </Suspense>
        </div>
        <div className={tab === 'deplasari' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('deplasari') && <DeplasariPage user={user} />}
          </Suspense>
        </div>
      </div>
    </Page>
  );
}
