# Transcription UI Brief

Synthesis of two design-talk transcriptions (Eleken data-heavy UX, Builder.io production-code UI) mapped onto Automatix `saas` shell + migrated pages. Cross-referenced with `UI-UX-ANALYSIS.md` (live walkthrough).

**Note:** The audio files are industry talks, not direct user interviews. Requirements below interpret *principles* and merge them with known Automatix pain points.

---

## Principles extracted

| Source | Principle | Automatix interpretation |
|--------|-----------|---------------------------|
| Eleken | Prioritize what matters first | KPI strip max 4; summary numbers must match visible lists |
| Eleken | Depth on demand | Master-detail, drawers, collapsible filters — not everything on one screen |
| Eleken | Match depth to user | Standard vs advanced flows; tooltips on dense fields |
| Eleken | Clear IA + two-level nav | Workspace rail + labeled sub-panel; comms not buried under "tools" |
| Builder | Design system in production code | `PageChrome`, `Panel`, `pm-*` tokens — no one-off page chrome |
| Builder | Card/grid alignment | Consistent `Panel` header rhythm; KPI cards same height in a row |
| Builder | Responsive shell | Hamburger drawer &lt; lg; desktop rail + workspace panel |
| Builder | Sort/search on tables | Tables need client sort where data is local |

---

## Actionable items

### High

| Item | Maps to | Status |
|------|---------|--------|
| Split Email / Mesaje / Alerte into **Comunicare** workspace (not Instrumente) | `workspaceNav`, `roleWorkspace`, routes | **Done this pass** |
| Rail labels visible by default (icon + short text) | `Navbar.tsx`, `shell.css` | **Done this pass** |
| Fix workspace sub-nav active highlight on tab routes | `AppShell`, `App.tsx` `activeTabId` | **Done this pass** |
| KPI / list number coherence (Sales Hub) | `SalesHubPage` | Done prior |
| `Sales Hub` → Romanian **Vânzări** in page chrome | `SalesHubPage`, titles | **Done this pass** |

### Medium

| Item | Maps to | Status |
|------|---------|--------|
| Dashboard / Financiar profit contradiction | `DashboardPage`, `FinancePage` | Pending — separate data audit |
| Skeleton first-load + `ErrorState`+Retry on all data pages | Per-page wiring | Pending — batch |
| Chart period toggle matches axis labels | `DashboardPage` revenue widget | Pending |
| Table sort on high-traffic lists | Clients, Procurement, etc. | Pending |

### Low

| Item | Maps to | Status |
|------|---------|--------|
| Dashboard column balance when Alerte empty | `DashboardPage` | Pending |
| Pipeline "Convertite" column visual rhythm | `SalesHubPage` | Pending |
| Trailing commas / deadline placeholders in project list | `ProjectsPage` | Pending |
| Contextual `?` tooltips on dense forms | Engineering, Fișa | Pending |

---

## Shell vs pages vs tokens

| Layer | Owns |
|-------|------|
| **Shell** | Rail labels, Comunicare vs Instrumente grouping, mobile drawer, titlebar context |
| **Layout** | `PageChrome`, `Panel`, `DashboardLayout`, `MasterDetailLayout` |
| **Pages** | Module content, KPI definitions, table sort, empty/error states |
| **Tokens** | `pm-*`, `surface-*`, `accent`, `--shell-rail-w`, `data-density` |

---

## Conflicts with current direction

| Transcription idea | Conflict | Resolution |
|--------------------|----------|------------|
| Drag-and-drop modular dashboard | Single SaaS ERP, no per-user layout editor in shell | Keep optional card layout edit off by default; dashboard KPI order via existing store only |
| Separate "beginner vs expert" product tiers | One manufacturing UI (`uiMode` locked `saas`) | Use collapsible sections + tooltips instead of tier split |
| Generic AI-generated UI | Must match `Panel` / `PageChrome` | All new work through redesign layout imports |
| Fiori / code / hybrid shells | Deprecated for end users | Changes target `saas` path only |

---

## Routes to verify after this pass

- `/` — Dashboard
- `/sales-hub` — title "Vânzări", KPI/board alignment
- `/chat`, `/email`, `/alerts` — **Comunicare** workspace in rail + sub-panel highlight
- `/tutorial`, `/download-app` — **Instrumente** workspace (no comms items)
- Resize to &lt;1024px — hamburger drawer lists Comunicare separately
- `/reports` — migrated page still renders
