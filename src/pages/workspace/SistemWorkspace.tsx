import { lazy, Suspense, useState, useEffect } from 'react';
import { Users, Settings, Activity } from 'lucide-react';
import type { User } from '@/core/types';
import type { Theme } from '@/config/constants';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';
import WorkspaceSkeleton from '@/redesign/ui/WorkspaceSkeleton';

const UsersPage = lazy(() => import('@/redesign/pages/auth/UsersPage'));
const SettingsPage = lazy(() => import('@/redesign/pages/settings/SettingsPage'));
const UserSessionsPage = lazy(() => import('@/redesign/pages/auth/UserSessionsPage'));

const TABS_ADMIN: WorkspaceTab[] = [
  { id: 'users',    label: 'Utilizatori', icon: Users,    prefetch: () => import('@/redesign/pages/auth/UsersPage') },
  { id: 'sessions', label: 'Sesiuni',     icon: Activity, prefetch: () => import('@/redesign/pages/auth/UserSessionsPage') },
  { id: 'settings', label: 'Setări',      icon: Settings, prefetch: () => import('@/redesign/pages/settings/SettingsPage') },
];

const TABS_DEFAULT: WorkspaceTab[] = [
  { id: 'settings', label: 'Setări', icon: Settings, prefetch: () => import('@/redesign/pages/settings/SettingsPage') },
];

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
  currentTheme: Theme;
  onThemeChange: (t: Theme) => void;
}

export default function SistemWorkspace({ user, onNavigate, initialTab, currentTheme, onThemeChange }: Props) {
  const role = (user?.role_name || '').toLowerCase();
  const isAdmin = role === 'admin';
  const TABS = isAdmin ? TABS_ADMIN : TABS_DEFAULT;

  const safeInitial = !isAdmin
    ? 'settings'
    : (!initialTab || initialTab === 'operatii-config' ? 'users' : initialTab);
  const [tab, setTab] = useState(safeInitial);
  const [visited, setVisited] = useState(() => new Set([safeInitial]));

  useEffect(() => {
    if (!isAdmin) { setTab('settings'); return; }
    if (initialTab && initialTab !== 'operatii-config') {
      setTab(initialTab);
      setVisited(p => { const s = new Set(p); s.add(initialTab); return s; });
    }
  }, [initialTab, isAdmin]);

  const handleTabChange = (t: string) => {
    if (!isAdmin && t !== 'settings') return;
    setVisited(prev => { const s = new Set(prev); s.add(t); return s; });
    setTab(t);
    onNavigate(t);
  };

  return (
    <Page fit layout="row">
      <WorkspaceTabs tabs={TABS} active={tab} onChange={handleTabChange} />
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        {isAdmin && (
          <>
            <div className={tab === 'users' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
              <Suspense fallback={<WorkspaceSkeleton />}>
                {visited.has('users') && <UsersPage user={user} />}
              </Suspense>
            </div>
            <div className={tab === 'sessions' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
              <Suspense fallback={<WorkspaceSkeleton />}>
                {visited.has('sessions') && <UserSessionsPage user={user} />}
              </Suspense>
            </div>
          </>
        )}
        <div className={tab === 'settings' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('settings') && <SettingsPage user={user} currentTheme={currentTheme} onThemeChange={onThemeChange} />}
          </Suspense>
        </div>
      </div>
    </Page>
  );
}
