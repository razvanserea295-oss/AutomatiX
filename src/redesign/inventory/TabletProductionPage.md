# TabletProductionPage — function inventory
**Route:** tablet · **Workspace:** production · **File:** pages/tablet/TabletProductionPage.tsx · **Lines:** 300
**Props/contract:** `TabletProductionPage({ user, onLogout }: { user: User | null; onLogout?: () => void })`

## Backend functions (apiCommand) — ALL must survive
- `time_get_active` — fetches the currently running time entry (`ActiveTimer | null`) · triggered on mount + after every start/stop via `refreshActive()`
- `get_projects` — loads all projects; page client-side filters out `status === 'finalizat'` and `status === 'anulat'` · triggered on mount
- `get_project_pieces` — loads pieces for `{ project_id: selectedProjectId }`; page client-side filters out `status === 'testat'` · triggered when `selectedProjectId` changes
- `time_start` — starts a timer for `{ piece_id: piece.id }` · triggered by per-piece START button
- `time_stop` — stops the active timer (`{}` payload) · triggered by STOP button (timer strip + per-active-piece STOP)
- `update_project_piece` — updates a piece's status `{ request: { id, status } }` · triggered by every status-advance button (→ In productie, Livrat, Montat, Testat) and by SignOff modal confirm (→ fabricat)
- `create_document` — uploads a captured/selected photo as a document `{ request: { project_id: 0, category_id: 1, name, file_data(base64), file_type, file_size, file_name } }` · triggered by the Foto upload button (PhotoUploadButton)

## Data sources (stores / hooks)
- Local React state only — no Zustand store. State: `projects`, `selectedProjectId`, `pieces`, `activeTimer`, `loading`, `tick` (1s clock), `showSignOff`.
- `toast` from `@/store/toastStore` (success/error notifications).
- `apiCommand` from `@/api/commands` for all backend I/O.
- `User` type from `@/core/types` (passed in via props).
- No global store subscriptions; all data fetched imperatively via `useEffect`.

## User actions & controls
- **Project selector** — native `<select>` dropdown; choosing a project sets `selectedProjectId` and reloads pieces.
- **Logout** — header "Iesire" button → calls `onLogout?.()`.
- **START** (per piece, when no timer active on it) — `startTimer(piece)` → `time_start`.
- **STOP** — in active-timer strip and as the per-piece button when that piece is active → `stopTimer()` → `time_stop`.
- **Status advance buttons** (rendered conditionally on current status):
  - `planificat` → "→ In productie" → `updateStatus(piece, 'in_productie')`
  - `in_productie` → "Marchează fabricat" → opens SignOffModal (`setShowSignOff(piece)`), confirm advances to `fabricat`
  - `fabricat` → "→ Livrat" → `updateStatus(piece, 'livrat')`
  - `livrat` → "→ Montat" → `updateStatus(piece, 'montat')`
  - `montat` → "→ Testat" → `updateStatus(piece, 'testat')` (testat pieces then drop off the list via filter)
- **Foto** (PhotoUploadButton, shown when piece status is `in_productie` or `fabricat`) — file input with `accept="image/*" capture="environment"` → reads as base64 → `create_document`.

## Modals & dialogs
- **SignOffModal** — confirmation sheet for marking a piece `fabricat`. Bottom-sheet on mobile / centered on `sm+`. Fields: a single required checkbox "Confirm ca am verificat toate operatiile" (gates the Confirm button via `disabled={!confirmed}`). Buttons: Anulează (close), Confirm (runs `onConfirm` → `updateStatus(piece,'fabricat')` then closes).

## Filters / search / sort / tabs / sub-views
- **Project filter:** active-only projects in selector (excludes `finalizat`/`anulat`); auto-selects first active project on load.
- **Pieces filter:** hides pieces with status `testat`.
- No search box, no sort controls, no tabs, no pagination. Pieces render as a single vertical list (max-w-3xl, centered).
- Status tone coloring via `STATUS_TONE` map (planificat/in_productie/fabricat/livrat/montat/testat).

## Exports / print / file ops
- **Photo upload** — camera/file capture → base64 → `create_document` (project_id 0, category_id 1). Filename auto-generated `Piesa {id} foto {ro-RO timestamp}`.
- No print, no PDF export, no clipboard, no download.

## Keyboard shortcuts / realtime / polling
- **1s timer tick** — `setInterval` increments `tick` every second while `activeTimer` is set, to live-render elapsed time (`elapsed = activeTimer.elapsed_seconds + tick`). Cleared on unmount / when timer clears.
- `refreshActive()` re-pulls active timer after start/stop (no continuous polling).
- No keyboard shortcuts; no websocket/SSE realtime.
- `fmtHMS(sec)` helper formats elapsed seconds as HH:MM:SS.

## Sub-components owned
- **PhotoUploadButton** ({ pieceId }) — hidden file input + Camera/Loader icon; handles base64 read + `create_document` upload + toast.
- **SignOffModal** ({ piece, onClose, onConfirm }) — fabricat confirmation dialog with checkbox gate.
- Helpers/constants in-file: `fmtHMS`, `STATUS_TONE`, types `ProjectPiece` and `ActiveTimer`.

## Access / permissions
- No explicit client-side role gating inside the page; this is the tablet/shop-floor station view (route id `tablet`, workspace `production`). Permission enforcement is server-side per command (`time_*`, `update_project_piece`, `create_document`, `get_projects`, `get_project_pieces`). `user` is display-only (header name); `onLogout` drives sign-out.

## Rebuild notes (Modern-SaaS layout intent)
- **Touch-first, large targets** — this is a tablet kiosk; keep big tap zones, single-column flow, sticky header + sticky active-timer strip + sticky project selector.
- **Three sticky zones:** (1) station header with operator name + Iesire; (2) green active-timer strip with HH:MM:SS mono clock + big STOP; (3) project selector. Preserve the stacked sticky offsets (timer strip pushes selector down).
- **Pieces as cards, not a table** — each card: title + category/qty, status badge, full-width START/STOP, then a status-advance action and conditional Foto button. Keep the linear status pipeline planificat → in_productie → fabricat → livrat → montat → testat with the SignOff confirmation gate at the fabricat step.
- **Primary action = START/STOP timer** (largest, full-width, green/red). Secondary = status advance + photo.
- Keep client-side filters (active projects only; hide testat pieces). Airy spacing, generous padding, mono tabular clock. Empty state: "Nicio piesa activa pentru acest proiect".
