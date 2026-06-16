# AlertsPage — function inventory
**Route:** alerts · **Workspace:** instrumente · **File:** pages/alerts/AlertsPage.tsx · **Lines:** 268
**Props/contract:** `AlertsPage({ user }: { user: User | null })` — receives the logged-in user (used for the `acknowledged_by` id when confirming alerts).

## Backend functions (apiCommand) — ALL must survive
Page mostly routes backend calls through `useAlertStore` thunks (which internally call apiCommand). Direct + store-mediated commands:

- `acknowledge_alert` — confirms/resolves one alert by id. Called **directly** in `AlertsPage.tsx` via `apiCommand('acknowledge_alert', { id })` inside the `onBulkAck` callback passed to `AlertsEnhancements` (fired by the "Rezolvă selectatele" bulk button). Errors swallowed per-id with `.catch(() => {})`. Also invoked through `acknowledgeAlertStore` (store thunk `acknowledgeAlert(alertId, user.id)`) for the per-row "Confirmă" button.
- (store thunk) `generateAndFetch` — `useAlertStore.generateAndFetch()` run on mount; server-side generates fresh alerts (stock/deadline/anomaly) then loads them. Underlying apiCommand lives in `src/store/alertStore.ts` (not in these two files).
- (store thunk) `createAlert` — `useAlertStore.createAlert(payload)` from the Add modal submit (non-edit path).
- (store thunk) `updateAlert` — `useAlertStore.updateAlert(editingItem.id, payload)` from the Add/Edit modal submit (edit path).
- (store thunk) `acknowledgeAlert` — `useAlertStore.acknowledgeAlert(alertId, userId)` from the per-row "Confirmă" button.

> NOTE: Only `acknowledge_alert` appears as a literal `apiCommand('...')` string in the two read files. The create/update/generate commands are wrapped by `alertStore` thunks; the rebuild MUST keep calling those store methods (or their underlying registry commands) — verify exact command names in `src/store/alertStore.ts`.

## Data sources (stores / hooks)
- **`useAlertStore`** (`@/store/alertStore`) — selectors: `alerts`, `loading`, `error`; thunks: `generateAndFetch`, `createAlert`, `updateAlert`, `acknowledgeAlert`.
- **`useFormModal`** (`@/hooks/useFormModal`) — `isOpen`, `editingItem`, `openModal`, `closeModal`, `isEditing` for the create/edit alert modal.
- **`useState`** — local `ackingIds: Set<number>` (per-row acknowledge in-flight spinners).
- **`useLocalStorage`** (`@/components/enhancements`) — persistence for all enhancement cards (keys: `promix_alerts_subs_v1`, `promix_alerts_mute_v1`, `promix_alerts_digest_v1`, `promix_alerts_chains_v1`, `promix_alerts_snoozes_v1`). These are client-only, NOT backend-backed.
- **`toast`** (`@/store/toastStore`) — success/error notifications.

## User actions & controls
- **Add alertă** (hero action `Button`, `Plus` icon) → opens FormModal in create mode (`openModal()`).
- **Confirmă** (per-row button, only when `!alert.acknowledged`) → `handleAcknowledge(alert.id)` → store `acknowledgeAlert(id, user.id)`; shows `Loader2` spinner while in `ackingIds`; success/error toast; no-op if `user` is null.
- **Enhancements — Subscripții pe tip:** checkbox per alert type (system/deadline/inventory/production/finance/maintenance) → localStorage subscriptions.
- **Enhancements — Bulk acknowledge:** per-alert checkboxes (open alerts, max 30 shown) + "Motiv comun" text input + **Rezolvă selectatele** button → `onBulkAck(selectedIds)` → parallel `acknowledge_alert` per id; toast with count + optional reason; clears selection/reason.
- **Enhancements — Snooze individual:** per-alert (max 10) `SnoozeMenu` → stores per-alert snooze ISO in localStorage; shows "până la <date>" once set.
- **Enhancements — Search full-text:** text input filters alerts client-side by title/message (max 12 matches).
- **Enhancements — Mute notificări:** `SnoozeMenu` sets a global mute-until ISO; **Reactivează acum** ghost button clears it.
- **Enhancements — Lanț de escalare:** severity select + threshold-minutes number + targets text + **Plus** button to add a chain row; **Trash2** button per row to delete; persisted in localStorage.
- **Enhancements — Email digest:** email input + cadence select (daily/weekly) + "Activează digest" checkbox; persisted in localStorage (no backend send wired in these files).

## Modals & dialogs
- **FormModal** (`@/components/FormModal`) — create/edit alert. Title "Adaugă alerta" / "Editează alerta"; submit "Adaugă" / "Actualizează". Fields:
  - `title` (text, required), `message` (textarea, required),
  - `severity` (select: info/warning/critical, required),
  - `type` (select: system/deadline/inventory/production, required),
  - `entity_type` (select: system/project/station/material/piece, optional; defaults 'system'),
  - `entity_id` (number, optional; coerced to 0 if blank).
  - Submit payload also forces `acknowledged: false`.
- **SnoozeMenu** (`@/components/enhancements`) — popover/menu for picking a snooze-until time; used by Mute card and Per-alert snooze card.

## Filters / search / sort / tabs / sub-views
- **No server-side filters/tabs/pagination/sort** on the main list — all active alerts render in one list.
- **KPI severity row** (counts only, not clickable filters): Critical / Warning / Info / Rezolvate, derived via `getCategory()` (maps severity+alert_type+acknowledged → critical/warning/info/resolved).
- **Client-side full-text search** in the enhancements panel (title/message, capped 12).
- **Bulk-ack list** capped to 30 open alerts; per-alert snooze list capped to 10; these are display caps, not pagination.

## Exports / print / file ops
— none —

## Keyboard shortcuts / realtime / polling
- **On-mount fetch:** `useEffect(() => generateAndFetch())` runs once — generates + loads alerts. No interval polling, no websocket/realtime in these files.
- No keyboard shortcuts defined locally.

## Sub-components owned
- **`AlertsEnhancements`** (default export of `pages/alerts/AlertsEnhancements.tsx`) — wrapper rendering the advanced cards; props `{ alerts, onBulkAck }`. Internal sub-cards (all owned here):
  - `SubscriptionsCard`, `MuteWindowCard`, `BulkAckCard`, `EmailDigestCard`, `FullTextSearchCard`, `EscalationChainCard`, `PerAlertSnoozeCard`.
- **`KpiMini`** (local in AlertsPage.tsx) — compact glass metric tile for the severity KPI row.
- **`AlertIcon`** (local) — severity-colored icon resolver.
- Helpers (local): `getCategory`, `formatTimestamp`, color maps `BORDER_COLOR` / `ICON_COLOR`.

## Access / permissions
- No explicit role gate in the page. `handleAcknowledge` no-ops when `user` is null (needs a logged-in user id for `acknowledged_by`).
- Page-level gating (if any) handled by `src/lib/access.ts` for route `alerts` (not enforced inside these files). Backend permission enforcement on `acknowledge_alert` / create / update lives in the command registry middleware.

## Rebuild notes (Modern-SaaS layout intent)
- **Layout:** keep the two-pane bento — left = primary alert feed, right aside = "Reguli & instrumente" advanced tools. Airy hero with `Bell` icon, eyebrow "Instrumente", title "Alerte".
- **Primary action:** single top-right "Adaugă alertă" button opening the FormModal.
- **KPI row:** 4 severity tiles (Critical/Warning/Info/Rezolvate) — Critical tile warns when >0. Consider making them click-to-filter in the rebuild (currently non-interactive).
- **Main feed:** card/list rows with left status border + severity icon, title + message, timestamp, and an inline "Confirmă" button on unacknowledged rows. Prefer a clean list (not a dense data table) given short, scannable content.
- **Advanced panel:** preserve all 7 enhancement cards and their localStorage keys exactly (subscriptions, bulk-ack, per-alert snooze, full-text search, mute window, escalation chains, email digest). These are local-state features — do not drop them assuming they're backend-backed.
- **Must-not-lose backend:** `acknowledge_alert` (direct + via store) and the store thunks `generateAndFetch` / `createAlert` / `updateAlert` / `acknowledgeAlert`. Empty state uses `BellOff` "Nicio alerta activa".
