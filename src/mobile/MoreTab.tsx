








import { Sun, Moon, Monitor, LogOut, ChevronRight, ShieldCheck, Factory } from 'lucide-react';
import type { User } from '@/core/types';
import type { ScreenId } from './MobileApp';
import { MOBILE_PAGE_GROUPS } from './mobilePages';
import { useDesktopOverride } from '@/hooks/useIsPhone';
import { canAccessPage, normalizeRole } from '@/lib/access';
import { Card, Divider, initials } from './kit';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator', manager: 'Manager', user: 'Utilizator',
};

export default function MoreTab({ user, theme, onThemeChange, onLogout, isAdminManager, onOpenScreen, onOpenPage }: {
  user: User;
  theme: 'light' | 'dark';
  onThemeChange: (t: 'light' | 'dark') => void;
  onLogout: () => void;
  isAdminManager: boolean;
  onOpenScreen: (id: ScreenId) => void;
  onOpenPage: (id: string) => void;
}) {
  const [, toggleDesktop] = useDesktopOverride();
  const role = normalizeRole(user.role_name);

  
  
  const groups = MOBILE_PAGE_GROUPS
    .map(g => ({ title: g.title, pages: g.pages.filter(p => canAccessPage(user.role_name, p.gate, user.custom_pages)) }))
    .filter(g => g.pages.length > 0);

  return (
    <div className="px-3.5 pt-4 space-y-5">
      {}
      <Card className="surface-card p-4">
        <div className="flex items-center gap-3.5">
          <div className="grid place-items-center h-14 w-14 rounded-full bg-accent text-surface-primary text-pm-xl font-bold shrink-0 shadow-sm">
            {initials(user.full_name || user.username)}
          </div>
          <div className="min-w-0">
            <div className="text-pm-lg font-semibold text-content-primary truncate">{user.full_name || user.username}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-pm-sm text-content-muted">
              <ShieldCheck className="h-3.5 w-3.5" />
              {ROLE_LABEL[role] || user.role_name || 'Utilizator'}
              {user.job_title && <span className="truncate">· {user.job_title}</span>}
            </div>
          </div>
        </div>
      </Card>

      {
}
      {isAdminManager && canAccessPage(user.role_name, 'production', user.custom_pages) && (
        <section>
          <h2 className="text-pm-eyebrow uppercase text-content-muted px-1 mb-2">Predări producție</h2>
          <Card className="surface-card overflow-hidden">
            <button
              type="button"
              onClick={() => onOpenScreen('production')}
              className="w-full flex items-center gap-3 px-3.5 py-3.5 text-left active:bg-surface-tertiary transition-colors"
            >
              <span className="grid place-items-center h-9 w-9 rounded-lg bg-accent-muted text-accent shrink-0">
                <Factory className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="text-pm-md text-content-primary">Predări pendinte</div>
                <div className="text-pm-xs text-content-muted">Accept / respinge — vedere optimizată mobil</div>
              </div>
              <ChevronRight className="h-4 w-4 text-content-muted" />
            </button>
          </Card>
        </section>
      )}

      {}
      {groups.map(g => (
        <section key={g.title}>
          <h2 className="text-pm-eyebrow uppercase text-content-muted px-1 mb-2">{g.title}</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {g.pages.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenPage(p.id)}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-surface-secondary surface-card py-4 px-1.5 active:bg-surface-tertiary transition-colors"
              >
                <p.icon className="h-6 w-6 text-content-secondary" />
                <span className="text-pm-xs font-medium text-content-primary text-center leading-tight">{p.label}</span>
              </button>
            ))}
          </div>
        </section>
      ))}

      {}
      <section>
        <h2 className="text-pm-eyebrow uppercase text-content-muted px-1 mb-2">Setări</h2>
        <Card className="surface-card overflow-hidden">
          <div className="flex items-center gap-3 px-3.5 py-3">
            {theme === 'dark' ? <Moon className="h-5 w-5 text-content-muted" /> : <Sun className="h-5 w-5 text-content-muted" />}
            <span className="text-pm-md text-content-primary flex-1">Temă întunecată</span>
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
              className={`relative h-7 w-12 rounded-full transition-colors ${theme === 'dark' ? 'bg-accent' : 'bg-surface-tertiary'}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-surface-primary shadow transition-all ${theme === 'dark' ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          <Divider />
          <button
            type="button"
            onClick={() => toggleDesktop()}
            className="w-full flex items-center gap-3 px-3.5 py-3.5 text-left active:bg-surface-tertiary transition-colors"
          >
            <Monitor className="h-5 w-5 text-content-muted shrink-0" />
            <div className="flex-1">
              <div className="text-pm-md text-content-primary">Versiune desktop</div>
              <div className="text-pm-xs text-content-muted">Layout complet, cu navbar + sidebar</div>
            </div>
            <ChevronRight className="h-4 w-4 text-content-muted" />
          </button>
        </Card>
      </section>

      {}
      <button
        type="button"
        onClick={onLogout}
        className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-status-red/15 text-status-red text-pm-md font-semibold active:bg-status-red/25 transition-colors"
      >
        <LogOut className="h-4 w-4" /> Deconectare
      </button>

      <div className="text-center text-pm-xs text-content-muted pb-2">automatiX · versiune mobilă</div>
    </div>
  );
}
