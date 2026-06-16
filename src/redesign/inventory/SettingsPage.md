# SettingsPage — function inventory
**Route:** settings · **Workspace:** sistem · **File:** pages/settings/SettingsPage.tsx · **Lines:** 1418
**Props/contract:** `SettingsPage({ user, onThemeChange, currentTheme, onQuitApplication? }: SettingsPageProps)` where `user: User | null`, `onThemeChange: (theme: 'light' | 'dark') => void`, `currentTheme: 'light' | 'dark'`, `onQuitApplication?: () => void`. (Note: `onQuitApplication` is declared in the props interface but currently NOT destructured/used by the component body.)

Companion file: `pages/auth/PasswordChangeEnhancements.tsx` (182 lines) — strength meter / generator / HIBP probe / local history widget. Default export `PasswordChangeEnhancements({ username, next, onSuggest })`; named export `recordPasswordHistory(username, pwd)`. It is imported by the force-password-change / change-password flow, NOT by SettingsPage directly. No `apiCommand` calls.

## Backend functions (apiCommand) — ALL must survive
- `get_notification_prefs` — loads the per-event email/in-app notification preference rows · triggered on NotificariSection mount.
- `update_notification_prefs` — saves the edited notification preference matrix (args `{ prefs }`); returns the canonical rows · triggered by "Salvează" in Notificări.
- `enable_2fa_start` — begins TOTP enrollment; returns `{ secret, otpauthUrl }` for the QR · triggered by "Activează 2FA" (TwoFactorPanel).
- `enable_2fa_confirm` — confirms enrollment with the 6-digit code (args `{ code }`) · triggered by "Confirmă activarea".
- `disable_2fa` — disables 2FA after verifying the current 6-digit code (args `{ code }`) · triggered by "Confirmă dezactivarea".
- `email_get_account` — hydrates the IMAP/SMTP account into the email form (only when local draft is pristine) · triggered on EmailSection mount.
- `email_test_connection` — tests IMAP+SMTP using the typed config (ports coerced to Number) · triggered by "Testează conexiunea".
- `email_save_account` — persists the IMAP/SMTP account · triggered by "Salvează" (Email); clears password fields from local draft on success.
- `get_company_settings` — loads CompanySettings (company/CUI/IBAN/TVA/currency/EUR-RON rate) · triggered on FiscalSection mount AND re-read after BNR refresh.
- `update_company_settings` — saves fiscal/company settings (args spread settings incl. `tva_rate`); returns canonical row, then reloads `useSettingsStore` so currency propagates · triggered by "Salvează" (Fiscal).
- `get_bnr_rate_history` — loads the EUR/RON rate history trend (args `{ limit: 12 }`, migration 107) · triggered on FiscalSection mount and after a BNR refresh.
- `refresh_exchange_rate` — pulls the official EUR/RON rate from BNR (admin-only); page then re-reads company settings + reloads settings store + reloads history · triggered by "Actualizează din BNR".
- `backup_status` — loads backup directory/interval/cooldown/keepCount/totalCount/lastBackup metadata · triggered on BackupSection mount + "Actualizează".
- `backup_list` — loads the list of backup files (name/size/mtime/kind) · triggered alongside backup_status.
- `backup_run_now` — runs an immediate DB backup; returns `{ skipped, file?, reason? }` · triggered by "Backup acum".

### Electron-only IPC (`window.electron.invoke`) — desktop shell only, guarded by `'electron' in window`
NOTE: repo is now web/server only (Electron removed), but these IPC calls remain in the source and must survive the rebuild for any embedded-server/desktop reuse.
- `server_status` — embedded-server running/port/localIp · ServerSection mount.
- `get_local_ip` — LAN IP for the user-share link · ServerSection mount.
- `server_start` (args `{ port }`) / `server_stop` — start/stop the embedded server · "Pornește" / "Oprește" in ServerSection.
- `ai_service_status` — AI service running/pid/exe; polled every 5s · AiSection.
- `ai_service_start` / `ai_service_stop` — launch/kill the bundled ai-service.exe · "Pornește AI" / "Oprește" in AiSection.

## Data sources (stores / hooks)
- `useSetupStore` — `completed`, `checked`, `refresh()`, `openWizard()` (SetupContinueBanner: admin first-login wizard nudge).
- `useSettingsStore` — `getState().load(true)` to re-propagate display currency/rate after Fiscal/BNR saves.
- `useLocalStorage` (`@/components/enhancements`) — EmailSection draft persistence (`promix_email_setup_draft_v1`); PasswordChangeEnhancements per-user history key `promix_pwd_history_<username>`.
- `useState`/`useEffect`/`useCallback` local state in every sub-section.
- Server/AI config helpers (non-store): `getServerUrl/setServerUrl/testServerConnection/isServerMode` (`@/config/server`); `getAiServiceUrl/setAiServiceUrl/aiHealth` (`@/api/ai`).
- Native notifications lib (`@/lib/nativeNotify`): `nativeNotificationsAvailable/Enabled`, `setNativeNotificationsEnabled`, `nativeNotify`.
- Input masks/validators (`@/lib/inputMasks`): `maskCui/maskIban/validateCui/validateIban`. Formatters: `formatDateTimeRo`. Errors: `getErrorMessage`. Toasts: `toast` (`@/store/toastStore`).

## User actions & controls
- **Left nav:** 13 section buttons (filtered by role) switch `activeSection`.
- **Aspect:** 2 theme cards (Luminos/Întunecat) → `onThemeChange`.
- **Notificări:** desktop-native toggle checkbox; per-event Email + In-app checkboxes (matrix); "Salvează".
- **Cont:** AvatarUpload (file pick + circular preview + save); read-only identity fields; 2FA: "Activează 2FA" → QR + manual key + 6-digit code input → "Confirmă activarea"/"Anulează"; when enabled "Dezactivează 2FA" → code input → "Confirmă dezactivarea"/"Anulează".
- **Email:** email/display-name/IMAP(host,port,user,pass)/SMTP(host,port,user,pass) inputs; "Testează conexiunea"; "Salvează".
- **Fiscal:** company/CUI/reg-com/address/city/county/bank/IBAN/TVA/EUR-RON inputs (CUI+IBAN masked & validated on blur); "Monedă default" select (RON/EUR); "Actualizează din BNR"; "Salvează".
- **Server (electron):** port input; "Pornește"/"Oprește" embedded server; selectable share link. Client conn: URL input; "Testează"; "Salvează"; "Deconectează" (server-mode only); insecure-HTTP warning banner.
- **AI (electron):** "Pornește AI"/"Oprește" process; URL input; "Testează"; "Salvează"; "Resetare".
- **Backup:** "Backup acum"; "Actualizează"; read-only stat cards + backup table.
- **SetupContinueBanner (admin):** "Continuă setup inițial" → opens setup wizard.
- **PasswordChangeEnhancements:** "Sugerează parolă" (generates + copies to clipboard + calls `onSuggest`); "Cere skip de la admin" (toast only).

## Modals & dialogs
- No portal/sheet modals owned directly. In-section inline panels act as dialogs: 2FA enrollment panel (QR + key + code) and 2FA disable panel (code) — both inline within ContSection.
- SetupContinueBanner opens the global setup wizard via `useSetupStore.openWizard()` (modal owned by setup store, not this page).
- Delegated to imported panels: BroadcastsAdminPanel, MaintenanceModePanel, AuditLogPanel, AutoBackupPanel (restore confirm), AvatarUpload, AboutPanel, HelpPanel — may open their own dialogs.

## Filters / search / sort / tabs / sub-views
- **Primary navigation = 13 sections (tabs/sub-views)** rendered via left nav + `activeSection`: aspect, notificari, cont, email, fiscal, anunturi, mentenanta, server, ai, audit, backup, despre, ajutor.
- Notificări = a checkbox matrix table (no sort/filter). Backup list table (no sort/filter/pagination). BNR history list (newest-first, fixed limit 12, scroll, read-only).
- No search box, no column sorting, no pagination on this page.

## Exports / print / file ops
- **File upload:** AvatarUpload (profile picture) in Cont section.
- **Clipboard:** PasswordChangeEnhancements "Sugerează parolă" writes generated password to clipboard; 2FA secret/share-link use `select-all` for manual copy.
- **DB backup files:** Backup section creates/lists on-server `.db` snapshots (no client download); AutoBackupPanel handles scheduled full-archive backup + restore.
- No PDF/CSV/print from this page.

## Keyboard shortcuts / realtime / polling
- **Polling:** AiSection polls `ai_service_status` every 5000ms (electron only).
- **Debounce:** PasswordChangeEnhancements debounces HIBP probe 600ms after typing (≥6 chars).
- HIBP breach check via external `fetch('https://api.pwnedpasswords.com/range/<sha1-prefix>')` (k-anonymity; null fallback on CSP/network block).
- 2FA QR rendered via external image `api.qrserver.com`.
- No keyboard shortcuts; no websocket/realtime.

## Sub-components owned
Defined inside SettingsPage.tsx: `SettingsPage` (default), `SetupContinueBanner`, `SectionGroup`, `FieldRow`, `SaveBtn`, `StatusPill`, `AspectSection`, `DesktopNotifToggle`, `NotificariSection`, `ContSection`, `TwoFactorPanel`, `ServerSection`, `AiSection`, `BackupSection`, `StatCard`, `EmailSection`, `FiscalSection`. Helpers: `formatBytes`, `formatRelativeTime`, `truncatePath`; consts `inputCls`, NAV_ITEMS, EVENT_LABELS, KIND_LABEL/COLOR, EMAIL_DRAFT_KEY/INITIAL.
Imported panels (separate files, rendered as sections): `AboutPanel`, `AuditLogPanel`, `AutoBackupPanel`, `AvatarUpload`, `HelpPanel`, `BroadcastsAdminPanel`, `MaintenanceModePanel`.
Companion file `PasswordChangeEnhancements.tsx` (default export + `recordPasswordHistory`) with internal helpers `simpleHash`, `strengthScore`, `generatePassword`, `checkHibp`.

## Access / permissions
Per-role left-nav filtering (`visibleNav`):
- **admin** → all 13 sections.
- **manager** → admin minus the four platform-level tabs (server, ai, backup, despre); keeps fiscal + audit.
- **financiar** → keeps fiscal (legacy of migration 083 rename); plus the always-on personal tabs.
- **user / other** → only personal tabs: aspect, notificari, cont, email.
- Specifically gated admin-only: audit, anunturi, mentenanta, server, ai, backup, despre. fiscal = admin|manager|financiar.
- SetupContinueBanner renders only for admin while `initial_setup_completed === false`.
- 2FA panel available to every user (opt-in per row); `job_title` shown to all but admin-editable only. `refresh_exchange_rate` is an admin-only backend command.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the **two-pane settings shell**: persistent left section-rail (icon + label, active accent bar) + scrollable right detail pane; HeroHeader on top. This is already clean — preserve role-filtered rail.
- Each section = a card-stacked detail view. Use form rows (label + hint + inline error) with one primary "Salvează" per section; secondary actions (Test, Reset, Refresh BNR) as ghost buttons.
- Fiscal: 2-col form grid + currency select + BNR refresh row + read-only history list. CUI/IBAN keep mask + on-blur validation. Backup: KPI/stat cards (2-col) + action row + plain table + AutoBackupPanel below.
- Notificări: keep the desktop-toggle card + checkbox matrix table.
- Server/AI: status card (dot + label + start/stop) + connection form; gate behind `'electron' in window` and admin role exactly as today.
- Primary action of the page = section-scoped save; no single global save. Surface the admin setup-wizard nudge banner at top of the right pane.
- DO NOT drop any of the 15 apiCommand names or the 7 electron IPC names listed above — all load-bearing.
