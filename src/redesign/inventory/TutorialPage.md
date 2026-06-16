# TutorialPage — function inventory
**Route:** tutorial · **Workspace:** instrumente · **File:** pages/tutorial/TutorialPage.tsx · **Lines:** 717
**Props/contract:** `TutorialPage({ user, onNavigate }: { user: User; onNavigate?: (pageId: string) => void })` — `user` for the personalized welcome banner; optional `onNavigate(pageId)` callback for in-app routing. If `onNavigate` is absent, navigation falls back to `window.location.hash = '#/<page>'`.

## Backend functions (apiCommand) — ALL must survive
— none — (fully static page. No `apiCommand`, no `fetch`, no API of any kind. All content is hardcoded in three in-file constant arrays: `LIFECYCLE_SECTIONS`, `PAGES_GUIDE`, `TIPS`.)

## Data sources (stores / hooks)
- No Zustand stores, no data-loading hooks, no server data.
- `user: User` prop — only `user.full_name` / `user.username` are read (welcome banner).
- Local React state only:
  - `useState<Tab>('lifecycle')` — active tab (`'lifecycle' | 'pages' | 'tips'`).
  - `useState('')` — search query string.
  - `useMemo` → `buildSearchIndex(search)` — derives unified search hits.
  - `LifecycleTimeline` has its own local `useState<string|null>` for the currently-expanded section (defaults to first section id).
  - `PagesDirectory` uses `useMemo` to group `PAGES_GUIDE` by `group` field.

## User actions & controls
- **Tab switch** (3 tabs via `<PageHeader tabs>`): "Parcurs proiect" (lifecycle), "Toate paginile" (pages), "Sfaturi" (tips). Tabs are hidden while a search query is active.
- **Global search input** — free-text; live filters across all 3 sources simultaneously. Sticky at top of body.
- **Clear-search button** (X icon) — appears when search is non-empty; resets query to ''.
- **Lifecycle accordion toggle** — click a section header to expand/collapse (single-open accordion; clicking the open one collapses it).
- **"Deschide pagina →" link** (per lifecycle step that has a `page`) — calls `handleNavigate(step.page)`.
- **Page-directory card click** (every entry in `PAGES_GUIDE`) — calls `handleNavigate(p.page)` to navigate to that app page.
- **Search-result row click** (only when the hit has a `page`) — calls `handleNavigate(h.page)`. Tip hits and the "Finalizare" lifecycle step (no `page`) render as non-clickable rows.
- `handleNavigate(page)` → `onNavigate(page)` if provided, else sets `window.location.hash`.

## Modals & dialogs
— none — (no modals, dialogs, sheets, or popovers).

## Filters / search / sort / tabs / sub-views
- **Tabs (3):** lifecycle / pages / tips — suppressed during active search.
- **Unified search** (`buildSearchIndex`): case-insensitive substring match. Indexed fields:
  - Pages: `title`, `desc`, `keywords` (hidden search-only keywords per entry), `group`.
  - Lifecycle steps: `title`, `description`, `details[]` (joined), `tips[]` (joined), parent section `title`.
  - Tips: `title`, `body`.
- **Search results grouping:** hits grouped by kind into ordered sections "Pagini" (page), "Parcurs proiect" (lifecycle), "Sfaturi" (tip), each with count; empty groups hidden. Total-count header line. Empty-state message when zero hits.
- **Pages sub-view grouping:** `PagesDirectory` groups the 28 page entries by `group` (Acasă, Personal, Vânzări, Proiecte, Proiectare, Producție, Aprovizionare, Financiar, Instrumente, Sistem) into a responsive 1/2/3-column grid.
- No sort controls, no pagination.

## Exports / print / file ops
— none — (no export, print, PDF, upload, download, or clipboard.)

## Keyboard shortcuts / realtime / polling
- No keyboard handlers, no realtime, no polling, no timers. (The page *documents* app-wide shortcuts like Ctrl+K, "?", Ctrl+Shift+D/P in its tip text, but does not implement them.)

## Sub-components owned
All defined inline in this file (none exported, none reused elsewhere):
- `LifecycleTimeline({ sections, onNavigate })` — single-open accordion of lifecycle sections; renders steps with details bullets, optional tip callout, and "Deschide pagina" link.
- `PagesDirectory({ pages, onNavigate })` — grouped grid of clickable page cards.
- `TipsGrid({ tips })` — 2-column grid of static tip cards (no actions).
- `SearchResults({ hits, onNavigate })` — grouped, kind-labeled search results with clickable/non-clickable rows and empty state.
- `buildSearchIndex(query)` — pure helper producing `SearchHit[]`.
- In-file types: `TutorialStep`, `TutorialSection`, `PageEntry`, `TipEntry`, `Tab`, `SearchHit`.
- In-file data constants: `LIFECYCLE_SECTIONS` (6 sections / 13 steps), `PAGES_GUIDE` (28 page entries across 10 groups), `TIPS` (15 tips).

## Access / permissions
- No role gating, no permission checks, no viewer-only branches. Renders identically for all users; only the welcome banner is personalized via `user`.
- Note: content *describes* admin/manager-only pages (Birou control, Utilizatori, dashboard config) but the tutorial itself is open to everyone.

## Rebuild notes (Modern-SaaS layout intent)
- This is a **read-only help/onboarding hub** — keep it airy and content-first; no tables, no data fetching, no state beyond tab + search.
- **Header:** title "Tutorial Automatix" + subtitle, with a 3-tab strip (Parcurs proiect / Toate paginile / Sfaturi). Tabs collapse away when searching.
- **Primary control:** a prominent, sticky global search bar at the top of the body — it is the main interaction and intentionally searches all three sources at once. Preserve the "tabs hidden while searching, full-width grouped results" behavior.
- **Tab 1 (Lifecycle):** vertical timeline / single-open accordion; each section = numbered stage with icon + colored accent, expandable to steps (description, bullet details, accent-bordered tip callouts, and a "Deschide pagina →" deep link). Modern look: card-stacked accordion or a left-rail stepper with right-pane detail.
- **Tab 2 (Pages directory):** grouped card grid (1/2/3 responsive), each card icon + title + 2-line description, whole card clickable to navigate. Keep group headers.
- **Tab 3 (Tips):** simple 2-column static info-card grid; no actions.
- **Must preserve:** the `onNavigate(pageId)` deep-link contract (with the `window.location.hash` fallback), all 28 page entries + their hidden `keywords` (search index), all 13 lifecycle steps with their `page` links, all 15 tips, and the unified case-insensitive search across title/desc/keywords/details/tips. Removing any data entry shrinks the help coverage — treat the three constant arrays as load-bearing content, not chrome.
- Reuses shared primitives: `Page`, `PageHeader`, and `filterControls` search classes (`filterSearchInputCls` / `filterSearchIconCls` / `filterClearInlineBtnCls`) — keep using the centralized filter-control styles.
