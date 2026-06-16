# KanbanPage — function inventory
**Route:** production · **Workspace:** production · **File:** pages/KanbanPage.tsx · **Lines:** 700
**Props/contract:** `KanbanPage({ user: User | null, onNavigate?: (page: string, opts?: { projectId?: number }) => void })` — `user` is read but unused (`_user`); `onNavigate` is the cross-page navigation callback.

## Backend functions (apiCommand) — ALL must survive
Direct calls in KanbanPage.tsx:
- `get_project_stages_custom` — loads a project's custom production stages (args `{ project_id }`) · triggered by `reloadStages()` when a project is selected (pieces mode)
- `get_production_board` — loads the project kanban columns; in pieces mode it is also fetched and merged with custom stages to build the stage list · triggered by `reloadStages()` and (via store) on initial mount

Load-bearing calls reached through the stores this page drives (must survive too):
- `get_projects` — project list for the "Vizualizare" dropdown · via `useProjectStore.fetchProjects()` on mount
- `get_production_board` — projects-mode board columns · via `useProjectStore.fetchProductionBoard()` on mount
- `get_project_stats` — KPI tile counts (total / in_production / approved / blocked / completed) · via `useProjectStore.fetchProductionStats()` on mount
- `update_project` — moves a project to a new stage (`{ id, stage_id }`) · via `useProjectStore.moveProjectToStage()` on project drag-drop
- `get_project_pieces` — pieces of the selected project (`{ project_id }`) · via `usePieceStore.fetchPieces()` when a project is selected
- `update_project_piece` — moves a piece to a new stage (`{ id, stage_id }`) · via `usePieceStore.movePieceToStage()` on piece drag-drop
- `time_get_active` — reads the active running timer · via `PieceTimerButton` rendered on every piece card (mount + after start/stop)
- `time_start` — starts a piece time entry (`{ piece_id }`) · via `PieceTimerButton` play action on a piece card
- `time_stop` — stops the active timer (`{}`) · via `PieceTimerButton` stop action on a piece card

KanbanEnhancements.tsx makes NO apiCommand calls (all settings are localStorage-only).

## Data sources (stores / hooks)
- `useProjectStore` — selectors: `projects`, `productionBoard`, `productionStats`, `loadingBoard`; actions: `moveProjectToStage`, `fetchProjects`, `fetchProductionBoard`, `fetchProductionStats`. Centralized so Dashboard / Projects / SalesHub / Finance see stage moves immediately.
- `usePieceStore` — actions `fetchPieces`, `movePieceToStage`; hook `usePiecesForProject(selectedProjectId)` for pieces of the selected project. Centralized so PartsTree / ProjectsPage tracking / PieceDetailView stay in sync.
- `useMoney()` (settingsStore) — currency formatter; project card `estimated_value` formatted as EUR.
- `useLocalStorage` (components/enhancements) — persists KanbanEnhancements settings under key `promix_kanban_<scope>_v1`.
- Local component state: `selectedProjectId`, `filterClient`, `mergedStages`, `loadingPieces`, `dragOverStage`, `dragItem` (ref).
- `sessionStorage` handoffs: `promix_focus_piece`, `promix_focus_project`, `promix_focus_project_action` (set before onNavigate to focus a target on the destination page).

## User actions & controls
- **View / mode selector** (select) — switch between "Kanban proiecte (toate)" (projects mode) and "Piesele unui proiect" → a specific project (pieces mode). Drives `selectedProjectId`.
- **Client filter** (select, projects mode only) — "Toti clientii" + unique client names; filters project columns by `client_name`.
- **Drag & drop project card** → drop on a stage column → `moveProjectToStage` (toast "Proiect mutat" / error toast).
- **Drag & drop piece card** → drop on a stage column → `movePieceToStage` (toast "Piesa mutată" / error toast).
- **Click project card** → `onNavigate('parts-tree', { projectId })`.
- **Edit project button** (pencil icon on project card) → sets `promix_focus_project` + `promix_focus_project_action='edit'` → `onNavigate('projects', { projectId })` (ProjectsPage auto-opens edit modal).
- **Click piece card** → sets `promix_focus_piece` → `onNavigate('parts-tree', { projectId })`.
- **Piece timer button** (`PieceTimerButton` on each piece card, click-isolated via stopPropagation) → start/stop time tracking for that piece.
- **KanbanEnhancements toggle** — expand/collapse "Setări kanban avansate" dock.
- **WIP limit inputs** (per stage, number) — set max cards per column; over-limit columns flagged red + global "WIP depășit" badge.
- **Swimlane buttons** — none / priority / client / assignee; shows grouped counts.
- **Age-bucket threshold inputs** (3 number fields) — adjust fresh/aging/stale/ancient day thresholds; live histogram.
- **Auto-archive days input** (number) — shows count of cards older than N days eligible to hide.
- **Saved filters** (`QuickFilterChips`) — save/apply the current `{ filterClient }` filter payload; apply calls `onApplyFilter` → sets `filterClient`.
- **Reset button** — resets KanbanEnhancements settings to DEFAULTS.

## Modals & dialogs
- — none — (no modals owned by this page; "edit project" delegates to ProjectsPage's modal via sessionStorage handoff + navigation).

## Filters / search / sort / tabs / sub-views
- **Sub-views (mode):** Projects kanban vs Pieces-of-a-project kanban — toggled by the "Vizualizare" select.
- **Client filter:** projects mode only.
- **Pieces summary line:** "{N} piese · {M} etape" in toolbar (pieces mode).
- **Swimlanes (analysis grouping):** priority / client / assignee in enhancements dock.
- **No text search, no column sort, no pagination, no tab strip.** Columns = production stages; cards ordered as returned by the board/pieces query.

## Exports / print / file ops
- — none —

## Keyboard shortcuts / realtime / polling
- **No keyboard shortcuts.**
- **No polling/realtime sockets.** Freshness comes from centralized stores: drag-drop mutations force-refresh board + stats + projects/pieces, so other pages update too. Initial fetch is idempotent/cached.
- Framer-motion column enter animations (staggered fade/slide-in).

## Sub-components owned
- `ProjectsBoard` — projects-mode column grid (drag/drop wiring).
- `ProjectCard` — project card (name, client, priority badge, EUR value, comment/time counts, client initials, deadline with overdue/close coloring, edit button).
- `PiecesBoard` — pieces-mode column grid + empty state ("Proiectul nu are etape definite sau piese importate").
- `PieceCard` — piece card (name, category chip, quantity, `PieceTimerButton`, status badge, production_tracking progress bar done/total).
- `KpiMini` — glassy KPI tile (projects mode KPI row).
- `KanbanEnhancements` (pages/kanban/KanbanEnhancements.tsx) — collapsible advanced dock: WIP limits, swimlanes, card-aging histogram, auto-archive, saved filters; all localStorage-scoped per `scope` ('projects' | 'pieces').
- Reused primitives: `Page`, `HeroHeader`, `GlassCard`, `MetricValue`, `ViewerBanner`, `StatusBadge`, `PieceTimerButton`, `filterSelectCls`, enhancements `SectionCard`/`QuickFilterChips`/`useLocalStorage`/`Button`.

## Access / permissions
- `<ViewerBanner page="production" />` — shows viewer-only banner; page is gated under workspace/page `production` via `src/lib/access.ts` (server enforces per-command auth). Viewer role sees a read-only banner; mutating commands (update_project, update_project_piece, time_*) are blocked server-side for insufficient roles. `user` prop accepted but not consumed for client-side gating here.

## Rebuild notes (Modern-SaaS layout intent)
- **Keep it a true board:** horizontal stage columns with their own vertical scroll; the page opts out of page-level scroll (`!overflow-hidden`) so only columns scroll. This is correct for kanban — do NOT force ListReport/.mod-bento here (memory: don't force bento on board pages).
- **Header:** airy HeroHeader (eyebrow "Producție", Factory icon, subtitle). Primary toolbar = one row: mode selector (projects ↔ pieces) on the left, contextual client filter / pieces summary next to it.
- **KPI row (projects mode only):** 5 featured KPI tiles (Total / În producție / Aprobate / Blocate(warn) / Finalizate) using glass tiles — reuse the approved airy+glass dashboard direction.
- **Cards:** compact, drag-grabbable, with priority tone via StatusBadge resolver, EUR value via useMoney, deadline urgency coloring, and inline timer on pieces. Preserve the production_tracking progress bar.
- **Advanced dock:** keep KanbanEnhancements as a collapsible footer dock (WIP/swimlanes/aging/archive/saved-filters) — it's localStorage-only and must not be confused for server features (its own copy says WIP is client-side only).
- **Must preserve all 9 backend commands** above (2 direct + 7 via stores) and the sessionStorage navigation handoffs to parts-tree / projects, or the rebuild silently drops drag-to-move, timers, KPIs, and "edit project / focus piece" deep-links.
