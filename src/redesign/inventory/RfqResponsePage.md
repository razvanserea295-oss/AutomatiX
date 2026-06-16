# RfqResponsePage — function inventory
**Route:** rfq/:token · **Workspace:** public · **File:** pages/portal/RfqResponsePage.tsx · **Lines:** 226
**Props/contract:** `export default function RfqResponsePage()` — no props. Token comes from the URL via `useRoute('/rfq/:token')` (wouter); `token = params?.token || ''`. This is a public, unauthenticated supplier-facing portal page (no shell, no auth, no Zustand).

## Backend functions (apiCommand) — ALL must survive
- — none — (this page does NOT use `apiCommand`; it is a public portal page that calls raw REST endpoints directly)

### REST endpoints used (raw `fetch`, must survive the rebuild)
- `GET /api/rfq/:token` — loads the RFQ view payload `{ rfq: { rfq_number, title, description, deadline, items[] }, invitation: { id, status, supplier_name } }` · triggered on mount (useEffect on `token`). Base URL resolved via `getServerUrl()` (`@/config/server`); falls back to relative `/api/rfq/:token`.
- `POST /api/rfq/:token/submit` — submits the supplier's quote OR a decline · triggered by `submit(decline)`. Body (offer): `{ lead_time_days?, validity_days?, currency, notes, items:[{ rfq_item_id, unit_price, available_quantity, notes }] }`. Body (decline): `{ decline: true, decline_reason, items: [] }`. Content-Type application/json. On success sets `submitted=true`.

## Data sources (stores / hooks)
- React local state only — no Zustand, no shared hooks.
- `useRoute('/rfq/:token')` (wouter) → token.
- `getServerUrl()` from `@/config/server` → API base.
- Local state: `data` (RfqView|null), `loading`, `error`, `submitted`, `responses` (Record<itemId, {unit_price, available_quantity, notes}>), `leadTime`, `validity`, `currency` (default 'RON'), `notes`, `submitting`, `showDecline`, `declineReason`.
- On load, `responses` is initialized per item with `{ unit_price: 0, available_quantity: item.quantity, notes: '' }`.

## User actions & controls
- Per-item inline number input: **Cant. disponibilă** (available_quantity, min 0, step 0.01) — updates `responses[item.id].available_quantity`.
- Per-item inline number input: **Preț unitar** (unit_price, min 0, step 0.01) — updates `responses[item.id].unit_price`.
- Per-row computed **Total** cell = unit_price × available_quantity (read-only, `.toFixed(2)`).
- Footer **TOTAL OFERTĂ** = sum of all rows (read-only) + currency.
- Number input **Termen livrare (zile)** → leadTime.
- Number input **Valabilitate ofertă (zile)** → validity.
- Select **Monedă** → currency (options: RON, EUR, USD).
- Textarea **Observații** → notes (placeholder: payment terms / extra details).
- Button **"Trimite ofertă"** → `submit(false)`; disabled while `submitting` OR `total <= 0`; shows spinner while submitting (Send icon otherwise).
- Button **"Refuz cererea"** → opens inline decline form (`setShowDecline(true)`).
- (Decline form) Textarea **Motiv refuz (opțional)** → declineReason.
- (Decline form) Button **"Anulează"** → `setShowDecline(false)`.
- (Decline form) Button **"Confirmă refuz"** → `submit(true)`; disabled while submitting.

## Modals & dialogs
- No overlay/portal modal. The **decline confirmation** is an inline conditional panel (replaces the offer form when `showDecline` is true) containing the decline-reason textarea + Anulează / Confirmă refuz buttons. Edits field: `declineReason`.

## Filters / search / sort / tabs / sub-views
- No filters, search, sort, pagination, or tabs.
- Conditional render states (sub-views): **loading** (centered spinner) · **error / no-data** ("Acces invalid" card) · **submitted** ("Mulțumim!" success card) · **offer form** (default) · **decline form** (when showDecline).

## Exports / print / file ops
- — none — (no export, print, PDF, upload, download, or clipboard).

## Keyboard shortcuts / realtime / polling
- — none — (no shortcuts, no realtime/websocket, no polling; single fetch on mount).

## Sub-components owned
- — none — (single self-contained default-export component; no child modal/tree/enhancement components). Local TS interfaces `RfqItem` and `RfqView` describe the fetched payload.

## Access / permissions
- **Public / unauthenticated** portal page (workspace: public). No role gating, no login, no shell. Access is gated solely by the opaque `:token` in the URL. Missing token → "Token lipsă" error. Invalid/expired token → server returns non-OK and the page shows the "Acces invalid" card with the server message. No viewer-only variant.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the clean, branded, single-column public layout (max-w-4xl, centered). This is a supplier-facing form, not an in-app ERP page — do NOT wrap it in the app shell, PageHeader, or workspace tabs.
- Header band: RFQ title + `rfq_number` + supplier_name. Below it: optional description card and a prominent **deadline** callout (warning tone) when present.
- Primary content = the **line-items quote table**: columns Articol (+ item notes), Cant. solicitată (read-only), Cant. disponibilă (input), Preț unitar (input), Total (computed). Footer row = grand total + currency. On narrow/mobile, consider card-per-item rather than a horizontally scrolling table.
- Secondary block = offer meta (lead time, validity, currency select, observations textarea).
- Primary action bottom-right: **Trimite ofertă** (disabled until total > 0, spinner on submit). Secondary/left: **Refuz cererea** opening a confirm step (keep a clear, low-emphasis destructive style).
- Preserve the three terminal states (loading / invalid-access / thank-you) as full-screen centered cards.
- LOAD-BEARING: the two REST calls (`GET /api/rfq/:token`, `POST /api/rfq/:token/submit`) and their exact request body shapes (offer vs decline) must be preserved verbatim — including `currency` default 'RON', the decline body `{ decline:true, decline_reason, items:[] }`, and `getServerUrl()` base-URL resolution.
