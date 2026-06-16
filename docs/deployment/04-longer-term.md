# Stage 4 — Longer-term

**Target**: 5-9 working days. Optional for v1 GA. Pick items based on what
goes wrong in production — don't speculatively build all of these.

## 4.1 i18n scaffolding

Only needed if there's an actual non-Romanian customer in pipeline. Don't
build it speculatively.

- [ ] Pick library: `react-intl` (bigger, full ICU) vs `i18next` (lighter, plugin ecosystem)
- [ ] Extraction script: walk `src/**/*.tsx`, find Romanian strings, emit `src/locales/ro.json` as baseline
- [ ] Wrap app with `<IntlProvider>`
- [ ] Replace all hardcoded strings with `<FormattedMessage id="..." />` — ~2000+ touchpoints in this codebase
- [ ] Initial locales: `ro`, `en`
- [ ] Locale switcher in Settings
- [ ] Date/number formatting via `Intl.DateTimeFormat` + `Intl.NumberFormat`

**Estimate**: 2-3 days for scaffolding, then ~1 day per additional locale.

---

## 4.2 Accessibility audit

Stage 0 covered CSS-level a11y (focus-visible, forced-colors, reduced-motion
etc). This is the deeper pass.

- [ ] `@axe-core/playwright` integration in E2E suite
- [ ] Critical flows audited: login, dashboard, create/edit a project, search
- [ ] Keyboard-only navigation — every interactive element reachable, focus order logical
- [ ] ARIA landmarks (`<main>`, `<nav>`, `<aside>`, `role="search"` on TopBar search)
- [ ] `aria-label` on icon-only buttons — spot check there are lots of these in TopBar, Sidebar
- [ ] Screen reader pass: NVDA on Windows, VoiceOver on Mac
- [ ] Color contrast automated via axe — all text AA; critical (error/success states) AAA

**Estimate**: 2 days.

---

## 4.3 Performance baseline

Measure once, set budgets, prevent regressions.

- [ ] Lighthouse profile on Dashboard, Parts Tree, Projects pages
- [ ] Budget targets:
  - FCP < 1s on dev hardware
  - TTI < 2s
  - Main bundle < 300 KB gzip
  - Individual page chunk < 50 KB gzip
- [ ] Current state: `index-*.js` ~70 KB gzip ✓, `vendor-react` 43 KB ✓, `vendor-motion` 41 KB (big — audit usage), `vendor-cad` 20 KB (DXF — only loaded on CAD pages?)
- [ ] React Profiler on Dashboard — find expensive re-renders, memo where it matters
- [ ] Virtualize long lists — `react-window` already imported; audit where it's actually used vs where it should be
- [ ] IPC call batching for chatty pages (Dashboard likely calls several queries in waterfall)

**Estimate**: 1 day.

---

## 4.4 E2E test coverage expansion

Playwright exists — extend it.

- [ ] Inventory of current coverage: `tests/e2e/*.spec.ts` — map which features are tested
- [ ] Per role: admin, inginer, operator, contabil — golden-path test each
- [ ] Critical CRUD: create project → add pieces → save → reload → verify persisted
- [ ] Cross-process: renderer ↔ IPC ↔ DB round-trips on representative commands
- [ ] AI path: mock ai-service with a fixture server, assert chat UI handles online/offline/timeout
- [ ] Run in CI pre-release as blocking check (already partially wired via `pretest:e2e`)
- [ ] Target: 80% coverage of critical flows (not line coverage, flow coverage)

**Estimate**: 2-3 days.

---

## 4.5 Observability dashboard (nice-to-have)

Once Sentry (2.1) is in, add an internal "support dashboard" for the
developer / support team:

- [ ] Grafana / retool-style simple dashboard showing:
  - Active install count (opt-in ping every 24h)
  - Version distribution
  - Top errors by frequency
  - AI service uptime across installs
- [ ] Self-hosted on the same VPS as 1.2 Option B

**Estimate**: 1-2 days. **Deferred — build only when scale demands.**

---

## 4.6 Windows auto-start option

Client ask after first install — "can the app start when Windows starts?"

- [ ] `app.setLoginItemSettings({ openAtLogin: true })` on Windows
- [ ] Settings toggle: "Start Automatix with Windows"
- [ ] Graceful: if started via auto-start and no session, stay minimized in tray instead of full window
- [ ] Tray icon + context menu: Open, Quit, Check for updates

**Estimate**: 0.5-1 day.
