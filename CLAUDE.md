# CLAUDE.md — Promix Automatix

Guidance for Claude Code in this repo. Read before editing UI or the shell.

## Project snapshot
- **What:** Promix Automatix v1.1.4 — ERP for a concrete-batching-plant + steel-structures company. 71 pages, 8 workspaces.
- **Stack:** React 18 + TypeScript + Tailwind. Routing = **wouter** (NOT react-router). State = **Zustand** (all stores in `src/store/`). Backend = Node/Express (`server/index.ts`, port 3500 via `PROMIX_PORT`). Optional AI service in Rust (port 8100).
- **Web/server app — NO Electron.** Electron was removed (deps, build:electron, electron-builder, the `electron/main.ts`/`preload.ts`/`updater.ts` entry files). The `electron/` folder REMAINS because it holds the **shared backend** (ipc handlers, services, registry, middleware, db, security) that the Express server reuses. Files there lazy-`require('electron')` in try/catch, so they compile & run without the package. Do NOT re-add a static `import ... from 'electron'` — use the guarded lazy-require pattern.
- **Run:** `npm install && npx vite build && npm run server` → http://localhost:3500 (PC) / http://IP-PC:3500 (tablet, same WiFi). Login `admin` / `1234` (seeded). AI optional.
- **Validate:** `npx tsc -p tsconfig.server.json --noEmit` (server, must be 0 errors) + `npx vite build` (frontend; `npx tsc --noEmit` on the app config still shows ~4 pre-existing TS6133 warnings — SsoButtons/ReceptionsTab/users/me).

## Architecture
- **All backend calls go through `apiCommand<T>('command_name', args)`** (`src/api/commands.ts`) — auto-detects Electron-IPC (legacy) vs HTTP. Never raw-`fetch` an `/api/cmd/*` from a page.
- **One shared command registry:** `electron/commands/registry.ts` (`ipcRegister`); `server/commandRouter.ts` reuses the handlers. Add a command once via `ipcRegister`.
- **Auth/permissions:** server-side per-command (`withAuthenticatedUser` / `withAdminUser`, `electron/middleware/auth.ts`); client page-gating in `src/lib/access.ts`. DB roles: admin=1, user=2, manager=3. (Migration 097 removed the `"all"` over-grant from `user`.)
- **Migrations:** drop a numbered `migrations/NNN_*.sql`; the runner auto-applies pending ones in BEGIN/COMMIT with a forced backup. DB (`data/promix.db`) is **AES-GCM encrypted at rest** (key `data/.dbkey`) — never edit it directly; seed/modify via the API.

## UI / UX — SAP Fiori 3 "Belize" (1:1 target)
Dark blue-grey shell bar `#354A5F`, Belize brand blue `#0A6ED1`, SAP **"72"** typeface (bundled `public/fonts/72/`, full-charset → RO diacritics). All theming flows through CSS-variable tokens in `src/index.css :root` (Tailwind classes are var-driven) — change tokens centrally, **never hardcode a hex** in a component.

### Shell (`src/components/shell/`)
- **Titlebar** = the SAP shell bar (44px, `#354A5F`): logo/home left · search (Ctrl+K → command palette) center · notifications + account-avatar-menu (layout switch + logout) right. **Search, notifications, and the account menu live HERE, not in the side nav.**
- **WorkspacePanel** = left side navigation (pure navigation + collapse + a user card). No brand/search/notifications (those are in the shell bar — avoid duplicating).
- **Navbar** = optional horizontal nav mode (nav items only).

### Components (`src/components/ui/`) — use, don't reinvent
- **`<PageHeader>`** — surfaces ONLY the back button, right-aligned action buttons, and an optional tab strip. It **does NOT render a page title** (titles were removed app-wide — the shell breadcrumb + workspace tabs convey location). `title`/`icon`/`subtitle` props are still accepted but ignored. Renders nothing when there are no actions/tabs/back.
- **`<StatusBadge tone label>`** — the only status chip. Tones success/warning/danger/info/progress/special/accent/neutral. Prefer a domain resolver from `src/lib/statusTokens.ts` (`projectStatus`, `invoiceStatus`, `pieceStatus`, …); never hand-roll `bg-status-*` spans.
- **`<ListReport>`** — PageHeader + FilterBar + sortable table + states; for plain list pages (Inventory, Libraries). Don't force it on dashboards/master-detail/dynamic-column pages.
- **`<FilterBar>`** — search + filter selects. **`<WorkspaceTabs title>`** — workspace shell (this is where the per-workspace title shows). `<Button>`, `<Card>`, `<KpiCard>`, `<Tabs>`.

## Work rules
1. **Never delete imports/code blind** — `noUnusedLocals` is on; verify real usage (`grep`) first. Run `tsc -p tsconfig.server.json` after backend edits.
2. **Inventory before converting a page**, then verify each function is still called.
3. Prefer `catch (e: unknown)` + `src/utils/errors.ts` helpers over `catch (e: any)`.

## Notes
- A May-2026 audit found security issues NOT in `Promix-CONTEXT.md` (privilege escalation → fixed in migration 097; committed AI secret; TLS off on email; HTTP auto-update — moot now Electron is gone). See memory `promix-security-audit-2026-05`.
- **Forced first-login password change is LIVE again.** The seeded `admin`/`1234` carries `must_change_password=1` (migrations 099 + 108, scoped to the factory hash). `App.tsx` hard-gates such accounts to `ForcePasswordChangePage` — no route/shell/data access until a strong password is set. New-password policy (`electron/security/password.ts` `validatePasswordStrength`, mirrored client-side): ≥12 chars, upper+lower+digit+symbol, no weak substrings (`1234`/`admin`/`parola`/…). `change_password` clears the flag and rotates all other sessions.
- **Email TLS is strict by default** (`rejectUnauthorized: true` for SMTP & IMAP in `electron/services/emailService.ts`). Bypass only with `PROMIX_ALLOW_INSECURE_SMTP=true` (logged loudly at boot) for an internal self-signed relay.
- **Network/CORS hardening (`server/index.ts`):** CORS is strict — only same-origin + loopback (so Vite :5173 dev works); other origins need `PROMIX_ALLOWED_ORIGINS` (a literal `*` opens all, logged at boot). Helmet CSP is ON (`script-src 'self'`; no inline scripts in the Vite build; `upgrade-insecure-requests` dropped so LAN HTTP works; HSTS only when `PROMIX_TRUST_PROXY=1`). The server **binds 127.0.0.1 by default** — set `PROMIX_LAN=1` (or `PROMIX_BIND_HOST=0.0.0.0`) for tablets/LAN, or `PROMIX_TRUST_PROXY=1` behind a proxy. CAD-upload prefers `Authorization: Bearer`; `?token=` still works but warns. SVG from DXF is DOMPurify-sanitized before render (`src/components/DxfViewer.tsx`).
- **Server self-restart without UAC:** admin-only IPC `restart_server` (registered in `server/commandRouter.ts`) spawns a detached child that waits ~2s and relaunches the same node entry in the same cwd (inherits the parent's elevation → no UAC prompt), writes `.restart-marker`, audit-logs `SERVER_RESTART`, then the current process flushes the DB and exits. Invoke from an admin session: `apiCommand('restart_server')`. Server-mode only (not Electron IPC). Any non-`/api` GET falls back to `index.html` (SPA deep-link fix).
  - **One-shot ops restart (no UAC, no browser):** `powershell -ExecutionPolicy Bypass -File scripts\restart-no-uac.ps1`. It reads the `aiservice` admin creds from `ai-service/config.toml`, logs in over loopback (bypasses CORS), and calls `restart_server`. `-DryRun` validates auth only. Works because `aiservice` is an admin account — see the security caveat below.
  - ⚠️ **Security caveat:** `aiservice` is an **admin-role** account with its password in plaintext in `ai-service/config.toml`. This is what enables the no-UAC restart, but it's also an exposure — anyone with read access to that file has admin. Long-term: give the AI service a least-privilege non-admin role, and use a dedicated locked-down admin for ops restarts.
- DB is seeded with a full demo dataset (clients, projects, leads, quotations, tickets, invoices, deplasări, etc.). known remaining bug: `send_quotation` PDF generation has a pdfmake "Roboto/bold font not defined" bug.
