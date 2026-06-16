# Stage 0 — Done

Infra landed before the roadmap started + the autonomous batch that followed.
Kept as a ledger so we don't re-litigate these.

## Foundational infra

- [x] Auto-updater URL configurable — env `PROMIX_UPDATE_URL` + `userData/update-config.json` + `"off"` sentinel to disable. `electron/updater.ts`
- [x] CSP — `session.webRequest.onHeadersReceived` injects strict policy in prod, permissive in dev. `electron/main.ts`
- [x] AI service bearer-token auth — optional `[auth].api_token` in `config.toml`, middleware on `/chat`, `/health` stays open. `ai-service/src/main.rs`, `src/api/ai.ts`
- [x] Rolling SQLite backup — daily, keeps last 7 copies in `userData/backups/`, IPC `backup_list` / `backup_run_now`. `electron/db/backup.ts`
- [x] `electron-log` rotating file logger — 5 MB cap, captures `uncaughtException` + `unhandledRejection` + renderer console messages. `electron/services/logger.ts`
- [x] Fonts self-hosted — Geist Variable + Geist Mono (OFL) in `public/fonts/`, no external CDN. `src/index.css`, `index.html`
- [x] CSS a11y pass — `color-scheme`, `accent-color`, `prefers-reduced-motion` (global), `prefers-contrast: more`, `forced-colors`, Firefox scrollbar styles, muted-text contrast bumps. `src/index.css`
- [x] Auto-login via safeStorage — Remember me persists encrypted creds in OS keychain; silent relogin on boot if JWT expired. `electron/ipc/system.ts`, `src/App.tsx`, `src/pages/LoginPage.tsx`
- [x] Connection reconnect with backoff — `useServerConnection` hook + `ConnectionBanner` component; no more destructive URL-clearing on transient outages. `src/hooks/useServerConnection.ts`, `src/components/shell/ConnectionBanner.tsx`
- [x] Branded boot loader — gear + concentric ripple rings + indeterminate progress. `src/components/BootLoader.tsx`
- [x] Login aurora + particle network background. `src/pages/LoginPage.tsx`

## Stage 1 (release blockers) — partial

- [x] **1.3** CI/CD release workflow — `.github/workflows/release.yml` builds Rust ai-service, stages it, runs tsc + vite + electron-builder, publishes draft GitHub release on `v*` tags. Signs if `CSC_LINK` secret is present. Docs: [runbooks/ci-secrets.md](./runbooks/ci-secrets.md).
- [x] **1.4** Bundle ai-service in installer — `extraResources` in `package.json`, `scripts/stage-ai-service.mjs` copies the Rust binary into `ai-service/dist/<platform>-<arch>/`, `findAiExe()` resolves from `resourcesPath` first. NSIS hook registers a localhost firewall rule.
- [x] **1.5** Auto-generate ai-service api_token — `electron/services/aiToken.ts` writes a 32-byte hex token into ai-service's `config.toml` on first launch, mirrors it to `userData/ai-token.txt` and exposes via IPC `ai_token_get` / `ai_token_rotate`. Renderer syncs it to localStorage at boot.

## Stage 2 (quality & trust) — partial

- [x] **2.2** Offline fallback UI for AI — `useAiHealth` hook + shared `aiHealthStore`, `AiStatusChip` in `SystemStatusBar`, `<AiOfflineTooltip>` wrapper for AI-triggering buttons.
- [x] **2.3** Per-page error boundaries — `ErrorBoundary` gains `scope` prop, structured log forwarding via `log_renderer` IPC, "Go home" + "Copy details" buttons, boundary keyed per page in App.tsx.
- [x] **2.4** About / OSS licenses page — `scripts/generate-licenses.mjs` walks npm + Cargo.lock + bundled assets (fonts, model), writes `src/assets/licenses.json` (371 entries). `<AboutPanel>` rendered inside `SettingsPage` "Despre" section with search + copy.
- [x] **2.6** DB migration safety — pre-migration forced backup (`backups/pre-migrate-<stamp>.db`), each migration wrapped in BEGIN/COMMIT with rollback, post-migration row-count sanity check on critical tables that halts boot if a table was wiped.

## Stage 3 (UX polish) — partial

- [x] **3.1** First-run wizard — 4-step onboarding in `<FirstRunWizard>` gated on `localStorage.promix_first_run`. Welcome → server choice (local vs remote URL with test-connection) → theme → telemetry consent (GDPR-friendly, default off).
- [x] **3.2** Keyboard shortcuts + help overlay — `useKeyboardShortcuts` hook with modifier parsing, Mac-aware formatting; global bindings (`?`, `Mod+K`, `Mod+,`, `Mod+Shift+D/P/A/C`). `<KeyboardShortcutsOverlay>` modal listing all shortcuts with `Esc` to close.
- [x] **3.4** Audit log — migration `041_audit_log.sql` + `electron/db/audit.ts` (`logAudit` / `listAudit` / `countAudit` / `exportAuditCsv`) + IPC exposure + `<AuditLogPanel>` under Settings → Jurnal modificări (admin only). Wired into user create/update/delete as templates; other entities can be added incrementally.

## What's intentionally *not* here

- **1.1 Code signing** — needs external cert purchase (~€300-400/year EV)
- **1.2 Public update endpoint** — needs decision: GitHub Releases (free, private repo) vs self-hosted VPS
- **2.1 Crash reporting (Sentry)** — needs Sentry DSN / GlitchTip instance
- **2.5 Telemetry opt-in modal** — consent now captured during first-run wizard (stored as `promix_telemetry_consent`); gating in `Sentry.beforeSend` still pending 2.1
- **3.3 PDF export** — deferred; needs sample report specs from domain experts
- **Audit log on all entities** — only `user` wired so far. Wire projects/pieces/contracts/clients similarly when touching those IPC handlers.
