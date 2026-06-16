# StationDetailPage — function inventory
**Route:** stations/:id · **Workspace:** production · **File:** pages/stations/StationDetailPage.tsx · **Lines:** 862
**Props/contract:** `StationDetailPage({ user, stationId, onBack }: { user: AppUser | null; stationId: number; onBack: () => void })` — `user` is accepted but currently unused; `stationId` is the numeric id from the route; `onBack` navigates back to the stations list.

## Backend functions (apiCommand) — ALL must survive
- `get_station_by_id` — loads the station header detail (`{ id }`) · triggered on mount via `fetchStation` + window focus/visibility refresh
- `get_station_interventions` — loads interventions list for the station (`{ station_id }`) · triggered when `interventions` tab is active / on focus
- `get_station_maintenance_plans` — loads maintenance plans (`{ station_id }`) · triggered when `maintenance` tab active / on focus / after create/delete
- `get_station_parts` — loads parts requests (`{ station_id }`) · triggered when `parts` tab active / on focus / after create/delete
- `get_station_change_requests` — loads change requests (`{ station_id }`) · triggered when `changes` tab active / on focus / after create/delete
- `get_station_activity` — loads activity/audit log (`{ station_id }`) · triggered when `activity` tab active / on focus
- `create_intervention` — creates a service intervention (`{ station_id, intervention_type, reason, problem_description, is_urgent }`) · triggered by "Adaugă interventie" FormModal submit (Interventions tab)
- `create_station_maintenance_plan` — creates a maintenance plan (`{ request: { station_id, maintenance_type, periodicity_days, next_execution_date, notes } }`) · triggered by inline "Plan nou" form Salvează (Maintenance tab)
- `delete_station_maintenance_plan` — deletes a maintenance plan (`{ id }`) · triggered by row "Șterge" (Maintenance tab) after confirm
- `create_station_parts_request` — creates a parts request (`{ request: { station_id, part_name, part_code, quantity, supplier, estimated_cost, reason } }`) · triggered by inline "Cerere noua" form Salvează (Parts tab)
- `delete_station_parts_request` — deletes a parts request (`{ id }`) · triggered by row "Șterge" (Parts tab) after confirm
- `create_station_change_request` — creates a change request (`{ request: { station_id, description, priority, estimated_cost, estimated_deadline, requested_by_name } }`) · triggered by inline "Cerere noua" form Salvează (Changes tab)
- `delete_station_change_request` — deletes a change request (`{ id }`) · triggered by row/card "Șterge cererea" (Changes tab) after confirm

## Data sources (stores / hooks)
- `apiCommand` (`@/api/commands`) — all data IO; no Zustand store for this page.
- Local `useState` per dataset: `station`, `interventions`, `maintenance`, `parts`, `changes`, `activityLog`, plus `activeTab`, `loading`, `error`.
- `useFormModal()` (`@/hooks/useFormModal`) — controls the "Adaugă interventie" FormModal (`interventionModal`).
- `useCallback` fetchers `fetchStation` and `fetchTabData(tab)`; `useEffect` on mount, on tab change, and on focus/visibilitychange.
- `toast` (`@/store/toastStore`) — success/error feedback.
- `STATION_PIECE_MODULES` / `slugToLabel` (`@/constants/stationPieceModules`) — static module list rendered in Overview.
- `formatDateRo` / `formatCurrencyRon` (`@/lib/format`) — display formatting (currency assumed RON here).

## User actions & controls
- Tab strip (PageHeader): switch between Prezentare / Interventii / Mentenanta / Piese / Cereri modificare / Jurnal.
- Back button (PageHeader `onBack`).
- Interventions tab: "Adaugă interventie" button → opens FormModal. Each intervention row shows a `ChevronRight` affordance (decorative; no click handler wired — drill-in not implemented).
- Maintenance tab: "+ Plan nou" toggles inline create form (Salvează / Anulează); per-row "Șterge" (confirm → delete).
- Parts tab: "+ Cerere noua" toggles inline create form (Salvează / Anulează); per-row "Șterge" (confirm → delete); header shows aggregate "Cost estimat total".
- Changes tab: "+ Cerere noua" toggles inline create form (Salvează / Anulează); per-card "Șterge cererea" (confirm → delete).
- Activity tab: read-only list (no actions).
- Inline form fields are controlled text/number/date/select/textarea inputs (no separate modal component).

## Modals & dialogs
- **FormModal "Adaugă interventie"** (`@/components/FormModal`, driven by `useFormModal`) — fields: `intervention_type` (select: SERVICE/CORRECTIVE/PREVENTIVE/DIAGNOSTIC/UPGRADE/CHECKUP), `reason` (text, required), `problem_description` (textarea), `is_urgent` (select Nu/Da → boolean). Submit label "Creeaza".
- **confirmDialog** (`@/components/ConfirmDialog`, danger variant) — confirmation before deleting a maintenance plan, parts request, or change request.
- Maintenance / Parts / Changes "create" forms are **inline expanding panels** (toggled by local `show` state), NOT modals.

## Filters / search / sort / tabs / sub-views
- **Tabs:** `overview`, `interventions`, `maintenance`, `parts`, `changes`, `activity` (six). Tab state local; each tab lazily fetches its own data.
- **Filters / search / sort / pagination:** — none — (lists render full result sets unsorted/unfiltered client-side).
- Derived/computed views: maintenance rows flag `isOverdue` (next_execution_date in past & not COMPLETED); parts header computes `totalCost = Σ estimated_cost × quantity`; overview shows a static 4-step timeline (Creare/Livrare/Punere in functiune/Garantie) and a fixed module list from `STATION_PIECE_MODULES`; warranty "Garantie" badge shown when `warranty_end_date` is in the future.

## Exports / print / file ops
— none —

## Keyboard shortcuts / realtime / polling
- **Focus/visibility refresh:** `visibilitychange` + window `focus` listeners re-run `fetchStation()` and `fetchTabData(activeTab)` when the tab/window becomes visible (handles cross-machine edits). No interval polling, no websockets.
- Keyboard shortcuts: — none — (page-specific).

## Sub-components owned
- `OverviewTab` — info panel (`InfoRow`s), standard-modules list, cronologie timeline.
- `InterventionsTab` — section header + add button + intervention cards.
- `MaintenanceTab` — inline create form + plans table with overdue highlighting + delete.
- `PartsTab` — inline create form + parts table + total-cost aggregate + delete.
- `ChangesTab` — inline create form + change-request cards + delete.
- `ActivityTab` — read-only activity log list.
- `InfoRow` — dt/dd label-value pair (Overview).
- `EmptyState` — shared empty-list placeholder.
- `StationStatusBadge` — wraps `<StatusBadge>` with `statusTone()` mapping + underscore→space label.
- `PriorityBadge` — wraps `<StatusBadge>` with `priorityTone()` (CRITICAL/HIGH/MEDIUM/other).
- Helper fns: `statusTone(status)`, `priorityTone(priority)`; aliases `formatDate`/`formatCurrency`.

## Access / permissions
- No client-side role gating inside the page (`user` prop unused; no `access.ts` checks). All create/delete actions are visible to any user who can reach the route; enforcement is server-side per command (`withAuthenticatedUser`/`withAdminUser` in the registry). Rebuild should not hard-code role gates here unless mirroring server policy.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the **master-detail / tabbed** shape — do NOT force `<ListReport>` or `.mod-bento`. Use `<PageHeader>` (back + tab strip + status/warranty/location chips) exactly as now; the shell breadcrumb conveys the title (PageHeader ignores `title`).
- **Overview** as an airy two-column summary card grid (station info + standard modules) with a clean horizontal **timeline** strip below; use `<StatusBadge>`/domain resolvers from `statusTokens.ts`, never hand-rolled chips.
- **Interventions / Changes** read best as **cards** (variable-length descriptions, urgent pulse, priority badges). **Maintenance / Parts** read best as **tables** (uniform columns, overdue row highlight, total-cost footer/header).
- Replace the three ad-hoc **inline create panels** (maintenance/parts/changes) and the FormModal with one consistent create surface (slide-over or modal) per tab; keep the same fields and the same `{ request: {...} }` payload wrapping for the three `create_station_*` commands (intervention uses a flat payload — preserve that difference).
- Primary action per tab = the "+ Add" button in the section header; keep destructive deletes behind `confirmDialog`.
- Preserve the focus/visibility refresh behavior so the detail stays fresh on multi-user edits. Currency formatter is RON here (`formatCurrencyRon`) — verify against the app-wide `useMoney()` RON/EUR switch during rebuild.
- The intervention-row `ChevronRight` implies an intended drill-in detail view that is not yet wired — flag as a possible enhancement, but do not assume a backend command exists.
