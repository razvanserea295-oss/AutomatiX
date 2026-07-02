import { useEffect, type ReactNode } from 'react';
import Breadcrumb, { type BreadcrumbSegment } from '@/redesign/ui/Breadcrumb';
import { usePageHeaderActionsOptional } from '@/context/PageHeaderActionsContext';
import {
  PageHeaderCount,
  PageHeaderLastUpdated,
  PageHeaderMetaRow,
  PageHeaderMetricChip,
  type PageHeaderMetric,
} from '@/redesign/ui/PageHeaderMeta';
import { useRoutePageMeta } from '@/hooks/useRoutePageMeta';
import { breadcrumbEndsWithTitle } from '@/config/pageNavMeta';
import { useShellLayoutStore } from '@/store/shellLayoutStore';

export type { PageHeaderMetric };

export interface PageChromeProps {
  title?: string;
  /** Force visible title even when breadcrumb already shows the page name. */
  showTitle?: boolean;
  subtitle?: string;
  icon?: ReactNode;
  /** Breadcrumb segments or custom breadcrumb node. Omit to resolve from the active route. */
  breadcrumb?: BreadcrumbSegment[] | ReactNode;
  /** When true, do not inject route-based breadcrumb. */
  suppressAutoBreadcrumb?: boolean;
  count?: number | string;
  countLabel?: string;
  status?: ReactNode;
  meta?: ReactNode;
  metrics?: PageHeaderMetric[];
  lastUpdated?: Date | string | number | null;
  refreshing?: boolean;
  actions?: ReactNode;
  secondaryActions?: ReactNode;
  toolbar?: ReactNode;
}

/**
 * Navbar mode — render no on-page band; lift the page's functional controls
 * (actions, secondaryActions, toolbar/tabs) into the top navbar (Titlebar) via
 * PageHeaderActionsContext. Title / breadcrumb / meta are intentionally dropped.
 */
function NavbarChrome({ actions, secondaryActions, toolbar }: PageChromeProps) {
  const headerActionsCtx = usePageHeaderActionsOptional();
  const setHeaderActions = headerActionsCtx?.setActions;
  const clearHeaderActions = headerActionsCtx?.clearActions;

  useEffect(() => {
    if (!setHeaderActions || !clearHeaderActions) return undefined;
    if (actions || secondaryActions || toolbar) {
      setHeaderActions(actions, secondaryActions, toolbar);
    } else {
      clearHeaderActions();
    }
    return () => clearHeaderActions();
  }, [actions, secondaryActions, toolbar, setHeaderActions, clearHeaderActions]);

  return null;
}

/**
 * Classic mode — the original on-page header band: breadcrumb wayfinding, title +
 * meta, actions on the right, optional filter/tab toolbar below. Nothing is lifted
 * to the navbar. Title/breadcrumb fall back to the active route's metadata.
 */
function ClassicChrome({
  title,
  showTitle,
  subtitle,
  icon,
  breadcrumb,
  suppressAutoBreadcrumb = false,
  count,
  countLabel,
  status,
  meta,
  metrics,
  lastUpdated,
  refreshing,
  actions,
  secondaryActions,
  toolbar,
}: PageChromeProps) {
  const routeMeta = useRoutePageMeta();

  const resolvedBreadcrumb = suppressAutoBreadcrumb
    ? breadcrumb
    : (breadcrumb ?? routeMeta.breadcrumbSegments);
  const hasBreadcrumb =
    resolvedBreadcrumb != null
    && (Array.isArray(resolvedBreadcrumb) ? resolvedBreadcrumb.length > 0 : true);
  const effectiveTitle = title ?? routeMeta.pageTitle;
  const titleRedundantWithBreadcrumb = hasBreadcrumb
    && Array.isArray(resolvedBreadcrumb)
    && breadcrumbEndsWithTitle(resolvedBreadcrumb, routeMeta.pageTitle)
    && (!title || title === routeMeta.pageTitle);
  const visibleTitle = showTitle === true
    || (showTitle !== false && effectiveTitle && !titleRedundantWithBreadcrumb);
  const hasMetrics = !!(metrics && metrics.length > 0);
  const hasMetaRow = hasMetrics || meta || lastUpdated;
  const hasActions = !!(actions || secondaryActions);
  const hasHeaderRow = !!(icon || visibleTitle || count != null || status || subtitle || hasMetaRow);

  return (
    <header className="page-chrome shrink-0 border-b border-line/60 bg-surface-secondary anim-fade-slide-in">
      <div className="page-chrome-inner flex flex-col gap-2 px-3 py-2.5 sm:px-4 sm:py-3 lg:px-6">
        {hasBreadcrumb && (
          <div className="page-chrome-breadcrumb min-w-0">
            {Array.isArray(resolvedBreadcrumb)
              ? <Breadcrumb segments={resolvedBreadcrumb} />
              : resolvedBreadcrumb}
          </div>
        )}

        {(hasHeaderRow || hasActions) && (
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {icon && (
              <span className="page-chrome-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent sm:h-10 sm:w-10 [&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-[18px] sm:[&>svg]:w-[18px]">
                {icon}
              </span>
            )}

            <div className="min-w-0 flex-1">
              {(visibleTitle || count != null || status) && (
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {effectiveTitle && (
                    visibleTitle ? (
                      <h1 className="truncate text-pm-md font-semibold leading-tight tracking-tight text-content-primary sm:text-pm-lg">
                        {effectiveTitle}
                      </h1>
                    ) : (
                      <h1 className="sr-only">{effectiveTitle}</h1>
                    )
                  )}
                  {count != null && <PageHeaderCount count={count} label={countLabel} />}
                  {status}
                </div>
              )}
              {!visibleTitle && effectiveTitle && count == null && !status && (
                <h1 className="sr-only">{effectiveTitle}</h1>
              )}
              {subtitle && (
                <p className="mt-0.5 truncate text-pm-xs leading-snug text-content-muted sm:text-pm-sm">{subtitle}</p>
              )}
              {hasMetaRow && (
                <PageHeaderMetaRow>
                  {metrics?.map((m) => (
                    <PageHeaderMetricChip key={m.label} {...m} />
                  ))}
                  {meta}
                  <PageHeaderLastUpdated at={lastUpdated} refreshing={refreshing} />
                </PageHeaderMetaRow>
              )}
            </div>

            {hasActions && (
              <div className="flex w-full max-w-full shrink-0 flex-wrap items-center justify-start gap-2 sm:ml-auto sm:w-auto sm:justify-end">
                {secondaryActions && (
                  <div className="page-chrome-actions-secondary flex items-center gap-1.5">{secondaryActions}</div>
                )}
                {actions && (
                  <div className="page-chrome-actions-primary flex flex-wrap items-center gap-2">{actions}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {toolbar && (
        <div className="page-chrome-toolbar border-t border-line/50 px-3 py-2.5 sm:px-4 sm:py-3 lg:px-6">
          {toolbar}
        </div>
      )}
    </header>
  );
}

/**
 * Page chrome. Switches between two modes, controlled by the Settings toggle
 * (shellLayoutStore.pageHeader):
 *  - 'navbar'  (default): headless; lifts the page controls into the top navbar.
 *  - 'classic': renders the original on-page header band.
 */
export default function PageChrome(props: PageChromeProps) {
  const mode = useShellLayoutStore((s) => s.layout.pageHeader);
  return mode === 'classic' ? <ClassicChrome {...props} /> : <NavbarChrome {...props} />;
}
