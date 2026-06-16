# MaintenancePage — function inventory
**Route:** maintenance · **Workspace:** production · **File:** pages/maintenance/MaintenancePage.tsx · **Lines:** 802
**Props/contract:** `MaintenancePage(_props: { user: User | null })` — receives the current user but does NOT use it (prefixed `_props`). No role gating in the component itself.

## Backend functions (apiCommand) — ALL must survive
- `list_piece_services` — loads all service rows for the selected project (`{ project_id }`); returns `PieceServiceRow[]` · triggered by project-select change / `reload()` on mount (in `Promise.all` with `fetchPieces`).
- `delete_piece_service` — deletes one service row (`{ id }`) · triggered by row Trash2 button (after `confirmDialog`). Follows with `useProjectStore.refreshAll()` + `useDashboardStore.invalidate()`.
- `get_users` — loads users for the technician dropdown (returns `{ id, full_name, role_name? }[]`) · triggered on `ServiceForm` mount.
- `update_piece_service` — updates an existing service (`{ id, ...payload }`, with photo-delta semantics: omit=no change, `''`=clear, dataURL=replace) · triggered by ServiceForm submit when `editing` is set.
- `create_piece_service` — creates a new service (`payload`; photos only sent if picked) · triggered by ServiceForm submit when not editing.

Note: pieces are loaded via the piece store, not a direct apiCommand here. Store-level commands invoked indirectly: `usePieceStore.fetchPieces` (project pieces), `useProjectStore.fetchProjects`/`refreshAll`, `useDashboardStore.invalidate`.

## Data sources (stores / hooks)
- `useMoney()` (settingsStore) — currency formatter; all costs rendered via `money(n, 'RON')` (forced RON regardless of global currency).
- `useProjectStore` — `projects` list, `fetchProjects()` (mount), `refreshAll()` (after save/delete to update P&L).
- `usePieceStore` — `fetchPieces(projectId, true)` (loads pieces for project); `usePiecesForProject(selectedProject)` selector for the piece list.
- `useDashboardStore` — `invalidate()` after save/delete (service costs feed Dashboard KPIs).
- Local state: `selectedProject`, `services` (PieceServiceRow[]), `loading`, `editing`, `showForm`, `previewImage`.

## User actions & controls
- **Project selector** (header select) — picks the active project; triggers `reload()`. Disabled actions until a project with pieces is chosen.
- **"Servisare nouă"** button (HeroHeader action) — opens ServiceForm in create mode. Disabled when no project selected OR project has 0 pieces (with explanatory tooltip).
- **"Adaugă prima servisare"** button — empty-state shortcut to create (shown only when pieces exist).
- **Row Edit (Pencil)** — opens ServiceForm in edit mode for that row.
- **Row Delete (Trash2)** — confirm dialog then `delete_piece_service`, reload, refresh project/dashboard stores.
- **Before/After thumbnail click** (list card) — opens full-size photo lightbox (`previewImage`).
- **Lightbox** — click backdrop or X button to close; inner image click stops propagation.
- ServiceForm controls (see Modals below).

## Modals & dialogs
- **ServiceForm** (slide-in right panel, `w-560px`, `animate-slide-in-right`) — create/edit a service. Fields:
  - **Piesa*** — searchable dropdown over project pieces (filter by name / original_name / category, capped 50; outside-click closes). Required.
  - **Titlu*** — text, required.
  - **Defect** — textarea.
  - **Lucrare efectuată** (service_description) — textarea.
  - **Foto BEFORE / AFTER** — two PhotoSlot tiles (file upload, compress, preview, replace, remove).
  - **Data** — date (defaults today).
  - **Status** — select: in_lucru / finalizat / anulat.
  - **Manoperă (RON)** — number (labor_cost).
  - **Piese (RON)** — number (parts_cost).
  - **Tehnician** — select from `get_users` (or "— Neasignat —").
  - **Total** — computed read-only (labor + parts).
  - **Note** — textarea.
  - Footer: **Anulează** (close) · **Salvează/Creează** (submit, disabled until pieceId + title set).
- **Photo lightbox** — full-screen overlay preview of any before/after image (shared by list cards and form).
- **confirmDialog** — delete-confirmation (danger variant) from `@/components/ConfirmDialog`.

## Filters / search / sort / tabs / sub-views
- **Project filter** — top select; the only top-level filter. No search box, no sort, no tabs, no pagination on the service list (rendered in raw insertion order from backend).
- **Piece search** — in-form typeahead over project pieces (client-side filter, 50-item cap).
- KPI summary row (Servisări / Piese / Cost total / Proiecte) — display only, not interactive.

## Exports / print / file ops
- **File upload** — before/after photo picker (`<input type=file accept=image/* capture=environment>`), client-side compressed to JPEG dataURL (max edge 1024px, q=0.7, ~<250KB) via `compressImage()`, stored inline in SQLite TEXT.
- No PDF / CSV / print / clipboard export.

## Keyboard shortcuts / realtime / polling
- No keyboard shortcuts (lightbox closes only via click).
- No polling / websockets / realtime. Data refreshes manually via `reload()` after create/update/delete and on project change.
- Outside-click listener (`mousedown`) to close the in-form piece dropdown.

## Sub-components owned
- **ServiceForm** — create/edit slide-in panel with piece typeahead, technician load, photo deltas, store refresh on save.
- **PhotoSlot** — single before/after upload tile (empty → "Adaugă foto" dashed button; filled → thumbnail with Camera-replace + Trash-remove overlay + click-to-preview). Supports mobile camera capture.
- **KpiMini** — compact glassy metric tile (icon + label + MetricValue) for the KPI row.
- **compressImage()** — module-level helper (canvas resize → JPEG dataURL).
- Constants: `STATUS_BADGE` (status→tone/label map), `STATUS_OPTIONS` (form select options), `PieceServiceRow` interface.

## Access / permissions
- No client-side role gating in this component (`user` prop ignored). Page-level gating handled upstream by `src/lib/access.ts` / router; per-command auth enforced server-side (`withAuthenticatedUser`). Technician list comes from `get_users`. All users reaching the page get full CRUD on services.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the **master context = project selector** as a prominent sticky control (header or left rail); everything keys off it. Preserve disabled-state tooltips (no project / no pieces).
- **KPI strip** (Servisări, Piese, Cost total RON, Proiecte) stays as airy metric cards at top.
- Service list → switch from dense bordered rows to a clean **card or table** with: title + StatusBadge, piece/category/date/technician meta, defect & lucrare snippets, before/after thumbnails, right-aligned cost breakdown (total + manoperă/piese), row edit/delete actions. Tabular cost alignment matters.
- **ServiceForm** → keep as right-side slide-in sheet (or modal); sections: Piesă (typeahead) → Titlu → Defect/Lucrare → Before/After photos → Data/Status/Costs → Tehnician/Total → Note. Total auto-computes. Primary action = Creează/Salvează; preserve photo-delta semantics (null=keep, ''=clear, dataURL=set) on update.
- **Primary action** = "Servisare nouă". Empty-state CTA for first service.
- Preserve: forced RON formatting, mobile camera capture, image compression, full-size lightbox, and store-refresh side-effects (project P&L + Dashboard KPIs) after every mutation — these are load-bearing.
- Consider adding sort/filter/search on the service list and pagination for large histories (currently absent) as net-new affordances, without removing any existing capability.
