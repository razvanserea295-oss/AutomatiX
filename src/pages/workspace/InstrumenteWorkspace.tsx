import { lazy, Suspense, useState, useEffect } from 'react';
import { GraduationCap, Mail, MessageCircle, Bell, Archive, LayoutDashboard, MonitorDown, Folder } from 'lucide-react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';
import WorkspaceSkeleton from '@/redesign/ui/WorkspaceSkeleton';

const TutorialPage = lazy(() => import('@/redesign/pages/tutorial/TutorialPage'));
const EmailPage = lazy(() => import('@/redesign/pages/email/EmailPage'));
const ChatPage = lazy(() => import('@/redesign/pages/chat/ChatPage'));
const AlertsPage = lazy(() => import('@/redesign/pages/alerts/AlertsPage'));
const SourceArchivePanel = lazy(() => import('@/redesign/pages/backup/SourceArchivePanel'));
const ManagerControlPage = lazy(() => import('@/pages/ManagerControlPage'));
const DownloadAppPage = lazy(() => import('@/redesign/pages/tools/DownloadAppPage'));

const BASE_TABS: WorkspaceTab[] = [
  { id: 'birou-control', label: 'Birou de control', icon: LayoutDashboard, prefetch: () => import('@/pages/ManagerControlPage') },
  { id: 'tutorial',      label: 'Tutorial',          icon: GraduationCap,  prefetch: () => import('@/redesign/pages/tutorial/TutorialPage') },
  { id: 'email',         label: 'Email',             icon: Mail,           prefetch: () => import('@/redesign/pages/email/EmailPage') },
  { id: 'chat',          label: 'Mesaje',            icon: MessageCircle,  prefetch: () => import('@/redesign/pages/chat/ChatPage') },
  { id: 'alerts',        label: 'Alerte',            icon: Bell,           prefetch: () => import('@/redesign/pages/alerts/AlertsPage') },
  { id: 'download-app',  label: 'Aplicație desktop', icon: MonitorDown,    prefetch: () => import('@/redesign/pages/tools/DownloadAppPage') },
  { id: 'shared-files',  label: 'Shared Files',      icon: Folder,         prefetch: () => import('@/pages/shared-storage/SharedStoragePage') },
];
// Source-archive download is admin-only.
const ARHIVA_TAB: WorkspaceTab = { id: 'arhiva', label: 'Arhivă', icon: Archive };

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function InstrumenteWorkspace({ user, onNavigate, initialTab }: Props) {
  const [tab, setTab] = useState(initialTab || 'birou-control');
  const [visited, setVisited] = useState(() => new Set([initialTab || 'birou-control']));

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
      setVisited(p => { const s = new Set(p); s.add(initialTab); return s; });
    }
  }, [initialTab]);

  const isAdmin = (user?.role_name || '').toLowerCase() === 'admin';
  const tabs = isAdmin ? [...BASE_TABS, ARHIVA_TAB] : BASE_TABS;

  const handleTabChange = (t: string) => {
    setVisited(prev => { const s = new Set(prev); s.add(t); return s; });
    setTab(t);
    onNavigate(t);
  };

  return (
    <Page fit layout="row">
      <WorkspaceTabs tabs={tabs} active={tab} onChange={handleTabChange} />
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <div className={tab === 'birou-control' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('birou-control') && user && <ManagerControlPage user={user} />}
          </Suspense>
        </div>
        <div className={tab === 'tutorial' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('tutorial') && user && <TutorialPage user={user} onNavigate={onNavigate} />}
          </Suspense>
        </div>
        <div className={tab === 'email' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('email') && <EmailPage user={user} />}
          </Suspense>
        </div>
        <div className={tab === 'chat' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('chat') && <ChatPage user={user} />}
          </Suspense>
        </div>
        <div className={tab === 'alerts' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('alerts') && <AlertsPage user={user} />}
          </Suspense>
        </div>
        <div className={tab === 'download-app' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('download-app') && <DownloadAppPage />}
          </Suspense>
        </div>
        {isAdmin && (
          <div className={tab === 'arhiva' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
            <Suspense fallback={<WorkspaceSkeleton />}>
              {visited.has('arhiva') && <SourceArchivePanel user={user} />}
            </Suspense>
          </div>
        )}
        <div className={tab === 'shared-files' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('shared-files') && <SharedStoragePage />}
          </Suspense>
        </div>
      </div>
    </Page>
  );
}

import SharedStoragePage from '@/pages/shared-storage/SharedStoragePage';
