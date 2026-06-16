
















import { Suspense, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import {
  Home, Activity, Target, CheckSquare, Factory, Menu, RefreshCw, ChevronLeft, Loader2, FileQuestion, type LucideIcon,
} from 'lucide-react';
import type { User } from '@/core/types';
import { canAccessPage, normalizeRole } from '@/lib/access';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initials, EmptyState } from './kit';
import HomeTab from './HomeTab';
import ActivityTab from './ActivityTab';
import SalesTab from './SalesTab';
import TasksTab from './TasksTab';
import ProductionTab from './ProductionTab';
import MoreTab from './MoreTab';
import { MOBILE_PAGES } from './mobilePages';

export type ScreenId = 'home' | 'activity' | 'sales' | 'tasks' | 'production' | 'more';

interface ScreenDef {
  id: ScreenId;
  label: string;
  icon: LucideIcon;
}

const SCREENS: Record<ScreenId, ScreenDef> = {
  home:       { id: 'home',       label: 'Acasă',     icon: Home },
  activity:   { id: 'activity',   label: 'Activitate',icon: Activity },
  sales:      { id: 'sales',      label: 'Vânzări',   icon: Target },
  tasks:      { id: 'tasks',      label: 'Task-uri',  icon: CheckSquare },
  production: { id: 'production', label: 'Producție', icon: Factory },
  more:       { id: 'more',       label: 'Mai mult',  icon: Menu },
};

export default function MobileApp({ user, theme, onThemeChange, onLogout }: {
  user: User;
  theme: 'light' | 'dark';
  onThemeChange: (t: 'light' | 'dark') => void;
  onLogout: () => void;
}) {
  const role = normalizeRole(user.role_name);
  const isAdminManager = role === 'admin' || role === 'manager';

  
  
  
  const tabIds = useMemo<ScreenId[]>(() => {
    const base: ScreenId[] = isAdminManager
      ? ['home', 'activity', 'sales', 'tasks', 'more']
      : ['home', 'sales', 'tasks', 'production', 'more'];
    return base.filter(id => {
      if (id === 'sales') return canAccessPage(user.role_name, 'sales-hub', user.custom_pages);
      if (id === 'tasks') return canAccessPage(user.role_name, 'tasks', user.custom_pages);
      if (id === 'production') return canAccessPage(user.role_name, 'production', user.custom_pages);
      if (id === 'activity') return isAdminManager; 
      return true; 
    });
  }, [user.role_name, user.custom_pages, isAdminManager]);

  const [tab, setTab] = useState<ScreenId>('home');
  const [pushed, setPushed] = useState<ScreenId | null>(null);
  
  
  const [pushedPage, setPushedPage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const current = pushed ?? tab;
  const pushedPageDef = pushedPage ? MOBILE_PAGES[pushedPage] ?? null : null;

  
  useEffect(() => { if (!tabIds.includes(tab)) setTab('home'); }, [tabIds, tab]);
  
  useEffect(() => { if (mainRef.current) mainRef.current.scrollTop = 0; }, [current, pushedPage]);

  const refresh = () => {
    setRefreshKey(k => k + 1);
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 700);
  };

  const goTab = (id: ScreenId) => { setPushed(null); setPushedPage(null); setTab(id); };
  const openScreen = (id: ScreenId) => { setPushedPage(null); setPushed(id); };
  const openPage = (id: string) => { setPushedPage(id); };

  const screen = SCREENS[current];
  const headerTitle = pushedPageDef
    ? pushedPageDef.label
    : (pushedPage ? 'Indisponibil' : screen.label);

  const TAB_COMPONENT: Record<Exclude<ScreenId, 'more'>, ComponentType<{ user: User; refreshKey: number }>> = {
    home: HomeTab,
    activity: ActivityTab,
    sales: SalesTab,
    tasks: TasksTab,
    production: ProductionTab,
  };

  let body: ReactNode;
  if (pushedPage && !pushedPageDef) {
    // A page asked to navigate somewhere the mobile registry can't render
    // (e.g. station-detail / parts-tree with an entity id, or any id missing
    // from MOBILE_PAGES). Without this guard the shell rendered a blank screen
    // behind a back arrow — surface a clear dead-end instead.
    body = (
      <div className="px-3.5 pt-8">
        <EmptyState
          icon={FileQuestion}
          title="Indisponibil pe telefon"
          hint="Această secțiune se deschide doar în versiunea desktop. Apasă înapoi pentru a reveni."
        />
      </div>
    );
  } else if (pushedPageDef) {

    body = (
      <Suspense fallback={<div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-content-muted" /></div>}>
        {pushedPageDef.render({ user, onNavigate: openPage, theme, onThemeChange })}
      </Suspense>
    );
  } else if (current === 'more') {
    body = (
      <MoreTab
        user={user}
        theme={theme}
        onThemeChange={onThemeChange}
        onLogout={onLogout}
        isAdminManager={isAdminManager}
        onOpenScreen={openScreen}
        onOpenPage={openPage}
      />
    );
  } else {
    const C = TAB_COMPONENT[current];
    body = <C user={user} refreshKey={refreshKey} />;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-surface-page text-content-primary font-sans">
      {}
      <header className="shrink-0 z-20 border-b border-line bg-surface-primary shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2.5 h-14 px-3">
          {(pushed || pushedPage) ? (
            <button
              type="button" onClick={() => { if (pushedPage) setPushedPage(null); else setPushed(null); }}
              className="grid place-items-center h-10 w-10 -ml-1 rounded-full text-content-secondary active:bg-surface-tertiary"
              aria-label="Înapoi"
            ><ChevronLeft className="h-6 w-6" /></button>
          ) : (
            <div className="w-1.5" />
          )}
          <div className="min-w-0">
            {!pushed && !pushedPage && <div className="text-pm-eyebrow uppercase text-content-muted leading-none">automatiX</div>}
            <div className="text-pm-lg font-semibold text-content-primary leading-tight truncate">{headerTitle}</div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button" onClick={refresh}
              className="grid place-items-center h-10 w-10 rounded-full text-content-secondary active:bg-surface-tertiary transition-colors"
              aria-label="Reîmprospătează"
            >
              <RefreshCw className={`h-5 w-5 ${spinning ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button" onClick={() => goTab('more')}
              className="grid place-items-center h-9 w-9 rounded-full bg-accent text-surface-primary text-pm-sm font-bold active:opacity-90 shadow-sm"
              aria-label="Profil și meniu"
            >
              {initials(user.full_name || user.username)}
            </button>
          </div>
        </div>
      </header>

      {}
      <main ref={mainRef} className="flex-1 overflow-y-auto overscroll-contain">
        {/* Per-screen error containment: a crashing page (e.g. a runtime
            ReferenceError in a pushed desktop page) is caught here instead of
            blanking the whole phone app. Keyed by the active screen so the
            boundary auto-resets when the user navigates elsewhere — the header
            + bottom bar stay outside it and remain tappable. */}
        <ErrorBoundary key={pushedPage ?? current} scope={`mobile:${pushedPage ?? current}`}>
          {body}
        </ErrorBoundary>
        <div className="h-3" />
      </main>

      {}
      <nav className="shrink-0 z-20 border-t border-line bg-surface-primary shadow-[0_-1px_3px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch px-1">
          {tabIds.map(id => {
            const def = SCREENS[id];
            const isActive = !pushed && id === tab;
            const Icon = def.icon;
            return (
              <button
                key={id}
                type="button"
                onClick={() => goTab(id)}
                className="flex-1 flex flex-col items-center justify-center gap-1 h-14 active:opacity-70 transition-opacity"
                aria-label={def.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={`grid place-items-center h-7 w-12 rounded-full transition-colors ${isActive ? 'bg-accent-muted' : ''}`}>
                  <Icon className={`h-[22px] w-[22px] transition-colors ${isActive ? 'text-accent' : 'text-content-muted'}`} strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span className={`text-pm-2xs font-medium leading-none transition-colors ${isActive ? 'text-accent' : 'text-content-muted'}`}>{def.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
