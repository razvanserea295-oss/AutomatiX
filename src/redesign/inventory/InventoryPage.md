# InventoryPage — function inventory
**Route:** materials · **Workspace:** procurement · **File:** pages/InventoryPage.tsx · **Lines:** 351
**Props/contract:** `InventoryPage({ user }: { user: User | null })` — the `user` prop is received but unused (destructured as `_user`); actual access gating comes from the `useViewerMode('materials')` hook, not the prop.

## Backend functions (apiCommand) — ALL must survive
- `get_material_consumptions` — loads the consumption history list rendered in the "Istoric consumuri" table · triggered directly in the page's `useEffect` on mount (the only apiCommand called inline in the page file).
- `get_materials` — loads/normalizes the full materials catalog (the main table, KPIs, total value, reorder suggestions) · triggered via `useMaterialStore.fetchMaterials()` on mount and re-fetched (force) after every create/update.
- `get_warehouse_locations` — loads warehouse locations to populate the "Locație" select in the add/edit form · triggered via `useMaterialStore.fetchLocations()` on mount.
- `create_material` — inserts a new material · triggered by submitting the FormModal in "Adaugă" mode (`createMaterialStore` → `useMaterialStore.createMaterial`).
- `update_material` — updates an existing material · triggered by submitting the FormModal in "Editează" mode (`updateMaterialStore` → `useMaterialStore.updateMaterial`).
- `delete_material` — deletes a material · triggered by the per-row Trash2 button (`handleDelete`) and by the bulk "Șterge" action (loops over selected rows); also `useMaterialStore.deleteMaterial`.

(Note: `get_materials`, `get_warehouse_locations`, `create_material`, `update_material`, `delete_material` live in `src/store/materialStore.ts` but are invoked exclusively on this page's behalf; all 6 commands above must survive the rebuild.)

## Data sources (stores / hooks)
- `useMaterialStore` (Zustand, `src/store/materialStore.ts`) — `materials`, `locations`, `loading`, `fetchMaterials`, `fetchLocations`, `createMaterial`, `updateMaterial`, `deleteMaterial`. Normalizes `quantity`/`stock` and `minimum_threshold`/`min_stock` dual field names; calls `syncDashboard()` (dashboard store invalidate) after each mutation.
- `useSettingsStore` — `eurToRonRate` (folds EUR-priced materials into RON for total value) and `load` (loads settings on mount).
- `useMoney()` (from settingsStore) — currency formatter used for the "Valoare inventar" KPI (forced to 'RON').
- `useViewerMode('materials')` — boolean viewer/read-only gate.
- `useFormModal()` — modal open/close + editing-item state machine (`isOpen`, `editingItem`, `openModal`, `closeModal`, `isEditing`).
- `useSort<Material>(...)` — client-side sort, default `{ key: 'name', dir: 'asc' }`.
- `useBulkSelection<Material>(sortedMaterials)` — selection set for bulk actions.
- Local `useState`: `consumptions` (array) + `consumptionsLoading` (bool) for the consumption-history table.
- `toast` (toastStore) for success/error notifications; `confirmDialog` for delete confirmation.

## User actions & controls
- **Adaugă material** (HeroHeader action button) — opens the FormModal in create mode. Hidden when `isViewer`.
- **Row: Edit** (Pencil button) — opens FormModal pre-filled with the row (`openModal(m)`). Hidden when `isViewer`. `stopPropagation` so row-click doesn't interfere.
- **Row: Delete** (Trash2 button) — `handleDelete(id)` with a danger confirm dialog, then toast. Hidden when `isViewer`.
- **Bulk select** — per-row checkbox + select-all header (ListReport `selection` prop wired to `useBulkSelection`). Disabled (selection prop undefined) when `isViewer`.
- **Bulk action: Șterge** — deletes every selected material in a loop, counts successes, toasts `"{n} materiale șterse"`. Confirm message "Confirmi ștergerea?". Shown via `BulkActionBar`; hidden when `isViewer`.
- **Column sort** — clicking sortable column headers (name, category, unit, quantity, minimum_threshold, supplier_name, status).
- **Search box** — ListReport search across `name`, `category`, `supplier_name`.
- **Form submit** — `handleSubmit` injects `status: 'In stoc'` then create or update depending on `isEditing`.

## Modals & dialogs
- **FormModal (Adaugă / Editează material)** — title toggles "Adaugă material" / "Editează material", submit label "Adaugă" / "Actualizează". Fields:
  - `name` (text, required) — Denumire
  - `category` (text, required) — Categorie
  - `unit` (text, required) — Unitate măsură
  - `stock` (number, required) — Cantitate
  - `min_stock` (number, required) — Prag minim
  - `unit_cost` (number, required) — Cost unitar
  - `currency` (select RON/EUR, optional) — Monedă
  - `supplier` (text, optional) — Furnizor
  - `location` (select when warehouse locations exist, else free-text) — Locație. Select options labeled `"{name} ({code})"`.
  - Note: the legacy `code` field was removed in the Q2 pass (backend still tolerates the column).
- **ConfirmDialog (delete)** — "Șterge materialul?" / "Acțiunea nu poate fi anulată." danger, on single-row delete.
- **Bulk confirm** — inline confirmMessage "Confirmi ștergerea?" on the bulk delete action.

## Filters / search / sort / tabs / sub-views
- **Search:** ListReport text search over name / category / supplier_name.
- **Sort:** sortable columns (name default asc) via `useSort`; quantity & minimum_threshold sort on the normalized dual fields.
- **No tabs, no pagination, no status filter selects.** Consumption table is capped at the first 30 rows (`consumptions.slice(0, 30)`).
- **Sub-views/sections (always visible, no toggles):** KPI row → Materiale table → Comenzi sugerate (conditional) → Istoric consumuri table.
- **Reorder suggestions** = materials where `min > 0 && qty <= min * 1.5`; section renders only when non-empty.

## Exports / print / file ops
— none — (no PDF, print, CSV, upload, download, or clipboard on this page).

## Keyboard shortcuts / realtime / polling
- No page-local keyboard shortcuts (global Ctrl+K command palette lives in the shell, not here).
- No polling / websockets. Data loads once on mount; the materials list is re-fetched (force) only after a mutation. Consumption history is fetched once and never refreshed.
- Mutations call `syncDashboard()` to invalidate the dashboard store (cross-page freshness, not realtime).

## Sub-components owned
- **`KpiMini`** — local function component (in-file) rendering a compact glassy metric tile (icon + label + MetricValue, optional `warn` and `format`).
- **`isLowStock` / `isOutOfStock`** — module-level helpers classifying status by string + qty vs threshold.
- **`getRowBorderClass`** — adds a left border (red = out of stock, amber = low stock) per row.
- Reorder-suggestions list block and consumption-history table are inline JSX (not extracted components).
- Reused UI: `HeroHeader`, `GlassCard`, `MetricValue`, `Button`, `Page`, `ListReport`, `StatusBadge`, `FormModal`, `BulkActionBar`, `ViewerBanner`, `MetricValue`. `materialStatus` resolver from `statusTokens`.

## Access / permissions
- `useViewerMode('materials')` → `isViewer`. When true: `<ViewerBanner page="materials" />` shown; "Adaugă material" hidden; per-row Edit/Delete actions column omitted; bulk selection disabled (selection prop undefined); `BulkActionBar` not rendered. Viewer can read the catalog, KPIs, reorder suggestions, and consumption history but cannot mutate.
- Server enforces per-command auth separately (not visible in this file).

## Rebuild notes (Modern-SaaS layout intent)
Keep the vertical stack, airy: **(1) Hero header** — eyebrow "Depozit", title "Inventar", subtitle, single primary action "Adaugă material" (top-right, viewer-hidden). **(2) KPI strip** — 4 tiles: Total articole, Stoc redus (warn), Stoc epuizat (warn), Valoare inventar (money RON). **(3) Materiale table** as the hero surface — keep it a table (catalog is column-dense: name/category/unit/qty/min/supplier/status/actions), with search, sortable headers, row checkboxes, left-edge red/amber stock indicator, and a hover-revealed row action cluster (edit/delete). **(4) Comenzi sugerate** — amber-tinted callout card listing under-threshold materials (qty ≤ 1.5× min); show only when non-empty. **(5) Istoric consumuri** — secondary table (Data / Material / Proiect / Cantitate / Utilizator), capped ~30 rows, its own loading state. Primary action = add material; bulk delete bar floats on selection. Preserve all dual-field reads (quantity/stock, minimum_threshold/min_stock) and EUR→RON folding for total value. Table over cards throughout — this is data-dense procurement, not a gallery.
