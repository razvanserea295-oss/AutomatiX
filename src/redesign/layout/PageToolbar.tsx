import type { ReactNode } from 'react';
import { SECTION_GAP } from './constants';

export interface PageToolbarProps {
  actions?: ReactNode;
  toolbar?: ReactNode;
  leading?: ReactNode;
}

/** Inline actions + toolbar band at the top of page content (replaces PageChrome header). */
export default function PageToolbar({ actions, toolbar, leading }: PageToolbarProps) {
  const hasToolbar = !!(toolbar || actions);
  if (!leading && !hasToolbar) return null;

  return (
    <div className="page-toolbar shrink-0 space-y-3 anim-fade-slide-in">
      {leading}
      {hasToolbar && (
        <div className={`flex flex-wrap items-center justify-between ${SECTION_GAP}`}>
          {toolbar && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
              {toolbar}
            </div>
          )}
          {actions && (
            <div className="flex w-full max-w-full shrink-0 flex-wrap items-center justify-start gap-2 sm:ml-auto sm:w-auto sm:justify-end">
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
