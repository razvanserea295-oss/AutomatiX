# ServiceTicketsPage — function inventory
**Route:** service-tickets · **Workspace:** production · **File:** pages/service/ServiceTicketsPage.tsx · **Lines:** 553
**Props/contract:** `ServiceTicketsPage({ user: _user }: { user: User | null })` — receives the current `User` (unused in body, prefixed `_user`; no role gating in-page).

## Backend functions (apiCommand) — ALL must survive
- `list_service_tickets` — loads ticket list; passes `{ only_open: true }` when filter==='open', else `{}` · triggered by initial load + filter changes (`fetch()` callback)
- `get_service_ticket_stats` — loads KPI stats (open / in_progress / overdue / resolved_this_week / avg_resolution_hours / total_billable_revenue) · triggered by `fetch()` (parallel with list)
- `get_all_stations` — loads station list `{id,name,client_id}` for the create modal's Station select · triggered once on mount
- `get_users` — loads user list `{id,full_name}` for the Assign select (detail + create modal) · triggered once on mount
- `get_service_ticket` — re-fetches a single ticket by `{ ticket_id }` for full detail (comments + parts) · triggered when a ticket row is clicked (`refreshSelected`)
- `update_service_ticket` — patch via `{ request: { id, ...field } }`; the page sends one field at a time: `status`, `severity`, `assigned_user_id`, `cost_labor`, `currency` · triggered by Status select, Severity select, Assign select, Cost manoperă input (onBlur), Currency select (cost summary)
- `add_service_ticket_comment` — adds a comment `{ ticket_id, body }`, returns updated ticket · triggered by comment Send button
- `add_service_ticket_part` — adds a consumed part `{ ticket_id, part: { description, quantity, unit_cost } }`, returns updated ticket · triggered by part-row "+" button
- `remove_service_ticket_part` — removes a part `{ part_id }`, returns updated ticket · triggered by per-part "X" button
- `create_service_ticket` — creates a new ticket via `{ request: { station_id, client_id, severity, title, description, reported_via, reported_by_name, reported_by_contact, assigned_user_id } }` · triggered by CreateTicketModal "Creează" button

## Data sources (stores / hooks)
- `useClientStore` — `clients` (list for create-modal Client select) + `fetchClients()` (called on mount). Clients passed into CreateTicketModal.
- `useMoney` (settingsStore) — `money(value, currency, decimals)` formatter used in the detail cost summary (Manoperă / Piese / Total).
- `toast` (toastStore) — success/error notifications on every mutation.
- Local React state: `tickets`, `stats`, `selected`, `loading`, `showCreate`, `filter` ('open'|'all'|'overdue'), `stations`, `users`. No URL/query-param state. No polling.

## User actions & controls
- **Tichet nou** button (HeroHeader action) → opens CreateTicketModal.
- **Filter toggle pills** — `Deschise` / `Overdue` / `Toate` (re-fetches; 'overdue' is client-side filtered on `is_overdue`).
- **Ticket list rows** — click selects ticket + calls `get_service_ticket` to load detail; selected row highlighted (left accent border).
- **Detail — Status select** (7 statuses) → `update_service_ticket`.
- **Detail — Severitate select** (critical/high/medium/low, with SLA hint) → `update_service_ticket`.
- **Detail — Asignat select** (users + "neasignat") → `update_service_ticket` (assigned_user_id, nullable).
- **Detail — Cost manoperă** number input (onBlur) → `update_service_ticket` (cost_labor).
- **Detail — Currency select** RON/EUR in cost summary → `update_service_ticket` (currency).
- **Detail — Add part**: description / qty / unit price inputs + "+" button → `add_service_ticket_part` (guarded: desc non-empty & qty>0).
- **Detail — Remove part**: per-row "X" → `remove_service_ticket_part`.
- **Detail — Add comment**: textarea + Send button → `add_service_ticket_comment` (guarded: non-empty trimmed body).
- **CreateTicketModal** fields: Station, Client, Severity, Reported-via, Reported-by name, Contact, Assign technician, Title (required), Description; Anulează / Creează buttons.
- All mutating selects/inputs in detail are disabled while `busy` (in-flight update).

## Modals & dialogs
- **CreateTicketModal** (owned sub-component, fixed overlay, max-w-2xl) — purpose: create a new service ticket. Fields: `station_id` (select, optional), `client_id` (select, "— din stație —" default), `severity` (select w/ SLA labels), `reported_via` (phone/email/portal/onsite), `reported_by_name` (text), `reported_by_contact` (text), `assigned_user_id` (select), `title` (required text), `description` (textarea). Validates title non-empty client-side. Submit → `create_service_ticket`; on success closes, selects new ticket, refreshes list.
- No other dialogs — the ticket **detail** is an inline right-hand panel (not a modal).

## Filters / search / sort / tabs / sub-views
- **Filter pills:** Deschise (`only_open` server-side) · Overdue (client-side `is_overdue`) · Toate.
- **No text search, no sort controls, no column sorting, no pagination** — full list rendered.
- **Master-detail layout:** list (2/3 width) + detail panel (1/3 width); detail acts as a sub-view.
- **KPI row:** Deschise, În lucru, Overdue SLA (warn-styled when >0), Rezolvate (7z).

## Exports / print / file ops
- — none — (no PDF, print, upload, download, or clipboard).

## Keyboard shortcuts / realtime / polling
- — none — (no keyboard handlers, no realtime/WebSocket, no polling/interval). Data refreshes only on explicit user action / filter change / mutation success (`fetch()` / `refreshSelected()`).

## Sub-components owned
- `KpiMini` — compact glass metric tile (icon, label, MetricValue; optional `warn`).
- `TicketDetail` — right-panel detail editor (header, SLA badge, status/severity/assign/labor fields, currency-switchable cost summary, parts manager, comments thread + composer). Owns part/comment local state.
- `Field` — small labeled-field wrapper (uppercase label + children).
- `CreateTicketModal` — new-ticket dialog (see Modals).
- Inline `<style>` blocks define the shared `.input` class in both TicketDetail and CreateTicketModal.

## Access / permissions
- No client-side role gating in the page (`user` prop unused). Visibility/permissions enforced server-side per command (`withAuthenticatedUser`/`withAdminUser` in the registry) and page-level via `src/lib/access.ts` route gating. No viewer-only/read-only branch in-component.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the **master-detail** shape: it suits ticket triage. Modernize as: airy HeroHeader (eyebrow "Service", Wrench icon) + primary action **Tichet nou** top-right; featured KPI strip below (4 tiles, Overdue tile as the alert-accented featured metric).
- **List pane (left, ~2/3):** card/row list with ticket number (mono accent), severity badge, status badge, SLA-overdue badge, title, station·client·assignee meta. Add a real **search** + **sort** (by SLA due / severity / created) — currently missing; worth adding while keeping the existing filter pills (Deschise/Overdue/Toate). Consider grouping/empty-state reuse (`EmptyState`).
- **Detail pane (right, ~1/3 or a slide-over on narrow viewports):** sectioned cards — (1) header + SLA, (2) editable Status/Severity/Assign/Labor grid, (3) cost summary with RON/EUR switch + money() formatting, (4) Parts table (add/remove inline), (5) Comments thread + composer. Keep one-field-at-a-time `update_service_ticket` semantics and the `busy`-disable pattern.
- **Create flow:** keep modal (or convert to right slide-over); same 9 fields, title required, SLA hints on severity. Preserve all 10 apiCommands exactly — they are load-bearing.
- Use shared primitives (HeroHeader, GlassCard, StatusBadge, MetricValue, Button, EmptyState, filterControls); do not hardcode hex or pill classes.
