export type { CardSlotSize } from './cardSizes';
export {
  CARD_SLOT_CLASS,
  CARD_SLOT_COL_SPAN,
  getComplementarySize,
} from './cardSizes';

/** Shared layout rhythm — 8px grid, one system for all pages. */
export const PAGE_INSET_X = 'px-3 sm:px-4 lg:px-6';
export const PAGE_INSET_Y = 'py-4 lg:py-6';
export const PAGE_PAD = 'px-3 py-4 sm:px-4 lg:px-6 lg:py-6';
/** Vertical stack gap — toolbar → KPI → grid → footer (16px mobile, 24–32px desktop). */
export const PAGE_GAP = 'gap-4 sm:gap-5 lg:gap-6';
/** Toolbar/KPI band → scrollable content — pairs with --density-gap-section in polish-pass.css. */
export const PAGE_SUBHEADER_CONTENT_GAP = 'mt-[var(--density-gap-section)]';
/** Horizontal/vertical gap between cards in the 12-col grid. */
export const PAGE_GRID_GAP = 'gap-5 lg:gap-6';
export const SECTION_GAP = 'gap-3 sm:gap-4 lg:gap-5';

/** Classic desktop — document scroll in shell-main; content grows naturally. */
export const DESKTOP_PAGE_FIT = 'flex w-full flex-col min-w-0 flex-1 min-h-0';
export const DESKTOP_BODY_FIT = 'flex w-full flex-col flex-1 min-h-0';
export const DESKTOP_CONTENT_GROW = 'flex w-full flex-col flex-1 min-h-0';
export const DESKTOP_GRID_FILL = 'grid w-full flex-1 min-h-0';
export const DESKTOP_FOOTER_BAND = 'shrink-0 lg:max-h-[32%] lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain';
export const PANEL_FILL = 'flex flex-col justify-start min-w-0 w-full';
/** Panel fills a flex/grid track — use with table/list children that manage their own scroll. */
export const PANEL_FILL_GROW = 'flex flex-col justify-start min-w-0 w-full lg:flex-1 lg:min-h-0';
export const LAYOUT_GRID = 'grid w-full gap-4 sm:gap-5 lg:flex-1 lg:min-h-0 lg:gap-6';
/** Matches CardHead horizontal rhythm — 8px grid (16 / 24). */
export const PANEL_HEAD = 'border-b border-line/60 bg-surface-secondary/35 px-4 py-3 sm:px-6 sm:py-4';
export const PANEL_BODY = 'flex min-w-0 w-full flex-col justify-start overflow-visible';
/** Centered loading / empty placeholder — grows to fill the panel so sparse states read as intentional, not a top-pinned strip in a void. */
export const PANEL_LOADING = 'flex w-full flex-1 min-h-[12rem] flex-col items-center justify-center gap-2 px-6 py-10 text-center text-content-muted';
export const PANEL_PLACEHOLDER = 'flex w-full flex-1 min-h-[12rem] flex-col items-center justify-center gap-2 px-6 py-10 text-center';
/** Body grows inside a fill panel — pair with an inner overflow-auto table/list. */
export const PANEL_BODY_GROW = 'flex min-w-0 w-full flex-col justify-start lg:flex-1 lg:min-h-0 overflow-visible';
/** Body scrolls — long lists/tables in fit layouts (opt-in). */
export const PANEL_BODY_SCROLL = 'flex min-w-0 w-full flex-col justify-start lg:flex-1 lg:min-h-0 lg:overflow-auto lg:overscroll-contain scrollbar-thin';

/** Standard list/tile surface for master-detail rows and card lists. */
export const LIST_TILE =
  'ix-list-tile surface-card border border-line/60 bg-surface-primary rounded-lg transition-smooth';

/** Standard 12-col page grid inside DashboardLayout content area. */
export const PAGE_GRID_12 = `page-content-grid stagger-in grid w-full flex-1 min-h-0 grid-cols-1 items-stretch lg:grid-cols-12 xl:grid-cols-12 ${PAGE_GRID_GAP}`;
/** Content wrapper inside DashboardLayout — flex column, not a grid. */
export const PAGE_CONTENT_SHELL = 'page-content-shell flex min-h-0 w-full flex-1 flex-col';
