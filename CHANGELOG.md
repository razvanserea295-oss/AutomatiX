# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · respects [SemVer](https://semver.org).

The server serves each `## [version]` section verbatim via
`GET /api/release-notes/<version>`. The desktop client fetches its current
version's notes on first login after an auto-update and shows them in a modal.

---

## [1.1.6] - 2026-06-24

### Added
- **Setări → Aspect** reorganizat în tab-uri (Temă & culori, Citibilitate, Layout & shell) cu etichete mai clare.

### Changed
- **Installer Windows** — se închide automat după instalare (nu mai rămâne blocat pe ecranul „Finalizare”).

### Fixed
- **Installer Windows** — detectează corect dacă `automatix.exe` rulează în fundal înainte de upgrade.

---

## [1.1.5] - 2026-06-22

### Added
- **Asistență la distanță (RustDesk)** — pagină integrată în Instrumente pentru suport rapid către clienți externi (link temporar + portable preconfigurat), conectare cu ID/parolă (viewer nativ desktop sau web), endpoint-uri înregistrate, istoric sesiuni și audit.
- **Marketing landing site** (apex/www) — animated, Apple-grade presentation with a scroll-reveal hero, bento feature grid, and a sticky scroll narrative; lead capture via `/api/lead`.
- **Offline license system** (Ed25519) — signed keys, per-instance activation, a license-gated installer download, and a signed revocation list (CRL).
- **License required at login** — a gated, unlicensed instance shows an activation screen before the login form, so a copy obtained from any source cannot be used without a valid key.

### Changed
- **Two-domain split** — the marketing landing serves apex/www and the app SPA serves `app.automatix.online`, both from the single backend.

### Security
- **`must_change_password` is now enforced server-side** — a seeded/default admin can no longer drive the API; every command except password-change/login/logout is rejected until the password is rotated.
- **Factory default passwords are neutralized at boot** — the seeded admin password is rotated to a random one (printed once to the server console) and the shared-password demo accounts are deactivated. Override for local dev with `PROMIX_ALLOW_DEFAULT_CREDS=1`.

### Fixed
- **Fresh-database boot crash** caused by a duplicate migration number (#112) — resolved, so new tenants and clean reinstalls migrate cleanly.

---

## [1.1.3] - 2026-05-02

### Added
- **Bottom status bar** showing current page, signed-in user, and live server connection (green pulse / red).
- **Mobile preview web page** at `/` and `/m` — read-only dashboard servable from a phone browser.
- **Optimistic concurrency control** on projects, contracts, and pieces — concurrent edits now produce a clear 409 instead of silently overwriting.
- **Real-time updates via Server-Sent Events** (`GET /api/events`) — handoffs, projects, and pieces propagate to all connected clients within ~250ms (no more 30s polling).
- **Outbound email notifications** for new handoffs and overdue-SLA escalations, using the first admin/manager email account as system mailbox.
- **First-login patch notes modal** — every auto-update surfaces what changed.
- New `automatiX-` invoice prefix replaces `PROMIX-`.

### Changed
- **Theme** rebuilt to a sober industrial palette: pure-black status rail, near-black chrome, neutral-gray page canvas, amber accent (no blue).
- **Branding** swept to "automatiX" across every user-facing string and console log.
- **Page area** now visibly lifts above the navbar (was the same color in older builds).
- **Auto-updater** feed URL is now read from `AUTOMATIX_UPDATE_URL` env (legacy `PROMIX_UPDATE_URL` still honored).
- Dropdowns and popovers now share the chrome color — a single coherent dark layer above content.

### Fixed
- TopNav dropdown and TabBar were locked to a stale slate hex (`#232a31`) — now follow the active theme.
- All `bg-blue-*`, `text-blue-*`, `bg-indigo-*` classes replaced with amber/orange equivalents.
- Page wrapper used `bg-surface-primary` (chrome color) instead of `bg-surface-page`, hiding the workspace separation.

---

## [1.1.2] - 2026-04-30
Initial post-Electron-migration release.
