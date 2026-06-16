# CustomerPortalPage — function inventory
**Route:** portal/:token · **Workspace:** public · **File:** pages/portal/CustomerPortalPage.tsx · **Lines:** 285
**Props/contract:** `export default function CustomerPortalPage()` — no props. Reads `:token` from the URL via wouter `useRoute('/portal/:token')`. Public, auth-bypassed route (mounted in `App.tsx` under the `#/portal/` hash bypass, alongside RfqResponsePage / DownloadPage). Read-only; no user/session context.

## Backend functions (apiCommand) — ALL must survive
- — none — (this page makes **no** `apiCommand()` calls)

> NOTE: Unlike the rest of the app, this public page does **NOT** use `apiCommand`. It does a raw `fetch` to the REST endpoint below. This endpoint is load-bearing and MUST survive the rebuild:
- `GET /api/portal/:token` (server/index.ts:479, rate-limited via `tokenLimiter`, `Cache-Control: no-store`) — backed by `PortalService.viewByToken(db, token)`. Returns the entire `PortalView` payload (project + custom_stages + pieces_summary + contracts + invoices + service_tickets). On non-OK → `{ message }` shown as "Acces invalid". · triggered by page mount / token change (`useEffect`).
- Token lifecycle is **out of scope for this page** but powers it (lives on ProjectsPage): `create_portal_token`, `list_portal_tokens`, `revoke_portal_token`, `delete_portal_token`. The shareable link format is `${origin}/#/portal/${token}`. Do not re-implement these here; just keep consuming the token from the URL.

## Data sources (stores / hooks)
- `useRoute('/portal/:token')` (wouter) — extracts `token` param.
- Local component state via `useState`: `data: PortalView | null`, `loading: boolean`, `error: string | null`.
- `useEffect([token])` — fetches `${getServerUrl()}/api/portal/${token}` (falls back to relative `/api/portal/${token}` when no server URL). Headers: `Cache-Control: no-store`.
- `getServerUrl()` from `@/config/server` — resolves API base.
- **No Zustand store, no apiCommand, no shared hooks.** Fully self-contained read-only fetch.

## User actions & controls
- — none — Page is strictly read-only. No buttons, row actions, bulk actions, inline edits, drag-drop, toggles, context menus, create/status-change. The only "interaction" is loading the URL (token-driven fetch).

## Modals & dialogs
- — none —

## Filters / search / sort / tabs / sub-views
- — none — Single scroll view. Sections render conditionally based on data presence:
  - Project hero (name, status badge, current stage, description, Start/Termen/Piese/Progres stats, progress bar).
  - "Etape proiect" (custom_stages) — only if `custom_stages.length > 0`.
  - "Contracte (n)" — only if `contracts.length > 0`.
  - "Facturi (n)" — only if `invoices.length > 0` (3 KPI tiles: Total facturat / Plătit / Restant + table).
  - "Tichete service" (+ open count) — only if `service_tickets.length > 0`.

## Exports / print / file ops
- — none — (Note: the server-side comment at index.ts:476 says portal is meant for clients to "download contracts/invoices", but the current page renders NO download/print/PDF controls — contracts and invoices are display-only. If the rebuild is meant to honor that intent, download links would be NEW functionality, not a removal.)

## Keyboard shortcuts / realtime / polling
- — none — No keyboard shortcuts. No polling/websocket. Single fetch on mount; re-fetches only if `token` changes. Footer text claims "actualizat live" but there is no live mechanism — it is a one-shot fetch.

## Sub-components owned
- `Stat({ icon, label, value })` — local presentational tile (icon + uppercase label + value); used 4× in the hero stats grid (Start, Termen, Piese, Progres).
- Local constants/helpers (must survive): `STAGE_TONE` (stage status → badge classes: finalizat/in_desfasurare/planificat), `SEVERITY_TONE` (ticket severity → badge classes: critical/high/medium/low), `fmtCurrency(v, currency='RON')`, `fmtDate(iso)` (→ `dd.mm.yyyy`, `—` for null).
- Derived values computed in render: `totalInvoiced`, `totalPaid`, `totalRemaining` (sums over invoices), `openTickets` (tickets with no `resolved_at`), `pct` (completion % = (fabricat+livrat+montat+testat)/total).

## Access / permissions
- **Public, no auth.** Mounted in App.tsx behind the `#/portal/` hash bypass (no login, no shell, no workspace gating). Access control is entirely the opaque `:token` — anyone with the link sees the project. Server enforces `tokenLimiter` rate limiting and `no-store` caching. Error state ("Acces invalid / link invalid sau a expirat") covers revoked/expired/bad tokens. Strictly read-only — the page never mutates anything.

## Rebuild notes (Modern-SaaS layout intent)
- Keep it a **single centered column** (`max-w-5xl`), public-facing, light, airy — this is a client-facing surface, not the internal Fiori shell. It deliberately does NOT use PageHeader/WorkspaceTabs/ListReport; keep it standalone.
- **Hero card first:** project name + status chip (use `<StatusBadge>` / `projectStatus` resolver instead of the hardcoded teal chip), current stage, description, then a 4-up stat row (Start · Termen · Piese · Progres) and a slim progress bar. Progress % is the headline KPI.
- **Below, stacked cards (render only when non-empty):** (1) Etape proiect — vertical numbered stepper with status badges; (2) Contracte — list rows (code + rev + title + date · price + status); (3) Facturi — 3 summary KPI tiles (Total/Plătit/Restant) over a compact table (Nr · Emis · Scadență · Total · Restant · Status), with restant colored red when > 0; (4) Tichete service — list with severity chip + open count.
- Preserve every derived metric and both badge palettes (stage tones, severity tones) and both formatters. Replace hardcoded Tailwind color spans with the design-system StatusBadge tokens where possible.
- Loading = centered spinner; error = centered card with warning icon + message. Keep both.
- Consider honoring the server's stated intent by adding contract/invoice **download** affordances (currently absent) — but that is additive, not a migration requirement.
- Footer claims "actualizat live" but there is no polling; either add light polling/refetch on focus or soften the copy.
