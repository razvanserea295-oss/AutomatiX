# WarehousePage — function inventory
**Route:** warehouse · **Workspace:** procurement · **File:** pages/warehouse/WarehousePage.tsx · **Lines:** 524
**Props/contract:** `WarehousePage({ user: _user }: { user: User | null })` — receives the current `User` (or null), but the prop is destructured to `_user` and currently unused (no client-side role gating beyond the ViewerBanner). Default export.

## Backend functions (apiCommand) — ALL must survive
- `get_stock_movements` — loads the stock-movements list (`Movement[]`) for the Mișcări tab · triggered by `fetch()` on mount/refresh (line 53)
- `get_stock_reservations` — loads material reservations (`Reservation[]`) for the Rezervări tab + reserved-by-material calc · triggered by `fetch()` (line 54)
- `get_warehouse_locations` — loads warehouse locations (`Location[]`) for the Locații tab + movement-form location dropdown · triggered by `fetch()` (line 55)
- `create_stock_reservation` — creates a new reservation `{ project_id, node_id: 0, material_id, quantity_reserved }` · triggered by "Rezervare nouă" modal submit (`handleCreateReservation`, line 82)
- `create_warehouse_location` — creates a location `{ code (auto-slugged from name), name, location_type }` · triggered by "Locație nouă" modal submit (`handleCreateLocation`, line 114)
- `record_stock_movement` — records a stock movement `{ material_id, movement_type, quantity, location_id, project_id, notes }`; an OUT movement allocated to a project flows cost into project P&L (server creates a matching material_consumptions row) · triggered by "Mișcare nouă" modal submit (`handleRecordMovement`, line 125)
- `issue_stock_reservation` — releases/issues reserved stock `{ reservation_id, quantity }`, validated against remaining cap · triggered by per-row "Eliberează" action → issue FormModal submit (line 486)

Note: also calls non-apiCommand store actions that hit the backend indirectly — `fetchMaterialsStore(true)` (materialStore.fetchMaterials), `fetchProjects()` (projectStore.fetchProjects), `useMaterialStore.getState().fetchLocations(true)`, and `useDashboardStore.getState().invalidate()`.

## Data sources (stores / hooks)
- `useMaterialStore` — `materials` (stock table, low-stock calc, form dropdowns) and `fetchMaterials(true)` (force refresh); also `getState().fetchLocations(true)` after creating a location.
- `useProjectStore` — `projects` (full list, mapped to `{id,name}` via memo) and `fetchProjects()`; used for movement/reservation project selectors.
- `useDashboardStore` — `getState().invalidate()` after any stock-changing action so Dashboard "Stoc critic" widget refreshes.
- `useFormModal()` hook — controls the movement modal (`isOpen`, `openModal`, `closeModal`).
- Local React state: `tab`, `movements`, `reservations`, `locations`, `loading`, `resModalOpen`, `locModalOpen`, `issueTarget`.
- `toast` (toastStore) — success/error notifications.

## User actions & controls
- **Tabs** — AnimatedTabs switches between Stoc / Mișcări / Rezervări / Locații.
- **"Mișcare noua"** button (Mișcări tab) → opens movement FormModal (`openModal()`).
- **"Rezervare noua"** button (Rezervări tab) → opens reservation FormModal (`setResModalOpen(true)`).
- **"Locație noua"** button (Locații tab) → opens location FormModal (`setLocModalOpen(true)`).
- **"Eliberează"** per-row action (Rezervări tab, only when status `reserved`/`partially_issued`) → opens issue FormModal with remaining-qty cap; toasts error if nothing left to release.
- No inline edit, no drag-drop, no bulk actions, no context menu, no row click navigation, no delete actions.

## Modals & dialogs
- **Mișcare stoc nouă** (FormModal, `useFormModal`) — fields: material_id (select, required), movement_type (select: in/out/adjustment, required), quantity (number, required), location_id (select), project_id (select, "pentru cost flow"), notes (textarea). Submit → `record_stock_movement`.
- **Rezervare nouă** (FormModal) — fields: project_id (select, required), material_id (select, required), quantity_reserved (number, required). Submit → `create_stock_reservation` (sends node_id: 0).
- **Locație nouă** (FormModal) — fields: name (text, required, placeholder "Hala principala"), location_type (select: depozit/hala/exterior). `code` is auto-derived (slug/uppercase/fallback `LOC-<base36>`). Submit → `create_warehouse_location`.
- **Eliberează rezervare** (FormModal, driven by `issueTarget`) — single field quantity (number, required) with placeholder/hint showing remaining and inline `validate` (positive, ≤ remaining); initialData prefills full remaining. Submit → `issue_stock_reservation`; errors re-thrown so modal surfaces them inline instead of closing.

## Filters / search / sort / tabs / sub-views
- **Tabs / sub-views:** `stock`, `movements`, `reservations`, `locations` (AnimatedTabs in HeroHeader).
- **No search, no filter selects, no column sorting, no pagination.** Tables render the full list with `TableFiller` padding rows up to 18 for visual consistency.
- Stock tab columns: Material, Categorie, UM, Stoc, Rezervat, Disponibil (with inline progress bar), Minim, Status (Critic/OK badge). "Disponibil" = stock − outstanding reservations (`availableStock`).
- Reservations tab columns: Proiect, Nod, Material, Rezervat, Eliberat, Vechime (age in days), Status badge, Acțiuni.

## Exports / print / file ops
— none —

## Keyboard shortcuts / realtime / polling
- No keyboard shortcuts, no polling, no realtime subscriptions.
- Manual refresh only: `fetch()` runs on mount and is re-invoked after every create/issue action; also force-refreshes material store and invalidates dashboard store.

## Sub-components owned
- **`KpiMini`** (local, lines 508–523) — compact GlassCard metric tile (icon + label + MetricValue, optional `warn`/`format`). Used 4× in the KPI row: Total materiale, Rezervări active, Locații, Stoc critic.
- Derived helpers (not components): `reservedByMaterial` memo, `availableStock()`, `lowStock` filter, `activeReservations` count, and inline reservations IIFE computing `overdueReservations` (>7 days pending) for the red banner + per-row "⚠" age badge.
- Shared UI consumed (not owned): HeroHeader, GlassCard, MetricValue, AnimatedTabs, StatusBadge, TableFiller, EmptyState, Page, FormModal, ViewerBanner.

## Access / permissions
- `<ViewerBanner page="warehouse" />` renders the viewer/read-only banner for this page.
- No explicit client-side role gating in the component (`user` prop unused as `_user`). Actual write protection is enforced server-side per command (record/create/issue handlers). Viewer-only users see the banner; mutation enforcement is on the backend.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the **HeroHeader** (eyebrow "Aprovizionare", warehouse icon, title "Depozit", subtitle) with the **4-tile KPI strip** (Total materiale, Rezervări active, Locații, Stoc critic — critic tile warns red when >0). This is airy and on-brand; reuse the featured-KPI direction.
- Four sub-views map naturally to **segmented tabs**; each is a **table** (data is tabular and dense — keep tables over cards).
- Surface the two **alert banners** prominently above their tables: low-stock banner (Stoc tab, materials below min) and overdue-reservations banner (Rezervări tab, pending >7 days). These are high-value warehouse-manager signals.
- Primary action is **contextual per tab**: "Mișcare noua" / "Rezervare noua" / "Locație noua" live in the section header on the right; Stoc tab has no create action (materials come from inventory). Keep this contextual placement.
- Preserve the **"Disponibil = Stoc − Rezervat"** computation with the inline color-coded capacity bar (red ≤ min, amber ≤ 1.5×min, green above) — it's the page's signature stock-health visualization.
- Preserve the **age/overdue** treatment on reservations (days-outstanding column + red >7d badge) and the themed "Eliberează" flow with the validated quantity modal (replaced an old window.prompt — do NOT regress to a native prompt).
