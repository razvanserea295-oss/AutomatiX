/** Dashboard-only density tokens — tighter rhythm without touching shared layout. */

export const DASH_PANEL =
  'dash-widget h-full w-full [&>div:first-child]:px-3 [&>div:first-child]:py-2 [&>div:first-child]:sm:px-4 ' +
  '[&>div:first-child_p:first-of-type]:text-pm-sm [&>div:first-child_p:last-of-type]:mt-0.5 ' +
  '[&>div:first-child_p:last-of-type]:text-pm-2xs [&>div:first-child_p:last-of-type]:leading-snug ' +
  '[&>div:last-child]:pb-2';

export const DASH_LIST = 'divide-y divide-line/40 pb-1';

export const DASH_LIST_ROW =
  'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-tertiary/40';

export const DASH_LIST_ICON =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md';

export const DASH_EMPTY =
  '!min-h-[112px] !py-5 !px-3 [&>span]:mb-2 [&>span]:h-9 [&>span]:w-9 [&>span_svg]:h-4 [&>span_svg]:w-4 ' +
  '[&>p:first-of-type]:text-pm-sm [&>p:last-of-type]:text-pm-2xs';

export const DASH_KPI_GRID =
  'shrink-0 !gap-2 sm:!gap-2.5 [&>*]:!min-h-[68px] [&>*]:!px-3 [&>*]:!py-2 [&>*]:sm:!px-4 ' +
  '[&>*]:[&>p:first-of-type]:!text-pm-xl [&>*]:[&>p:first-of-type]:!min-h-6 [&>*]:[&>p:first-of-type]:!mt-1';

export const DASH_GRID_GAP = 'gap-2 lg:gap-2';

/** Hero chart (dashboard centrepiece) tokens. */
export const DASH_HERO_SHELL =
  'relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line/60 bg-surface-secondary/40';
export const DASH_HERO_BLEED = '';
export const DASH_HERO_CHART_HEIGHT = 'h-[clamp(200px,40vh,440px)]';
