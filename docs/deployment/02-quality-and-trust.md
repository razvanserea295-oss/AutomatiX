# Stage 2 — Quality & trust

**Target**: 3-4 working days. Without these you have support hell after the
first client install: no visibility into crashes, AI failing silently,
fragile DB migrations, and legal exposure on OSS attribution.

## 2.1 Crash reporting remote

- [ ] Decide: Sentry SaaS (free 5k events/mo) vs GlitchTip self-hosted (own VPS)
- [ ] `npm install @sentry/electron` — handles main + renderer + native crashes
- [ ] Init in `electron/main.ts` BEFORE any other code — native crashes only capture if Sentry is first
- [ ] Init in `src/main.tsx` renderer init
- [ ] PII redaction: scrub `password`, `token`, `api_token`, `Authorization` headers, `promix_token` localStorage
- [ ] User-consent gate (see 2.5) — don't send events until user opts in
- [ ] `beforeSend` hook: drop dev events (check `app.isPackaged`)
- [ ] Source maps upload in CI release job
- [ ] Test: throw in renderer → verify event lands in Sentry with stack trace + user role/session id

**Estimate**: 0.5 day.

---

## 2.2 Offline fallback UI for AI

When ai-service is unreachable, the app should degrade gracefully instead of
throwing red errors.

- [ ] New hook `useAiHealth()` in `src/hooks/`:
  - polls `aiHealth()` every 30s
  - exposes `{ state: 'online' | 'offline' | 'checking', latencyMs }`
- [ ] Greys out AI action buttons when `state === 'offline'`:
  - `AIAssistantPage`, `AISearchPage`, `MiniChat`, any `<AskAiButton>` in page toolbars
- [ ] Shell-level indicator: small AI dot in `SystemStatusBar` next to server dot
- [ ] `ChatPage`: cached history visible, input disabled with tooltip "AI service offline"
- [ ] Background reconnect: same backoff schedule as `useServerConnection`
- [ ] Telemetry: emit Sentry breadcrumb on state change (not an error) for post-mortem

**Estimate**: 0.5 day.
**Blocked by**: 2.1 for the telemetry breadcrumb.

---

## 2.3 Error boundaries per lazy-loaded page

Right now `<ErrorBoundary>` wraps the shell. If a lazy page crashes during
render, the whole app whites out. Fix:

- [ ] Wrap each `<Suspense fallback={<PageFallback />}>` in `<ErrorBoundary>`
  - Common file that exports `<LazyPage component={...} />` = Suspense + ErrorBoundary in one
- [ ] Fallback UI: "Something went wrong on this page" + `[Reload page]` + `[Report issue]` (opens mail-to / Sentry feedback widget)
- [ ] Auto-report to Sentry with the page name as tag
- [ ] Test: throw inside `DashboardPage` render → navigate to Projects → should work (shell survives)

**Estimate**: 0.5 day.
**Blocked by**: 2.1 for the auto-report.

---

## 2.4 About / OSS licenses page

Legal requirement for OFL / MIT / Apache components, also adds polish.

- [ ] Script: `scripts/generate-licenses.mjs` reads `package.json` + `Cargo.toml` + `ai-service/Cargo.lock`, produces `src/assets/licenses.json`
- [ ] Runs as pre-build step (`prebuild:electron`)
- [ ] `SettingsPage` → new tab "About" showing:
  - Version (from `VERSION.txt`), build date, OS, arch
  - GPU/CPU info (from `os` module in main)
  - AI model info (from `/health`)
  - Scrollable list of OSS licenses with collapsible full text
- [ ] Must include: Geist (OFL), JetBrains Mono (OFL), Qwen2.5 (Apache 2.0), lucide (MIT), framer-motion (MIT), React (MIT), all top-level deps
- [ ] "Copy all licenses" button for distribution compliance

**Estimate**: 0.5 day.

---

## 2.5 Telemetry opt-in (GDPR)

Even with user being in Romania, GDPR applies. Explicit consent before any
network telemetry.

- [ ] First-run modal (see stage 3.1) includes telemetry opt-in toggle — **default off**
- [ ] `SettingsPage` has a persistent toggle with plain-language description of what's sent
- [ ] Storage key `promix_telemetry_consent` = `'granted' | 'denied' | null`
- [ ] Sentry `beforeSend`: drop event if consent !== 'granted'
- [ ] Document in `PRIVACY.md` at repo root: what gets collected, retention, how to revoke

**Estimate**: 0.5 day.
**Blocked by**: 2.1 (Sentry wiring), 3.1 (first-run flow).

---

## 2.6 DB migration safety

`runMigrations(db)` runs on every boot. If a migration throws mid-way the DB
is in an inconsistent state — the rolling backup from stage 0 only helps
*next* boot. Fix:

- [ ] Pre-migration forced backup — `backups/pre-migrate-v{schema_version}.db`, kept indefinitely (separate rotation from daily)
- [ ] Wrap each migration in a transaction — `BEGIN; <migration>; COMMIT;` with rollback on throw
- [ ] Post-migration sanity check: row counts on critical tables match or exceed pre-migration snapshot
- [ ] If migration fails: restore from `pre-migrate` backup automatically, refuse to boot with a dialog explaining the version mismatch + offering a "Contact support" button
- [ ] Log full diff (schema_version before/after) to `main.log` and Sentry

**Estimate**: 1 day.
**Blocked by**: nothing.
