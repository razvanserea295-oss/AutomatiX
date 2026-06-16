# Stage 3 — UX polish

**Target**: 3-4 working days. Ships as a `.1` minor update after stages 1+2
— real-user feedback should inform priority order within this stage.

## 3.1 First-run wizard

A new client opening the app for the first time currently sees: login. No
server config guidance, no admin password reset, no sample data. Fix with a
4-screen wizard gated on `localStorage.promix_first_run !== '1'`.

- [ ] Screen 1 — Welcome: product name, short pitch, "Continue" button
- [ ] Screen 2 — Server setup:
  - Radio: "This PC (local)" vs "Connect to remote server"
  - If remote: input for URL + "Test connection" button using `testServerConnection()`
  - Hint about Tailscale for cross-network clients
- [ ] Screen 3 — Admin password:
  - If detected admin with default password `1234`, force a change
  - Confirm + strength meter
- [ ] Screen 4 — Preferences:
  - Theme (light / dark / system)
  - Telemetry opt-in (see 2.5) — unchecked by default
  - Optional: "Load sample data so I can explore" checkbox
- [ ] Skip button on screens 3+4 for power users
- [ ] Write `promix_first_run = '1'` on finish

**Estimate**: 1-1.5 days.

---

## 3.2 Keyboard shortcuts + help overlay

Desktop apps live or die by this. Current state: search probably has Cmd+K;
nothing else.

- [ ] Create `src/hooks/useKeyboardShortcut.ts` — registers global listener with cleanup on unmount
- [ ] Core shortcuts:
  - `Cmd/Ctrl+K` — search (likely done already)
  - `Cmd/Ctrl+,` — Settings
  - `Cmd/Ctrl+B` — toggle Sidebar collapse
  - `Cmd/Ctrl+Shift+P` — command palette (like VS Code) — power user
  - `Esc` — close modal, dismiss toast, exit focus
  - `?` — show help overlay (all shortcuts listed)
  - `g p` `g d` `g s` — "go to" page (vim-style leader)
- [ ] Help overlay (`<HelpOverlay />`): modal with all shortcuts, grouped by section, searchable
- [ ] Discoverability: tooltip on menu items includes shortcut hint (e.g. "Settings · ⌘,")

**Estimate**: 1 day.

---

## 3.3 PDF export for reports

Industrial clients will want to print / email PDFs of:
- Offers (`ofertă`) from sales pipeline
- Invoices
- Fișa proiectant (engineering checklist)
- Project reports

Options:
- **@react-pdf/renderer** — JSX-based, nicer DX but adds ~500 KB
- **pdf-lib** — programmatic, smaller
- **print-to-PDF from Electron** — use `webContents.printToPDF()` on a hidden window rendering a print-optimized route

Recommendation: Electron printToPDF — cheapest, reuses existing React components, print CSS gives good control.

- [ ] `PrintLayout` component — minimal header/footer, no shell chrome, tuned for A4
- [ ] Route convention: `/print/:type/:id` loads the data and renders in PrintLayout
- [ ] IPC: `print_to_pdf(url) => Buffer` in main process using a hidden BrowserWindow
- [ ] Save dialog: default filename `{type}-{id}-{date}.pdf`
- [ ] First 4 report types supported. Extensible via `printRegistry` map.
- [ ] `@media print` styles in `index.css` as fallback for user-initiated Ctrl+P

**Estimate**: 1-2 days.

---

## 3.4 Audit log for critical changes

ERP compliance ask — "who changed this piece's price" on 2026-04-19.

- [ ] Schema: `audit_log(id INT PK, user_id INT FK, action TEXT, entity TEXT, entity_id INT, diff_json TEXT, created_at DATETIME)`
- [ ] Migration adds the table
- [ ] Helper `logAudit(ctx, action, entity, entityId, before, after)` in `electron/db/audit.ts` — shallow JSON diff
- [ ] Wire into critical mutations:
  - `save_project`, `save_piece`, `save_contract`, `save_user`, `save_client`
  - Any `delete_*` command
  - Price / quantity changes on stock
- [ ] UI: `SettingsPage` → new "Audit log" tab (admin only)
  - Table with filters: user, entity, date range, action type
  - Row detail: diff viewer (before vs after JSON)
  - Export to CSV
- [ ] Retention: default 2 years; configurable

**Estimate**: 1 day.
**Blocked by**: nothing (can ship independently).
