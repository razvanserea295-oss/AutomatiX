import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import type { User } from '@/core/types';
import WorkspaceSkeleton from '@/redesign/ui/WorkspaceSkeleton';
import { apiCommand } from '@/api/commands';
import { canAccessPage } from '@/lib/access';
import SharedStoragePage from '@/pages/shared-storage/SharedStoragePage';
import WorkspaceShell from './WorkspaceShell';

const TutorialPage = lazy(() => import('@/redesign/pages/tutorial/TutorialPage'));
const SourceArchivePanel = lazy(() => import('@/redesign/pages/backup/SourceArchivePanel'));
const ManagerControlPage = lazy(() => import('@/redesign/pages/ManagerControlPage'));
const DownloadAppPage = lazy(() => import('@/redesign/pages/tools/DownloadAppPage'));
const PrintPage = lazy(() => import('@/redesign/pages/tools/PrintPage'));
const RemoteSupportPage = lazy(() => import('@/redesign/pages/remote/RemoteSupportPage'));
const LicensesPage = lazy(() => import('@/redesign/pages/admin/LicensesPage'));

const BASE_TAB_IDS = [
  'birou-control',
  'tutorial',
  'download-app',
  'print',
  'remote-support',
  'shared-files',
] as const;

type InstrumenteTabId = (typeof BASE_TAB_IDS)[number] | 'licente' | 'arhiva';

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function InstrumenteWorkspace({ user, onNavigate, initialTab }: Props) {
  const [tab, setTab] = useState<InstrumenteTabId>((initialTab as InstrumenteTabId) || 'birou-control');
  const [visited, setVisited] = useState(() => new Set<InstrumenteTabId>([(initialTab as InstrumenteTabId) || 'birou-control']));
  const [canIssue, setCanIssue] = useState(false);

  useEffect(() => {
    let alive = true;
    apiCommand<{ can_issue: boolean }>('get_license_issuer_state')
      .then((s) => { if (alive) setCanIssue(!!s.can_issue); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab as InstrumenteTabId);
      setVisited((p) => { const s = new Set(p); s.add(initialTab as InstrumenteTabId); return s; });
    }
  }, [initialTab]);

  const isAdmin = (user?.role_name || '').toLowerCase() === 'admin';
  const canRemote = canAccessPage(user?.role_name, 'remote-support', user?.custom_pages);

  const validTabIds = useMemo((): InstrumenteTabId[] => {
    let ids: InstrumenteTabId[] = BASE_TAB_IDS.filter((id) => id !== 'remote-support' || canRemote);
    if (isAdmin || canIssue) ids = [...ids, 'licente'];
    if (isAdmin) ids = [...ids, 'arhiva'];
    return ids;
  }, [canRemote, isAdmin, canIssue]);

  useEffect(() => {
    if (!validTabIds.includes(tab)) {
      const fallback = validTabIds[0] ?? 'birou-control';
      setTab(fallback);
      setVisited((p) => { const s = new Set(p); s.add(fallback); return s; });
    }
  }, [validTabIds, tab]);

  const panelCls = (id: string) => (
    tab === id ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'
  );

  return (
    <WorkspaceShell>
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <div className={panelCls('birou-control')}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('birou-control') && user && <ManagerControlPage user={user} />}
          </Suspense>
        </div>
        <div className={panelCls('tutorial')}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('tutorial') && user && <TutorialPage user={user} onNavigate={onNavigate} />}
          </Suspense>
        </div>
        <div className={panelCls('download-app')}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('download-app') && <DownloadAppPage />}
          </Suspense>
        </div>
        <div className={panelCls('print')}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('print') && user && <PrintPage user={user} />}
          </Suspense>
        </div>
        {canRemote && (
          <div className={panelCls('remote-support')}>
            <Suspense fallback={<WorkspaceSkeleton />}>
              {visited.has('remote-support') && user && <RemoteSupportPage user={user} />}
            </Suspense>
          </div>
        )}
        <div className={panelCls('shared-files')}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('shared-files') && <SharedStoragePage />}
          </Suspense>
        </div>
        {(isAdmin || canIssue) && (
          <div className={panelCls('licente')}>
            <Suspense fallback={<WorkspaceSkeleton />}>
              {visited.has('licente') && <LicensesPage />}
            </Suspense>
          </div>
        )}
        {isAdmin && (
          <div className={panelCls('arhiva')}>
            <Suspense fallback={<WorkspaceSkeleton />}>
              {visited.has('arhiva') && <SourceArchivePanel user={user} />}
            </Suspense>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
