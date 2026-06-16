# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · respects [SemVer](https://semver.org).

The server serves each `## [version]` section verbatim via
`GET /api/release-notes/<version>`. The desktop client fetches its current
version's notes on first login after an auto-update and shows them in a modal.

---

## [1.2.1] - 2026-05-02

### Test
- Smoke test al endpoint-ului de upload.
- Fișier random 2MB cu hash verificat.

---

## [1.2.0] - 2026-05-02

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
