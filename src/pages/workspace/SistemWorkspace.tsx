import { lazy, Suspense, useState, useEffect } from 'react';
import { Users, Settings, Activity, Loader2 } from 'lucide-react';
import type { User } from '@/core/types';
import type { Theme } from '@/config/constants';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';



const UsersPage = lazy(() => import('@/redesign/pages/auth/UsersPage'));
const SettingsPage = lazy(() => import('@/redesign/pages/settings/SettingsPage'));
const UserSessionsPage = lazy(() => import('@/redesign/pages/auth/UserSessionsPage'));

const TABS_ADMIN: WorkspaceTab[] = [
  { id: 'users',    label: 'Utilizatori', icon: Users },
  { id: 'sessions', label: 'Sesiuni',     icon: Activity },
  { id: 'settings', label: 'Setări',      icon: Settings },
];




const TABS_DEFAULT: WorkspaceTab[] = [
  { id: 'settings', label: 'Setări',      icon: Settings },
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
  useEffect(() => {
    if (!isAdmin) { setTab('settings'); return; }
    if (initialTab && initialTab !== 'operatii-config') setTab(initialTab);
  }, [initialTab, isAdmin]);

  const handleTabChange = (t: string) => {
    if (!isAdmin && t !== 'settings') return; 
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
          {tab === 'users'    && isAdmin && <UsersPage user={user} />}
          {tab === 'sessions' && isAdmin && <UserSessionsPage user={user} />}
          {tab === 'settings' && <SettingsPage user={user} currentTheme={currentTheme} onThemeChange={onThemeChange} />}
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
