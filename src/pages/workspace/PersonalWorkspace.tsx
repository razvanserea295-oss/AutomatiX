import { Suspense, useState, useEffect } from 'react';
import type { User } from '@/core/types';
import WorkspaceShell from './WorkspaceShell';
import WorkspaceSkeleton from '@/redesign/ui/WorkspaceSkeleton';
import { lazyWithRetry } from '@/utils/lazyWithRetry';

const PersonalTasksPage = lazyWithRetry(() => import('@/redesign/pages/tasks/PersonalTasksPage'));
const CalendarPage = lazyWithRetry(() => import('@/redesign/pages/calendar/CalendarPage'));
const DeplasariPage = lazyWithRetry(() => import('@/redesign/pages/deplasari/DeplasariPage'));

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function PersonalWorkspace({ user, onNavigate: _onNavigate, initialTab }: Props) {
  const [tab, setTab] = useState(initialTab || 'tasks');
  const [visited, setVisited] = useState(() => new Set([initialTab || 'tasks']));

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
      setVisited(p => { const s = new Set(p); s.add(initialTab); return s; });
    }
  }, [initialTab]);

  return (
    <WorkspaceShell>
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
    </WorkspaceShell>
  );
}
