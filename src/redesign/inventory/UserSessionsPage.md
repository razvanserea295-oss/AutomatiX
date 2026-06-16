# UserSessionsPage — function inventory
**Route:** sessions · **Workspace:** sistem · **File:** pages/auth/UserSessionsPage.tsx · **Lines:** 450
**Props/contract:** `UserSessionsPage({ user }: { user: User | null })` — default export; reads `user.role_name` to gate admin-only access.

## Backend functions (apiCommand) — ALL must survive
- `list_active_sessions` — returns `ActiveSession[]` (session_id, user_id, username, full_name, role_name, ip_address, created_at, expires_at) · triggered by `fetchAll()` on mount, on the "Reîmprospătează" button, on the 5s auto-refresh interval, and after a force-logout.
- `get_sessions_summary` — returns `Summary` (active_users, active_sessions, logins_today, failed_logins_today) for the live-count headline + KPI strip · triggered by `fetchAll()` (same triggers as above; runs in parallel via Promise.all).
- `get_user_login_history` — args `{ user_id, limit: 100 }`; returns `LoginEvent[]` (LOGIN / LOGOUT / LOGIN_FAILED rows) for the per-user history card · triggered by `loadHistory()` from the per-row History icon, and re-fetched after a force-logout if that user's history is open.
- `force_logout_user` — args `{ user_id }`; returns `{ revoked: number }`; revokes ALL active sessions for the target user · triggered by the per-row LogOut button via `handleForceLogout()` (after a danger confirm dialog).

## Data sources (stores / hooks)
- Local React state only — no Zustand store. `useState`: sessions, summary, loading, refreshing, selectedUserId, history, historyLoading. `useRef`: historyRef (for scroll-into-view). `useCallback`: fetchAll, loadHistory. `useMemo`: usersConnected (groups sessions by user), selectedSession.
- `useLocalStorage` (from `@/components/enhancements`) — persists 2FA policy under key `promix_user_2fa_policy_v1` (in `TwoFAEnforcementCard`).
- `parseBackendTimestamp` (`@/lib/format`) — UTC-aware timestamp parser used by `formatDateTime` so SQLite `datetime('now')` strings aren't off by ~2h.
- `toast` (`@/store/toastStore`) — success/error notifications.

## User actions & controls
- **Reîmprospătează** button (HeroHeader action) — manual `fetchAll()`; shows spinner + disabled while `refreshing`.
- **Per-row History icon** — `loadHistory(user_id)`; loads login history AND smooth-scrolls the history card into view (requestAnimationFrame + scrollIntoView). Selected row gets `bg-accent/5` highlight.
- **Per-row LogOut (Force logout) icon** — `handleForceLogout(session)`; confirm dialog then `force_logout_user`, then refresh + toast `${revoked} sesiuni revocate`.
- **2FA enforcement checkboxes** (Admin / Manager / Toți) — toggle booleans persisted to localStorage; backend enforcement is TBD (local-only).
- Auto-refresh every 5s while tab visible; pauses on `visibilitychange` when hidden.

## Modals & dialogs
- `confirmDialog` (danger) — "Forțează deconectare {name}?" with body warning all sessions close; confirmLabel "Forțează deconectarea". No other modals/sheets — history and KPIs render inline in cards.

## Filters / search / sort / tabs / sub-views
- No search box, no filter bar, no pagination, no tabs (the page itself is the "Sesiuni" tab inside SistemWorkspace).
- Implicit sort/grouping: `usersConnected` collapses multiple sessions per user into one row, keeps newest session as primary, counts extra_sessions, dedupes IPs (all_ips), and sorts rows by most-recent `created_at` desc.
- Two scrollable sub-views inside cards: connected-users table (`max-h-[420px]`, sticky header) and history list (`max-h-[360px]`).

## Exports / print / file ops
— none —

## Keyboard shortcuts / realtime / polling
- Polling: `setInterval(fetchAll, 5000)` — live auto-refresh, paused via `document.visibilitychange` when tab hidden; cleaned up on unmount.
- Smooth scroll-to-history on History-icon click (requestAnimationFrame → `scrollIntoView({ behavior:'smooth', block:'start' })`).
- No keyboard shortcuts.

## Sub-components owned
- `Kpi({ icon, label, value, tone })` — single KPI tile in the 4-up summary grid (tones info/success/danger/neutral).
- `TwoFAEnforcementCard()` — 2FA policy card with 3 role checkboxes backed by `useLocalStorage`.
- Helpers: `actionLabel(action)` (LOGIN→Conectat / LOGOUT→Deconectat / LOGIN_FAILED→Eșuat), `formatDateTime(iso)` (UTC-aware ro-RO formatting), `parseDetails(raw)` (JSON details → human label: force_logout_by_admin / unknown_user / @username, with truncation fallback).
- Reused UI: `HeroHeader`, `GlassCard`, `SectionCard`, `StatusBadge`, `Button`, `Page`/`Page.Body`.

## Access / permissions
- **Admin-only.** `isAdmin = user.role_name.toLowerCase() === 'admin'`. Non-admins see a centered "Doar administratorii au acces la această pagină." message and NO data fetch (effect early-returns, interval never starts).
- All four backend commands are admin-scoped on the server side (session management / force logout).

## Rebuild notes (Modern-SaaS layout intent)
- Keep the admin gate as the outer guard; render the "no access" empty state for non-admins (skip all polling).
- Top: hero/header with title "Sesiuni & activitate" + the single primary action **Reîmprospătează** (with spinner state) + a live "auto-refresh 5s" pulse indicator.
- Hero KPI band: featured live count (active_users large headline, with "+N sesiuni pe mai multe device-uri" hint) then a 4-up KPI row (Useri conectați, Sesiuni active, Login-uri reușite azi, Login-uri eșuate azi) — map to the approved featured-KPI + glass direction.
- Primary section: **table** of connected users (grouped per user) — columns Utilizator / Rol / IP (+N) / Sesiuni (amber when >1) / Ultima conectare / Acțiuni (History + Force-logout). Table is right for this; keep internal scroll + sticky header for 50+ users.
- Secondary section: per-user login-history list (timeline-style with StatusBadge tone per action, IP, time, parsed details) — reveal/scroll-into-view when a user is selected; keep the empty-prompt state.
- Footer section: 2FA enforcement card (3 role toggles) — keep local persistence; flag that backend enforcement is still TBD.
- Preserve the 5s visibility-aware polling, the danger confirm on force-logout, and UTC-aware timestamp formatting (don't regress to local-time parsing).
