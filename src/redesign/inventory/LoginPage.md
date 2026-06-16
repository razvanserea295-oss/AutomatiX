# LoginPage — function inventory
**Route:** login · **Workspace:** auth · **File:** pages/LoginPage.tsx · **Lines:** 414
**Props/contract:** `LoginPage({ onLogin })` where `onLogin: (username: string, password: string) => Promise<{ requires2FA: boolean }>`. When `requires2FA` is true the page flips into a TOTP code-prompt view; the App-level wrapper waits for the second factor to complete.

## Backend functions (apiCommand) — ALL must survive
- `apiCommand('<…>')` — **— none —** (no `apiCommand` literals in either file). Auth is delegated to the `onLogin` prop and to `useAuthStore` actions; no direct registry command is called from these files.

### Other backend / IPC / store-action calls (load-bearing — must survive even though not apiCommand)
- `window.electron.invoke('creds_save', { username, password })` — Electron-only: persist credentials in the OS keychain for silent auto-login · triggered after a successful (non-2FA) login when "Ține-mă logat" is on (LoginPage.tsx:99).
- `window.electron.invoke('creds_clear')` — Electron-only: wipe cached keychain credentials · triggered after successful login when "Ține-mă logat" is OFF (LoginPage.tsx:105).
- `onLogin(username, password)` (prop) — primary username/password authentication; returns `{ requires2FA }` · triggered by sign-in form submit (LoginPage.tsx:85).
- `verify2FA(twoFaCode)` (authStore action) — submits the 6-digit TOTP to complete a pending 2FA challenge · triggered by 2FA form submit (LoginPage.tsx:126).
- `cancel2FA()` (authStore action) — aborts the pending 2FA challenge, returns to sign-in · triggered by "Înapoi" button (LoginPage.tsx:145).
- `isServerReachable(serverUrl)` (`@/config/server`) — HTTP health probe of the configured server URL · on mount and on "Testează conexiunea" (LoginPage.tsx:55, 66).
- `getServerUrl()` / `setServerUrl(url)` (`@/config/server`) — read/persist the active backend base URL · init state + server-save + LAN pick (LoginPage.tsx:38,64; LoginEnhancements.tsx:385).
- `fetch(\`${url}/health\`)` (LanDiscovery) — raw best-effort GET against each LAN guess to auto-discover a reachable server (LoginEnhancements.tsx:192). **Not** an apiCommand by design (pre-auth discovery).

## Data sources (stores / hooks)
- `useAuthStore` (Zustand) — selectors: `pending2FAChallenge`, `verify2FA`, `cancel2FA` (LoginPage.tsx:74-76).
- `useLocalStorage` (`@/components/enhancements/useLocalStorage`) — reactive localStorage for `promix_2fa_users_v1` (TotpField opt-in map) and `promix_login_sessions_v1` (SessionsPanel list).
- `getStorage` / `setStorage` / `removeStorage` + `STORAGE_KEYS` (`@/config/localStorage`) — `REMEMBER_USERNAME`, `REMEMBER_ME` persistence for the username prefill + remember-me toggle.
- Raw `localStorage` (LoginEnhancements module functions) — keys `promix_login_fails_v1` (FailState: count/lockedUntil) and `promix_login_sessions_v1` (last 20 SessionRecords).
- `toast` (`@/store/toastStore`) — toast notifications (SSO/biometric stubs, reset, LAN results, server pick).
- `window.location` / `window.electron` / `window.isSecureContext` / `navigator.userAgent` — environment sniffing (web-vs-Electron, secure context, device label).

## User actions & controls
- **Username input** — text, prefilled from `REMEMBER_USERNAME`, autofocus, autocomplete=username.
- **Password input** — text/password toggle, autocomplete=current-password.
- **Show/Hide password button** (Eye/EyeOff) — toggles `showPwd` (tabIndex -1).
- **"Ține-mă logat" switch** — iOS-style checkbox toggling `rememberMe`; drives credential caching on submit.
- **"Conectează-te" primary submit** — runs `handleSubmit` (login, 2FA branch, remember-me persistence, keychain save/clear, failed-attempt reporting, session recording).
- **Enter key on form** — `handleKeyDown` also triggers submit when not loading.
- **"Probleme la conectare?" link** — toggles the server-config panel (`showServer`).
- **2FA code input** — numeric, max 6 digits, sanitized to digits only, autofocus, autocomplete=one-time-code.
- **2FA "Verifică" submit** — `handle2FASubmit`; validates `^\d{6}$`, calls `verify2FA`.
- **2FA "Înapoi" button** — `handle2FACancel` (cancel2FA + clear code/password/error).
- **Server status pill button** — toggles `showServer`; shows Wifi/WifiOff/Server icon + URL or "Server inaccesibil".
- **Server URL input** — editable in Electron; readOnly in web browser (locked to current origin).
- **"Testează conexiunea" button** — `handleServerSave` (trim, persist, reachability probe, set error).
- **LoginEnhancements — "Sesiunile mele" button** — opens SessionsPanel.
- **LoginEnhancements — "Detectează automat în rețea" button** — runs LAN `scan` probe.
- **LoginEnhancements — discovered-server `<button>` list** — each picks that URL (`onPick` → setServerUrl + onPickServer + toast).
- **TotpField input** (enhancements) — secondary 6-digit field, only rendered when the per-user 2FA opt-in flag is set (legacy/auxiliary path).
- **(Exported-unmounted) SsoButtons** — Microsoft / Google buttons → toast stub (retired, kept in build).
- **(Exported-unmounted) BiometricButton** — Windows Hello / WebAuthn probe + toast stub (retired; phone+secure-context gated).
- **(Defined-unmounted) ResetPasswordPanel** — email + "Trimite link de resetare" (reset flow not currently linked).

## Modals & dialogs
- **SessionsPanel** (overlay, absolute inset-0) — header "Sesiuni recente"; lists last 20 SessionRecords (username, localized timestamp, device UA fragment); footer "Șterge istoricul local" clears `promix_login_sessions_v1`; X to close. **Opened from** "Sesiunile mele".
- **ResetPasswordPanel** (overlay, absolute inset-0) — "Resetare parolă"; single email field (regex-validated), "Trimite link de resetare" → toast success + auto-close; X to close. **Currently NOT wired** to any trigger (links array only contains `sessions`); keep the component.
- **Inline 2FA view** — not a modal but a full in-card view swap when `pending2FA` is truthy (ShieldCheck header, code field, Înapoi/Verifică).

## Filters / search / sort / tabs / sub-views
- **Sub-views:** sign-in view ⇄ 2FA challenge view (toggled by `pending2FA`).
- **Collapsible server-config panel** (toggled by `showServer`, also auto-opens when server unreachable in Electron).
- No tables, no sorting, no pagination, no search/filter bars. — none beyond the above —

## Exports / print / file ops
- **— none —** (no PDF/print/export/upload/download/clipboard). Only OS-keychain credential save/clear via Electron IPC.

## Keyboard shortcuts / realtime / polling
- **Enter** submits the sign-in form (`handleKeyDown`).
- 2FA input enforces numeric-only + 6-char cap; sign-in input has autofocus.
- **Polling:** `LockoutBadge` runs a 1s `setInterval` re-reading `promix_login_fails_v1` to live-count the lockout countdown (5 fails → 5-min lock).
- **Mount animation:** `requestAnimationFrame` sets `mounted` for the entrance transition.
- No websockets / SSE / realtime data.

## Sub-components owned
- In `LoginPage.tsx`: `InlineError` (animated error line), `PrimaryButton` (submit button + spinner).
- In `LoginEnhancements.tsx`: `LoginEnhancements` (default), `LockoutBadge`, `TotpField`, `SessionsPanel`, `ResetPasswordPanel`, exported `SsoButtons`, exported `BiometricButton`; module helpers `reportFailedAttempt`, `clearFailedAttempts`, `recordSession`.
- Shared UI consumed: `GearLogo`, `AppBackground`.

## Access / permissions
- **Pre-auth / public page** — no role gating; this IS the gate. No `access.ts` checks.
- Brute-force lockout: 5 failed attempts → 5-minute local lock (client-side, localStorage only).
- 2FA: when challenged, login does NOT cache password for silent auto-login (deliberate — re-prompt intended).
- Web-browser mode locks the server URL to the current origin (readOnly); Electron mode allows editing + keychain credential caching.
- Note (from CLAUDE.md): forced first-login password change is enforced downstream in `App.tsx`/`ForcePasswordChangePage`, not here.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the centered single-column card on a soft `AppBackground` aurora — airy, max ~400px, generous whitespace. Brand lockup (GearLogo squircle + "Automatix" + subtitle) above the card.
- **Primary action:** one solid-accent "Conectează-te" button; grouped username/password rows (hairline divider, iOS-settings style) with leading icons and a password reveal toggle.
- Single iOS-style "Ține-mă logat" switch; inline centered error (`role=alert`).
- Preserve the **view swap** to the 2FA challenge (do not make it a separate route) — same card, ShieldCheck header, big mono 6-digit field, Înapoi/Verifică pair.
- Keep the **quiet collapsible server-config** affordance: status pill (Wifi/WifiOff/Server) + URL input (readOnly in browser) + "Testează conexiunea", auto-expanding when the server is unreachable on desktop.
- Keep the **enhancements strip** below the card: LockoutBadge, "Sesiunile mele" (→ Sessions modal), LAN auto-discovery with clickable found-server list. Retain (exported-unmounted) SsoButtons / BiometricButton / ResetPasswordPanel so the build keeps them for future wiring.
- No table; cards/overlays only. Footer: version "v1.1.4" · Promix Technologies.
- **Load-bearing wiring to preserve:** `onLogin` contract + `{ requires2FA }`, `verify2FA`/`cancel2FA` from authStore, Electron `creds_save`/`creds_clear` IPC, remember-me storage keys, `isServerReachable`/`getServerUrl`/`setServerUrl`, and the failed-attempt/session localStorage helpers.
