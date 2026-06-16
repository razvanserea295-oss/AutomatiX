# LibrariesPage — function inventory
**Route:** libraries · **Workspace:** engineering · **File:** pages/libraries/LibrariesPage.tsx · **Lines:** 275
**Props/contract:** `LibrariesPage({ user: _user }: { user: User | null })` — receives the current `User` (currently unused, prefixed `_user`; no role gating in the page).

## Backend functions (apiCommand) — ALL must survive
- `get_standard_parts` — loads the standard-parts catalog (`StdPart[]`) · triggered on mount via `fetch()` (and after every mutation)
- `get_custom_parts` — loads the custom-parts catalog (`CustPart[]`) · triggered on mount via `fetch()` (and after every mutation)
- `create_standard_part` — creates a new standard part from form data · triggered by "Adaugă piesa" button → FormModal submit (standard tab, create mode)
- `create_custom_part` — creates a new custom part from form data · triggered by "Adaugă piesa" button → FormModal submit (custom tab, create mode)
- `update_standard_part` — updates a standard part (`{ id, ...data }`) · triggered by row Pencil (edit) action → FormModal submit (standard tab, edit mode)
- `update_custom_part` — updates a custom part (`{ id, ...data }`) · triggered by row Pencil (edit) action → FormModal submit (custom tab, edit mode)
- `delete_standard_part` — deletes a standard part (`{ id }`) · triggered by row Trash2 action (standard) after confirm dialog
- `delete_custom_part` — deletes a custom part (`{ id }`) · triggered by row Trash2 action (custom) after confirm dialog
- `promote_to_standard` — promotes a custom part to standard (`{ custom_id: id }`) · triggered by row ArrowUpCircle action (custom, only when not yet promoted) after confirm dialog

> Note: `LibrariesEnhancements.tsx` makes NO `apiCommand` calls — all its features are localStorage-only or stubs/toasts.

## Data sources (stores / hooks)
- `apiCommand` (`@/api/commands`) — direct IPC/HTTP calls; data held in local `useState` (`stdParts`, `custParts`, `loading`). No dedicated Zustand store for parts.
- `useMoney()` (`@/store/settingsStore`) — currency formatter for the `unit_cost` column (formats as `'RON'`, 2 decimals).
- `useFormModal()` (`@/hooks/useFormModal`) — modal open/close + edit-item state (`isOpen`, `editingItem`, `isEditing`, `openModal`, `closeModal`).
- `toast` (`@/store/toastStore`) — success/error/info notifications.
- `confirmDialog` (`@/components/ConfirmDialog`) — promise-based confirm for promote/delete.
- `stats` (`useMemo`) — derived KPIs (standard count, custom count, promoted count, distinct categories) computed client-side from loaded parts (no extra IPC).
- Enhancements sub-component uses `useLocalStorage` (`@/components/enhancements`) for two keys: `promix_libraries_tags_v1`, `promix_libraries_categories_v1`.

## User actions & controls
- **Tab switch** — AnimatedTabs between "Piese standard" / "Piese custom" (`setTab`).
- **Adaugă piesa** (header Button) — opens FormModal in create mode for the active tab.
- **Row: Edit (Pencil)** — standard & custom rows; opens FormModal in edit mode (`openModal(p)`).
- **Row: Delete (Trash2)** — standard & custom rows; confirm dialog (danger) → delete command → success toast → refetch.
- **Row: Promote (ArrowUpCircle)** — custom rows only, hidden once `promoted_to_standard_id` is set; confirm dialog → `promote_to_standard` → refetch.
- **Search** — ListReport built-in search box per tab (see Filters).
- **Column sorting** — ListReport sortable columns (see Filters).
- **Enhancements (LibrariesEnhancements):**
  - Add tag: pick component (select) + type tag text → Plus button appends to localStorage list.
  - Remove tag: Trash2 on each tag chip.
  - Add category: name input + parent select → Plus appends to localStorage hierarchy.
  - Remove category: Trash2 per category row.
  - CAD import: "Import bibliotecă externă" button → info toast only (stub, points user to Setări → Integrări).
  - Bulk export: ExportMenu actions (export rows; see Exports).

## Modals & dialogs
- **FormModal** (`@/components/FormModal`) — single shared create/edit modal; title & fields swap by active tab and edit/create mode.
  - **Standard fields:** `code` (Cod piesa, text, required), `name` (Nume, text, required), `category` (Categorie, text, required), `unit` (UM, text), `unit_cost` (Cost unitar, number), `lead_time_days` (Lead time zile, number).
  - **Custom fields:** `code` (Cod piesa, text, required), `name` (Nume, text, required), `category` (Categorie, text, required).
  - Submit label: "Actualizează" (edit) / "Adaugă" (create).
- **ConfirmDialog** (via `confirmDialog`):
  - Promote: "Promoveaza piesa la standard?" (non-danger).
  - Delete standard: "Șterge piesa standard?" (danger).
  - Delete custom: "Șterge piesa custom?" (danger).

## Filters / search / sort / tabs / sub-views
- **Tabs:** `standard` / `custom` (AnimatedTabs in glass toolbar).
- **Search (ListReport):** standard searchKeys = `code, name, category, supplier_name` (placeholder "Caută piesă standard..."); custom searchKeys = `code, name, category, originating_project_name` (placeholder "Caută piesă custom...").
- **Sort (ListReport sortKey columns):** standard sortable on `code, name, category, unit_cost, lead_time_days`; custom sortable on `code, name, category`.
- **Pagination:** none explicit (ListReport default; embedded + headerless).
- **Standard columns:** Cod (mono accent), Nume, Categorie, UM, Cost (money RON, right-aligned, "—" if ≤0), Lead time (`Nz` or "—"), Furnizor, Acțiuni.
- **Custom columns:** Cod, Nume, Categorie, Proiect sursa, Status (StatusBadge "Promovat"/"Custom"), Acțiuni.
- **Empty states:** "Nicio piesa standard." / "Nicio piesa custom."

## Exports / print / file ops
- **Bulk export** (Enhancements → BulkExportCard) — `ExportMenu` over combined std+cust items, columns `id, name, category, type`, filename "biblioteca". Exports the merged library list (CSV/XLSX per ExportMenu capability).
- **CAD import** — stub only (toast.info), no real file upload.
- No print / PDF / clipboard on this page.

## Keyboard shortcuts / realtime / polling
- — none — (no shortcuts, no polling; data refreshed only after mutations via `fetch()`).

## Sub-components owned
- `KpiMini` (in LibrariesPage.tsx) — compact glass KPI tile (icon + label + MetricValue).
- `LibrariesEnhancements` (default export of LibrariesEnhancements.tsx) — wraps:
  - `TagsCard` — multi-dimensional tags (localStorage `promix_libraries_tags_v1`).
  - `DragHintCard` — drag-from-library hint (static text, no logic).
  - `UsageStatsCard` — top-10 most-used by `usage_count` (always 0 currently; no backend field supplied).
  - `CadImportCard` — CAD import stub (toast).
  - `CategoryHierarchyCard` — category hierarchy w/ parent (localStorage `promix_libraries_categories_v1`).
  - `VersioningCard` — versioning placeholder (text only; "cere activare backend").
  - `BulkExportCard` — ExportMenu wrapper.
- Note: Enhancements receives a merged item list where custom ids are offset by +100000 to avoid key collision with standard ids.

## Access / permissions
- No client-side role gating inside the page; `user` prop is unused (`_user`). Page access controlled at the route/shell level (`src/lib/access.ts`).
- Server enforces auth per command (`withAuthenticatedUser`/`withAdminUser`); destructive/create/promote commands are gated server-side.

## Rebuild notes (Modern-SaaS layout intent)
- **Header:** keep HeroHeader (eyebrow "Proiectare", Library icon, title "Biblioteci piese", subtitle). Keep the 4-KPI row (Piese standard, Piese custom, Promovate, Categorii) as airy glass tiles — all derived client-side, no new IPC.
- **Primary action:** single "Adaugă piesa" button, contextual to the active tab; place top-right of the tab toolbar.
- **Main body:** two-tab list (Standard / Custom) — a sortable, searchable **table** is the right pattern (catalog data, many columns). Keep ListReport's search + sort + empty states. Standard table is wider (cost/lead-time/supplier); custom is narrower with a Status badge + promote action.
- **Row actions:** keep inline Edit / Delete on both; keep Promote on custom (hidden when already promoted). Keep confirm dialogs for promote + both deletes; keep success toasts.
- **Enhancements panel:** the "Tools avansate" section is mostly localStorage scratch + stubs (tags, category hierarchy, usage stats, CAD-import stub, versioning placeholder, bulk export). For a clean rebuild, consider collapsing these into a secondary "Advanced" drawer/accordion below the table so they don't compete with the core catalog. Preserve the **bulk export** (real) and the two **localStorage features** (tags + category hierarchy) so nothing is removed; the CAD-import/usage/versioning cards are non-functional placeholders that can be visually de-emphasized but must remain.
- **Currency:** `unit_cost` rendered via `useMoney(..., 'RON', 2)` — keep RON formatting and the "—" zero-fallback.
