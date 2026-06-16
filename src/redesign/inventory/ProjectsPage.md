# ProjectsPage — function inventory
**Route:** projects · **Workspace:** projects-contracts · **File:** pages/ProjectsPage.tsx · **Lines:** 1280
**Props/contract:** `ProjectsPage({ user: User | null, onNavigate: (page: string, opts?: { projectId?: number }) => void })` — `user` is destructured as `_user` (unused). `onNavigate` is used to jump to the `parts-tree` page with `{ projectId }`.

## Backend functions (apiCommand) — ALL must survive
Direct calls in ProjectsPage.tsx:
- `get_project_comments` — fetch comment list for selected project · triggered by project selection (effect) and after posting a comment
- `add_project_comment` — post a new comment (audit-logs + notifies @mentions) · triggered by "Adaugă" button / Ctrl+Enter in comment textarea (`postComment`)
- `get_project_documents` — fetch attached documents (documents + contract attachments) for selected project · triggered by project selection (effect)
- `get_project_parts_tree` — fetch parts tree to compute the component count for the mini preview · triggered by project selection (effect)
- `list_portal_tokens` — list client-portal share tokens for the project · triggered by opening the PortalTokensButton modal
- `create_portal_token` — generate a new read-only client portal link (with optional label) · triggered by "Generează link nou" in portal modal
- `revoke_portal_token` — revoke a portal token (keeps record) · triggered by revoke (X) icon on a token row
- `delete_portal_token` — delete a portal token · triggered by delete (trash) icon on a token row

Indirect, via stores the page calls (load-bearing — must survive):
- `get_projects` — load all projects · via `useProjectStore.fetchProjects()` (initial load)
- `get_production_board` — load production stages/board columns (feeds the "Etapa producție" select + status derivation) · via `useProjectStore.fetchProductionBoard()` (initial load)
- `create_project` — create a project · via `createProjectStore()` on FormModal submit (add mode)
- `update_project` — update a project (also used for status flags: blocat / anulat / reactivate; and stage_id change) · via `updateProjectStore()` on FormModal submit (edit mode) and the status flag buttons
- `delete_project` — delete a project and all associated data · via `deleteProjectStore()` from the delete (trash) action
- `get_clients` — load clients (for client name lookup + client select in form) · via `useClientStore.fetchClients()` (initial load)

Note: `get_project_stats` exists on projectStore (`fetchProductionStats`) but this page derives KPIs locally from `projects` in the store and does NOT call it. No new IPC for KPIs.

## Data sources (stores / hooks)
- `useProjectStore` — `projects`, `fetchProjects`, `productionBoard`, `fetchProductionBoard`, `createProject`, `updateProject`, `deleteProject`, `loadingProjects`
- `useClientStore` — `clients`, `fetchClients`, `loading`
- `useMoney()` (settingsStore) — currency formatter; budget shown in EUR, "Valoare activă" KPI forced to RON
- `useViewerMode('projects')` — viewer-mode gate (hides Add/Edit/Delete/comment-input)
- `useFormModal()` — open/close + editing state for the add/edit project FormModal
- `useSplitView('split:projects', true)` — persisted split-view (master list panel) toggle
- `apiCommand` (direct) — comments, documents, parts-tree count, portal tokens
- `localStorage` — `promix_stage_revisions_<id>` (stage revision history persisted client-side only, NOT a backend store)
- `sessionStorage` — `promix_focus_project` + `promix_focus_project_action` (focus signal from Kanban edit button → selects project, optionally opens edit modal)
- `lazy(() => import('@/components/DxfViewer'))` — DXF/CAD viewer chunk, loaded only when an expanded piece row has a source file (used by exported `PiecesTrackingTable`)

## User actions & controls
- Search input — filters list by project name OR client name (left panel)
- Project list row — click / Enter / Space selects project (sets `selectedId`)
- Per-row inline Edit (pencil) — opens edit modal for that project (hidden for viewers)
- "Proiect nou" hero button — opens add modal (hidden for viewers)
- SplitViewToggle (hero) — collapse/expand the left master list
- "Show panel" rail button (PanelLeft) — re-opens the collapsed left list
- Detail header status flags:
  - "Blochează" → `update_project { status: 'blocat' }` (only when not blocat/anulat)
  - "Anulează" → confirm dialog → `update_project { status: 'anulat' }`
  - "Reia" → `update_project { status: 'în producție' }` (only when blocat/anulat; reverts to stage-derived status)
- Detail header Edit (pencil) — opens edit modal (hidden for viewers)
- PortalTokensButton (Link2 icon) — opens client-portal links modal
- Detail header Delete (trash) — confirm dialog → `delete_project` (hidden for viewers)
- "Adaugă revizuire" — appends a stage-revision entry (with optional note) to localStorage history
- "Arbore piese" section — click navigates to `parts-tree` page (`onNavigate('parts-tree', { projectId })`)
- Document "Vizualizează" (Eye) — opens in-app DocumentPreviewModal (document source rows)
- Document "Descarcă" (Download) — `downloadOneContractAttachment(d.id)` for contract-source rows
- Comment textarea + "Adaugă" — posts comment; Ctrl/Cmd+Enter also submits (hidden for viewers)
- Portal modal actions: "Generează link nou" (create), copy link (clipboard), revoke (X), delete (trash); read-only token URL input auto-selects on focus

## Modals & dialogs
- **FormModal (Add/Edit project)** — fields: `name` (text, required), `description` (textarea), `client_id` (select from clients, required), `estimated_value` "Buget (EUR)" (number, required, ≥0 validated), `deadline` (date, required), `stage_id` "Etapa producție" (select from productionBoard, optional), `priority` (select: low/medium/high). Status field intentionally hidden — derived from stage. Submit validates name/client/budget/deadline then create or update.
- **DocumentPreviewModal** (owned, in-file) — full-screen preview of an attached document. Inline iframe for PDF/text, `<img>` for images, download-fallback for other types (CAD/office/archive). Has header download link + close. Resolves URL via file://, `/api/files/`, or http(s).
- **PortalTokensButton modal** (owned, in-file) — manage client portal share links: list tokens with access count / created / last-accessed / revoked badge; create (optional `window.prompt` label), copy link, revoke, delete; read-only portal URL field per token.
- **confirmDialog** — used for delete project and for "Anulează" (cancel project) confirmations.

## Filters / search / sort / tabs / sub-views
- Search: single text input, client-side filter over name + client name (memoized `filtered`)
- Filtered count badge in list header
- No column sort, no tabs, no pagination, no status filter — single flat searchable list
- Master-detail split view (toggleable/collapsible left panel) is the primary sub-view mechanism
- KPI row (derived, not filters): Total proiecte, În execuție (active), Finalizate, Valoare activă (RON)

## Exports / print / file ops
- Document download: `downloadOneContractAttachment(id)` for contract-attachment rows
- DocumentPreviewModal: header "Descarcă" anchor + fallback "Descarcă fișierul" anchor (open in new tab / browser download)
- Portal link copy: `navigator.clipboard.writeText(portalUrl)` → toast
- No CSV/PDF export, no file upload on this page (uploads happen on the Documente / parts-tree pages)

## Keyboard shortcuts / realtime / polling
- List rows: Enter / Space select a project
- Comment textarea: Ctrl/Cmd+Enter submits comment
- Portal URL input: focus → select all text
- No polling, no websocket/realtime. Data loads on mount + on selection-change effects.
- Cross-page signal: reads `sessionStorage` focus keys (set by Kanban) on mount to auto-select / auto-open-edit. Pieces come from a centralized store elsewhere (local `_pieces` was removed).

## Sub-components owned
- `DocumentPreviewModal` — in-app document preview (PDF/image/text/fallback)
- `PortalTokensButton` — client-portal token management button + modal (calls list/create/revoke/delete portal token commands)
- `KpiMini` — compact glass KPI tile used in the KPI row
- `PiecesTrackingTable` (exported; **NOT rendered by this page** — dead within this page but exported for reuse), plus its helpers `PhaseCell`, `getProgressSummary`, and `PHASE_COLS` (14 production phase columns); expands a row to lazy `DxfViewer` for the piece source file
- `ProjectsEnhancements` (pages/projects/ProjectsEnhancements.tsx) — renders a single **Health score** card (`HealthScoreCard`) derived from deadline distance + status (blocat −25, la_cerere −8); uses `SectionCard` from `@/components/enhancements`. Gantt/milestones/risk/burndown/templates were intentionally removed.

## Access / permissions
- `useViewerMode('projects')` (`isViewer`) hides: "Proiect nou" button, per-row Edit, detail-header Edit, detail-header Delete, and the comment input box. Status-flag buttons and PortalTokensButton remain visible (note: status flags are not viewer-gated in the UI).
- Backend enforces its own per-command permission gate (`withAuthenticatedUser`/`withAdminUser`); the viewer gate is UX-only.
- `ViewerBanner page="projects"` displayed at top when in viewer mode.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the **master-detail** shape: collapsible left list (search + count + status badge + inline edit) and a scrollable right detail. This is a legitimate master-detail page — per CLAUDE.md, do NOT force `ListReport`/`mod-bento` here.
- Hero header with eyebrow "Proiecte & Contracte", primary action = "Proiect nou" (top-right), plus split-view toggle. Keep the 4-tile KPI row (Total / În execuție / Finalizate / Valoare activă RON) as airy glass tiles.
- Detail right pane = stacked sections: Header (title + status-flag actions + edit/portal/delete), Informații generale (2-col grid), Revizuire stadii (localStorage history + add-note), Arbore piese (clickable mini-preview → parts-tree), Documente atașate (list with preview/download), Comentarii (input + thread), then Health score card.
- Primary action is project creation; secondary actions cluster in the detail header. Use cards/sections (not a data table) for the detail; the only tabular element is the optional `PiecesTrackingTable` (currently unrendered — decide whether to reintroduce it as a "Piese" section using the centralized piece store rather than the dead local state).
- Preserve EUR-for-budget vs RON-for-active-value money distinction, and the EUR label on the budget form field.
- Preserve all client-side persistence quirks: split-view key, stage-revision localStorage, and the sessionStorage focus handoff from Kanban.
