import type { CSSProperties } from 'react';
import { usePageHeaderActionsState } from '@/context/PageHeaderActionsContext';

const noDrag = { WebkitAppRegion: 'no-drag' } as CSSProperties;

export default function TitlebarPageActions() {
  const { actions, secondaryActions, toolbar } = usePageHeaderActionsState();
  const hasAny = !!(actions || secondaryActions || toolbar);

  if (!hasAny) return null;

  return (
    <div
      style={noDrag}
      // Show whenever the desktop titlebar itself is shown (sm+). It used to be
      // `md:flex`, which hid the page's primary actions — including "Task nou" on
      // the tasks page, where in navbar mode the button lives ONLY here — for the
      // 640–768px band (laptops at higher zoom / narrow windows), with no inline
      // fallback. Width is capped + scrollable via .titlebar-page-actions CSS.
      className="titlebar-page-actions hidden sm:flex"
      role="toolbar"
      aria-label="Acțiuni pagină"
    >
      {toolbar && (
        <div className="titlebar-page-toolbar">{toolbar}</div>
      )}
      {secondaryActions && (
        <div className="titlebar-page-actions-secondary">{secondaryActions}</div>
      )}
      {actions && (
        <div className="titlebar-page-actions-primary">{actions}</div>
      )}
    </div>
  );
}
