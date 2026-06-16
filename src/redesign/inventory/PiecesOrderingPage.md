# PiecesOrderingPage — function inventory
**Route:** parts-ordering · **Workspace:** engineering · **File:** pages/PiecesOrderingPage.tsx · **Lines:** 531
**Props/contract:** `export default function PiecesOrderingPage()` — no props; self-contained page component. Reachable from both Engineering ("De comandat" tab) and Procurement workspaces (shared page, no separate instance).

## Backend functions (apiCommand) — ALL must survive
### PiecesOrderingPage.tsx
- `get_piece_orders` — loads all order rows (OrderRow[]); accepts `{ project_id?, supplier_code? }` (omitted when filter = "all") · triggered by `refresh()` on mount, on filter change, and "Actualizează" button.
- `get_supplier_codes` — loads supplier code catalog for badge colors + code filter dropdown; called with `{ include_inactive: false }` · triggered by `refresh()`.
- `update_piece_order_status` — advances a card to next status `{ id, status }` (requested→ordered→arrived→installed, or cancelled→requested re-open) · triggered by per-card "Confirmă comandă / Confirmă sosire / Marchează montat" and "re-deschide" buttons.
- `update_piece_order_notes` — saves/clears a card note `{ id, notes }` · triggered by inline note editor "Salvează"; server enforces requester-or-admin permission.
- `cancel_piece_order` — cancels/deletes a request `{ id }` · triggered by per-card X (Anulează) button after confirm() dialog.

### SupplierCodesModal.tsx (sub-component; type `SupplierCode` is imported by the page)
- `get_supplier_codes` — loads code list `{ include_inactive: isAdmin }` · triggered on modal open.
- `create_supplier_code` — creates a new code `{ code, label, description, color }` · triggered by inline editor "Adaugă" (admin only).
- `update_supplier_code` — updates a code `{ id, code, label, description, color }` · triggered by inline editor "Salvează" when editing (admin only).
- `delete_supplier_code` — soft-deactivates a code `{ id }` · triggered by per-row Trash2 button after confirm() (admin only).

## Data sources (stores / hooks)
- `useProjectStore` — `projects` (project filter dropdown options) + `fetchProjects()` (called once on mount).
- `useAuthStore` — `user` (`me`): `me.id` for note-edit permission, `me.role_name` for admin gate (`isAdmin`).
- Local `useState`: `rows` (OrderRow[]), `codes` (SupplierCode[]), `loading`, `projectFilter`, `codeFilter`, `busy` (id of row being mutated).
- `useMemo` `byStatus` — buckets rows into the 5 status columns (requested/ordered/arrived/installed/cancelled) for KPIs + kanban.

## User actions & controls
- **Project filter select** — filter rows by project (all + each project); refetches.
- **Supplier-code filter select** — filter rows by supplier code (all + each code); refetches.
- **"Actualizează" button** — manual refresh.
- **Per-card advance button** — moves card forward one status (label/target depends on current status: requested→ordered "Confirmă comandă", ordered→arrived "Confirmă sosire", arrived→installed "Marchează montat"). Disabled while busy; shows spinner.
- **Per-card X (Anulează) button** — cancels/deletes the request (confirm dialog; message differs for requested vs ordered). Disabled while busy.
- **"re-deschide" link** (cancelled cards only) — re-opens a cancelled order back to `requested` via update_piece_order_status.
- **Inline note editor** — per card: "+ Adaugă notă" (when empty) or pencil (when present) opens a textarea (maxLength 500, 2 rows, autofocus) with "Salvează" / "Renunță". Only visible/editable when `canEditNotes` (admin OR original requester). On save error, editor stays open with buffer preserved.
- **(installed/cancelled cards)** — no advance/cancel actions; show "Finalizat" / "Anulat" terminal state.

## Modals & dialogs
- **SupplierCodesModal** (`src/pages/parts-tree/SupplierCodesModal.tsx`) — supplier-code legend + admin CRUD. NOTE: imported here only for its `SupplierCode` TYPE; the modal itself is *opened from the parts-tree toolbar ("Coduri" button), not from this page*. Documented because it owns the supplier-code commands and shares the catalog this page renders. Fields edited: code (prefix, 2–10 letters, uppercased), color (color picker, default #f97316), label (required), description (optional). Admin sees add/edit/deactivate; non-admin sees read-only legend.
- **Native `confirm()` dialogs** — cancel/delete request (page) and deactivate code (modal). No custom modal component.

## Filters / search / sort / tabs / sub-views
- **Filters:** project select + supplier-code select (server-side, passed to get_piece_orders).
- **Sub-views / "tabs":** 4 kanban columns by status — Cerute (requested), Comandate (ordered), Sosite (arrived), Montate (installed). `cancelled` is a 5th internal bucket (used by KPIs/byStatus; cancelled cards render via re-open path but have no dedicated column).
- **Sort:** none explicit (rows render in server order within each column).
- **Search:** none (no text search box).
- **Pagination:** none — all rows loaded; each column scrolls independently (`flex-1 overflow-y-auto`).
- **KPI row:** 4 `KpiMini` tiles counting requested/ordered/arrived/installed (requested tile shows `warn` when > 0).

## Exports / print / file ops
- — none — (no export, print, PDF, upload, download, or clipboard).

## Keyboard shortcuts / realtime / polling
- — none — (no keyboard shortcuts, no realtime subscription, no polling/auto-refresh; refresh is manual or triggered by filter change/mount).

## Sub-components owned
- **`KpiMini`** (in-file) — compact GlassCard metric tile (icon + label + MetricValue, optional warn).
- **`Card`** (in-file) — kanban card: supplier-code badge (colored), piece name, quantity ×N, SLDASM/SLDPRT StatusBadge (assembly/part via `fileKind`), project name, source file name, three-state inline notes editor, timeline (requested/ordered/arrived/installed timestamps via `timeAgo` + actor names + PO #), advance/cancel actions, cancelled banner with re-open.
- **Helpers (in-file):** `fileKind()` (assembly/part/null from extension), `timeAgo()` (ro-RO relative time), `COLUMNS` metadata, `OrderRow`/`Status` types.
- **`SupplierCodesModal`** — type-only import here; full component lives in parts-tree (owns supplier-code CRUD commands).

## Access / permissions
- **Notes editing** gated by `canEditNotes = isAdmin || row.requested_by_user_id === me?.id` (server also enforces requester-or-admin on update_piece_order_notes).
- **Status advance / cancel / re-open** — available to any user viewing the page (no client gate); server-side per-command auth applies.
- **SupplierCodesModal CRUD** — admin-only (add/edit/deactivate hidden for non-admins; read-only legend otherwise); `isAdmin` derived from `role_name === 'admin'`.
- No explicit viewer-only / role page-gate inside this file beyond the above.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the **kanban-by-status** as the core: 4 columns (Cerute / Comandate / Sosite / Montate) with status-accented top stripes; it maps 1:1 to the workflow and is the page's identity. Cancelled is a terminal state surfaced inline, not a column.
- **Header zone:** HeroHeader (eyebrow "Proiectare", Truck icon, title "Piese de comandat", subtitle workflow line) + airy 4-tile KPI strip (reuse existing GlassCard/MetricValue; warn on Cerute > 0).
- **Filter bar:** keep project + supplier-code selects (use centralized `filterControls`/`filterSelectCls`) + manual refresh + count chip. Could add a text search over piece/project name (currently absent) as an enhancement, but do not remove the two server-side filters.
- **Primary action per card** = the single forward-advance button (large, accent); secondary = cancel (icon, low-emphasis); notes = quiet inline affordance. Preserve the three-state note UX and the requester/admin gate.
- **Table vs cards:** cards are the right primitive here (each card carries badge + assembly/part chip + timeline + actions); a flat table would lose the kanban affordance. Keep cards, keep per-column independent scroll, keep the `!overflow-hidden` shell pattern so column scroll works.
- Preserve all 9 apiCommand calls (5 on the page, 4 in the supplier-codes modal). The supplier-code color legend must stay the source of badge colors (`codeColor`). Empty-state hint about the `CMO_` filename prefix → parts-ordering pipeline should survive (it's the only discoverability cue for how rows get here).
