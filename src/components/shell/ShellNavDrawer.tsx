import { memo } from 'react';
import { ChevronRight, X } from '@/icons';
import { WORKSPACE_SUBPAGES } from '@/config/workspaceNav';
import type { SidebarVariant } from '@/store/layoutStore';
import type { SidebarItem } from './WorkspacePanel';

interface ShellNavDrawerProps {
  open: boolean;
  onClose: () => void;
  variant?: SidebarVariant;
  workspaceLabel?: string;
  workspaceItems: SidebarItem[];
  railItems: SidebarItem[];
  onNavigate: (pageId: string) => void;
}

/** Mobile/tablet navigation: current workspace first, then all grouped modules. */
function ShellNavDrawer({
  open,
  onClose,
  variant = 'enterprise',
  workspaceLabel,
  workspaceItems,
  railItems,
  onNavigate,
}: ShellNavDrawerProps) {
  if (!open) return null;
  const isContrast = variant === 'contrast';

  const handleNav = (id: string, onClick?: () => void) => {
    onClose();
    if (onClick) onClick();
    else onNavigate(id);
  };
  const isActiveSubpage = (id: string) => workspaceItems.some((item) => item.id === id && item.isActive);
  const primaryItems = railItems.filter((item) => item.id !== 'settings' && item.id !== 'sistem-workspace');
  const settingsItems = railItems.filter((item) => item.id === 'settings' || item.id === 'sistem-workspace');

  return (
    <>
      <button
        type="button"
        aria-label="Închide navigarea"
        className="fixed inset-0 z-[80] bg-black/45 lg:hidden"
        onClick={onClose}
      />
      <aside
        aria-label="Navigare"
        data-variant={variant}
        className={`fixed inset-x-0 bottom-0 top-0 z-[85] flex flex-col overflow-hidden shadow-[var(--elevation-4)] sm:inset-y-4 sm:left-4 sm:right-auto sm:w-[min(92vw,440px)] sm:rounded-[24px] sm:border lg:hidden ${
          isContrast
            ? 'bg-surface-nav sm:border-line/70'
            : 'bg-surface-page sm:border-line'
        }`}
      >
        <div className={`shrink-0 border-b px-4 pb-3.5 pt-4 text-content-primary ${
          isContrast
            ? 'border-line/70 bg-surface-secondary/85'
            : 'border-line bg-surface-nav'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pt-0.5">
              <p className="truncate text-pm-sm font-semibold uppercase tracking-[0.08em] text-content-muted">Navigare</p>
              <p className="truncate text-pm-base font-semibold text-content-primary">{workspaceLabel || 'Alege modulul'}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Închide"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-content-muted transition-smooth duration-150 hover:bg-surface-nav-hover hover:text-content-primary focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
          {workspaceItems.length > 0 && (
            <section className={`mb-4 border p-2 ${
              isContrast
                ? 'rounded-2xl border-line/70 bg-surface-secondary/70'
                : 'rounded-2xl border-accent/20 bg-accent/8'
            }`}>
              <p className="px-3 pb-1 pt-2 text-pm-2xs font-bold uppercase tracking-[0.12em] text-accent">
                În workspace
              </p>
              <div className="space-y-1">
                {workspaceItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNav(item.id, item.onClick)}
                      className={`flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-left text-pm-sm transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                        item.isActive
                          ? (isContrast
                            ? 'rounded-xl border border-accent/30 bg-accent/14 font-semibold text-accent'
                            : 'rounded-xl bg-accent font-semibold text-[var(--color-on-accent)] shadow-[var(--elevation-1)]')
                          : (isContrast
                            ? 'rounded-xl border border-transparent text-content-secondary hover:border-accent/30 hover:bg-surface-primary hover:text-content-primary'
                            : 'rounded-xl text-content-secondary hover:bg-surface-nav-hover hover:text-content-primary')
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.badge != null && item.badge > 0 && (
                        <span className="rounded-full bg-status-red px-1.5 py-0.5 text-pm-2xs font-bold text-white tabular-nums">
                          {item.badge > 99 ? '99' : item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <p className="px-3 pb-2 text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted/95">
            Module
          </p>
          <div className={isContrast ? 'space-y-1.5' : 'space-y-2'}>
            {primaryItems.map((item) => {
              const Icon = item.icon;
              const subpages = WORKSPACE_SUBPAGES[item.id] ?? [];
              const hasSubpages = subpages.length > 0;
              const workspaceActive = item.isActive || subpages.some((subpage) => isActiveSubpage(subpage.id));
              if (isContrast) {
                return (
                  <section
                    key={item.id}
                    className={`rounded-2xl border p-1.5 transition-smooth duration-150 ${
                      workspaceActive
                        ? 'border-accent/35 bg-accent/10'
                        : 'border-line/70 bg-surface-secondary/55'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleNav(hasSubpages ? (subpages.find((subpage) => isActiveSubpage(subpage.id))?.id ?? subpages[0].id) : item.id, item.onClick)}
                      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                        workspaceActive ? 'border-accent/35 bg-accent/14 text-accent' : 'border-line/60 bg-surface-primary text-content-muted'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-pm-sm font-semibold">
                        {item.label}
                      </span>
                      {item.badge != null && item.badge > 0 && (
                        <span className="rounded-full bg-status-red px-1.5 py-0.5 text-pm-2xs font-bold text-white tabular-nums">
                          {item.badge > 99 ? '99' : item.badge}
                        </span>
                      )}
                      {hasSubpages && <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" />}
                    </button>

                    {hasSubpages && (
                      <div className="mt-1 space-y-1 border-t border-line/60 pt-2">
                        {subpages.map((subpage) => {
                          const SubIcon = subpage.icon;
                          const active = isActiveSubpage(subpage.id);
                          return (
                            <button
                              key={subpage.id}
                              type="button"
                              onClick={() => handleNav(subpage.id)}
                              className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-pm-sm transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                                active
                                  ? 'bg-accent text-[var(--color-on-accent)]'
                                  : 'text-content-secondary hover:bg-surface-primary hover:text-content-primary'
                              }`}
                            >
                              <SubIcon className="h-3.5 w-3.5 shrink-0" />
                              <span className="min-w-0 flex-1 truncate">{subpage.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              }
              return (
                <section
                  key={item.id}
                  className={`rounded-2xl border transition-smooth duration-150 ${
                    workspaceActive
                      ? 'border-accent/30 bg-accent/8'
                      : 'border-line/70 bg-surface-secondary/70'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleNav(hasSubpages ? (subpages.find((subpage) => isActiveSubpage(subpage.id))?.id ?? subpages[0].id) : item.id, item.onClick)}
                    className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                      workspaceActive ? 'bg-accent text-[var(--color-on-accent)]' : 'bg-surface-primary text-content-muted'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-pm-sm ${workspaceActive ? 'font-bold text-accent' : 'font-semibold text-content-primary'}`}>
                        {item.label}
                      </span>
                      {hasSubpages && (
                        <span className="block truncate text-pm-2xs text-content-muted">
                          {subpages.map((subpage) => subpage.label).join(' · ')}
                        </span>
                      )}
                    </span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="rounded-full bg-status-red px-1.5 py-0.5 text-pm-2xs font-bold text-white tabular-nums">
                        {item.badge > 99 ? '99' : item.badge}
                      </span>
                    )}
                    {hasSubpages && <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" />}
                  </button>

                  {hasSubpages && (
                    <div className="grid grid-cols-1 gap-1 px-2 pb-2">
                      {subpages.map((subpage) => {
                        const SubIcon = subpage.icon;
                        const active = isActiveSubpage(subpage.id);
                        return (
                          <button
                            key={subpage.id}
                            type="button"
                            onClick={() => handleNav(subpage.id)}
                            className={`flex min-h-10 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-pm-sm transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                              active
                                ? 'bg-surface-primary font-semibold text-accent shadow-[var(--elevation-1)]'
                                : 'text-content-secondary hover:bg-surface-nav-hover hover:text-content-primary'
                            }`}
                          >
                            <SubIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{subpage.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {settingsItems.length > 0 && (
            <section className={`mt-4 border-t pt-4 ${isContrast ? 'border-line/70' : 'border-line'}`}>
              <p className="px-3 pb-2 text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted">
                Sistem
              </p>
              <div className="space-y-2">
                {settingsItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNav(item.id, item.onClick)}
                      className={`flex min-h-12 w-full items-center gap-3 px-3 py-2.5 text-left text-pm-sm transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                        item.isActive
                          ? (isContrast
                            ? 'rounded-xl border border-accent/35 bg-accent/10 font-semibold text-accent'
                            : 'rounded-xl bg-accent/12 font-semibold text-accent')
                          : (isContrast
                            ? 'rounded-xl border border-line/70 bg-surface-secondary/55 text-content-secondary hover:border-accent/30 hover:text-content-primary'
                            : 'rounded-xl bg-surface-secondary/70 text-content-secondary hover:bg-surface-nav-hover hover:text-content-primary')
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <div className={`shrink-0 border-t px-4 py-3 text-pm-2xs text-content-muted ${
          isContrast ? 'border-line/70 bg-surface-nav' : 'border-line bg-surface-page'
        }`}>
          Folosește Ctrl+\ pentru a deschide rapid navigarea.
        </div>
      </aside>
    </>
  );
}

export default memo(ShellNavDrawer);
