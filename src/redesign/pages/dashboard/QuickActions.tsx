import { useMemo } from 'react';
import { Zap } from '@/icons';
import { PALETTE_ACTIONS } from '@/components/shell/palette-data';
import type { AppPage } from '@/lib/access';
import { Panel } from '@/app-ui';
import EmptyState from '@/redesign/ui/EmptyState';
import type { CanAccessFn, NavigateFn } from './types';
import { QUICK_ACTION_PAGE_MAP } from './types';
import { DASH_EMPTY, DASH_PANEL } from './density';

interface QuickActionsProps {
  can: CanAccessFn;
  onNavigate: NavigateFn;
}

function resolveAppPage(pageId: string): AppPage | null {
  if (pageId in QUICK_ACTION_PAGE_MAP) {
    return QUICK_ACTION_PAGE_MAP[pageId];
  }
  return pageId as AppPage;
}

export default function QuickActions({ can, onNavigate }: QuickActionsProps) {
  const actions = useMemo(
    () => PALETTE_ACTIONS.filter((a) => {
      if (a.command || !a.page) return false;
      const appPage = resolveAppPage(a.page);
      return appPage ? can(appPage) : false;
    }).slice(0, 6),
    [can],
  );

  return (
    <Panel title="Acțiuni rapide" subtitle="Ctrl+K · paletă" fill scroll className={DASH_PANEL}>
      {actions.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="Nicio acțiune disponibilă"
          description="Permisiunile curente nu includ scurtături rapide. Folosește Ctrl+K pentru navigare."
          className={DASH_EMPTY}
        />
      ) : (
        <div className="grid grid-cols-2 gap-1.5 p-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => onNavigate(action.page!)}
                title={action.subtitle}
                className="dash-widget-tile flex flex-col items-center gap-1 rounded-lg border border-line/50 bg-surface-secondary/30 px-1.5 py-2 text-center transition-colors hover:border-accent/40 hover:bg-surface-tertiary/50"
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <p className="line-clamp-2 w-full text-pm-2xs font-medium leading-tight text-content-primary">
                  {action.title}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
