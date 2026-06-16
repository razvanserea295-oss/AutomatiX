# Frontend audit — 2026-06-14

Multi-agent audit of the redesign frontend (35 pages + shell + motion + tokens + Tauri).
96 findings (19 high / 49 medium / 28 low). 11 of 16 auditors were rate-limited mid-run, so
this covers the highest-value pages (Finance, StationDetail, Maintenance, Libraries, Inventory,
Warehouse, Projects, Briefings, Contract, Clients, Deplasari, Documents) — re-run the audit
workflow `frontend-audit-automatix` for the remaining groups (sales, parts, comms, service,
calendar, admin, checklist) + the shell/tokens/transitions/tauri cross-cutting agents.

## 1. Layout / no-scroll (viewport-fit) — the #1 ask

**Root cause:** `src/redesign/ui/Page.tsx:17` is `flex flex-1 flex-col min-h-0 overflow-y-auto`
("whole page scrolls"). That makes the page the scroll container. Pages then stack
`header → KPI strip → workbench → (sometimes) Tools zone` in a `space-y-6` `Page.Body` with
nothing `flex-1 min-h-0` — so the command bar + KPI ledger scroll out of view (naive-stacked).

Maturity levels today:
- **Naive-stacked (whole page scrolls):** Finance (all 4 tabs), StationDetail (all tabs),
  Maintenance, Inventory, Warehouse, Libraries.
- **Half-fit (master rail bounded, detail/table not):** Projects, ProjectBriefings, Contract, Clients.
- **Closest-to-correct (internal pane, trailing zone overflows):** Documents (`min-h-[52vh] max-h-[72vh]`
  + sticky thead `documents/DocumentsPage.tsx:737`), Contract master rail `:325`, Deplasari history.

**Standard fix (uniform):** bounded 3-zone flex column —
1. `Page.Body` → `flex flex-col min-h-0` (drop `space-y-6`, explicit gap). *(NEW: `<Page fit><Page.Body fit>` added 2026-06-14.)*
2. command bar + KPI strip → `shrink-0` (pinned).
3. workbench row → `flex-1 min-h-0`; table/list inside = the ONLY `overflow-y-auto` pane + sticky `<thead>`.
4. master-detail: bound the DETAIL column like the master rail (`xl:max-h-[calc(100vh-22rem)] overflow-y-auto min-h-0`, hero `sticky top-0`).
5. move trailing "Tools/Enhancements" zones (Clients CRM, Documents, Inventory consumptions, Libraries) off the main scroll axis (tab/disclosure/drawer).

Retire while converting: (a) `xl:sticky` rails (symptom of page-scroll); (b) `TableFiller` ghost-rows vs `min-h-[Nvh]` panes (Deplasari, Clients, Documents).
**Reference model:** `MaintenancePage.tsx:697-899` ServiceForm sheet = `shrink-0` header / `flex-1 min-h-0 overflow-y-auto` body / `shrink-0` footer.

### Worst offenders
| Page | File:line | Problem |
|---|---|---|
| FinancePage | `:271-456,:615,:829,:1006` | All 4 tabs naive-stacked; no table has overflow/max-h |
| StationDetailPage | `:376-451,:718,:834` | No internal pane on any tab; tables uncapped |
| MaintenancePage | `:338-453` | Service list unbounded; chrome scrolls away |
| LibrariesPage | `libraries/LibrariesPage.tsx:325-330` | 7 enhancement cards in a 4/12 rail drive long scroll |
| InventoryPage | `:231,:363-408` | 4 stacked zones; consumptions table no max-height |
| WarehousePage | `warehouse/WarehousePage.tsx:319,:328` | Workbench table `overflow-x-auto` only, no vertical cap |
| ProjectsPage | `:586,:476` | Detail column unbounded (rail bounded) |
| ProjectBriefingsPage | `:327,:702/:740` | `h-full` never resolves — inner scroll never engages |
| ContractPage | `contract/ContractPage.tsx:365,:446` | Detail column + create form unbounded |
| ClientsPage | `:369,:453-463` | Bounded table + bottom CRM zone = double scroll |
| DeplasariPage | `:237,:331` | Chrome not pinned; `min-h-[55vh]` table overflows |
| DocumentsPage | `documents/DocumentsPage.tsx:737,:850-861` | Best inner pane, but bottom Tools zone + min-h floor overflow |

## 2. Legibility
Systemic: 10px (`text-pm-2xs`) data + muted-on-mesh + extra `/50–/60` opacity = borderline unreadable.
- Bump in-row/data text to `text-pm-xs` (12px) min; reserve `text-pm-2xs` for uppercase eyebrows only; `tabular-nums` on dates/money.
- Drop `/50–/60` opacity on `text-content-*` (token already encodes contrast).
- **Color/emoji-only status (high):** Finance risk chip + 🔒 `:356-377`, Briefings priority `●` `:390,:716`, Inventory row rail `:223-227`, Warehouse capacity bar `:529-538` → route through `StatusBadge` + RO label + aria.
- **Raw/English enums to RO users:** Finance HIGH/MEDIUM/LOW, Warehouse `partially_issued`/`reserved` `:641`, Projects `low/medium/high` `:708`, Warehouse `' ⚠'` literal `:632` → RO resolvers (mirror `statusTokens.ts`).
- Mixed font scales per row (Finance Total `:653-655`, Documents `:808-815`); truncation hides data (Projects `:816`, Clients email `:311-323`); touch targets <44px (Deplasari `h-7 w-7` `:380-389,:465-475`).

## 3. Layout & visual aspect
- **Hand-rolled inputs bypass `filterControls` (no focus ring) — high:** StationDetail `:699-706,:817-822,:928-939`, Libraries legacy Button → FormModal / shared Input+Select.
- Flat corners break the rounded language (Deplasari modals + `.input-md` `:1650`, Maintenance, Projects bars) → `rounded-2xl`/`xl`/`full`.
- Duplicate primary action (StationDetail `:393`&`:438`, Warehouse `:278`&`:322`).
- Misaligned grid breakpoints (Contract `:365` vs `:486`, Finance rail `:305-308`, Station `:474`).
- `items-start` strands short rail beside tall table (Inventory `:268`, Warehouse `:317`, Projects `:480`).
- Async layout jump `hasRail` (Finance `:308`) → skeleton rail. Decorative placeholder as data (Projects 30-dot grid `:734-743`). Misleading zero states (StationDetail lazy KPIs `:237-272`, Maintenance `:314-333`). Raw null cell (Documents `:812` → `{value || '—'}`).

## 4. Motion / animations
### 4a. Regression (do first — surgical, universal)
KPI values + bars **snap to final** because `KpiCard.tsx:77` renders a static span and bars only `transition` on data change, not mount. Tabs hard-swap.
- KPI count-up: add `useCountUp` (0→value ~600ms, `tabular-nums`, perf-tier gated) in `KpiCard.tsx`.
- Bars draw in: width 0 → target via mount flag + `transition-[width]` (Finance `:402,:992`, Projects `:1110,:1180`, Warehouse `:533`, Maintenance `:474`, Inventory `:223`).
- Tab cross-fade: key panel on active tab (Finance `:200-206`, Warehouse `:329-349`, StationDetail, Briefings `:725-795`).
- Row/card stagger: push existing `enter-up` + `animationDelay` DOWN to rows/cards (it's already at zone level e.g. `MaintenancePage.tsx:227/313/335`); re-key on filter/search change.

### 4b. Complex-animation catalog (the "many more" ask)
Timeline draw-in (StationDetail `:547-565`); shared modal entrance (Deplasari 4 modals, Finance `:459`); master-detail compose-in keyed off `selected.id` (the row↔hero `vtName` morph already exists `ClientsPage.tsx:120-126`); photo/lightbox polish (Maintenance `:405-426,:529-548,:948-998`); expand/collapse grid-rows (Projects DXF `:1130-1161`, Briefings `:944-968`); drag-reorder FLIP (Documents chips `:642`); read↔edit cross-fade (Contract `:501-517`); attention pulse on overdue (Deplasari `:336`) / green flash on promote (Libraries); skeleton→content cross-fade (Documents `:488-532`, Finance rail). **Gate all behind `data-perf-tier`.**

## 5. Shell
`.page-vt-root` is correctly `overflow-hidden`, but `Page.tsx:17` re-added `overflow-y-auto` — fixed via the new `fit` mode (split scroll vs fit). `KpiCard.tsx` is the other shared primitive (count-up + `loading` skeleton). Keep `vtName`/`startMorphTransition` VT wiring intact.

## 6. Design tokens
System is sound; failures are bypass/misuse: inconsistent radius; `text-pm-2xs` abused for data; opacity modifiers on content tokens; status not via `StatusBadge`; ad-hoc paddings + legacy `@/components/ui/Button`.

## 7. Tauri 2.0 packaging plan
App is now a bounded single-viewport app = right shape for a desktop window. Prior desktop pain: stale ASAR white-screen, separate Roaming DB stuck at migration 069 (migrations not packaged), Electron/Node-22 ESM crashes.
1. **Thin shell pointing at the `:3500` server URL** — NOT a second in-process DB (avoids the stale-Roaming-DB trap). If offline DB ever needed, bundle migrations as a Tauri resource + run on launch.
2. Scaffold `src-tauri/` (Rust core), `beforeBuildCommand` = web build, `frontendDist` = build output, fixed window size with `minWidth/minHeight` = no-scroll target, v2 capabilities allowlist (`http` to :3500, `shell/dialog/fs` only if export needs).
3. CORS: Tauri origin is `tauri://localhost` — add to `PROMIX_ALLOWED_ORIGINS` before first connect (server 500s otherwise).
4. Verify viewport-fit at the fixed window floor (the no-scroll work is the prerequisite).
5. Tauri v2 signed updater plugin (no more stale-bundle stranding). Single all-users install.
6. `data-perf-tier` can default to the richer tier on the known desktop target (keep the gate).

## Recommended implementation order
1. **Transition/KPI regression** (surgical, universal): `KpiCard` count-up + bar draw-in + keyed tab cross-fade.
2. **Layout no-scroll** (#1 ask): use the new `fit` mode; convert each page to the bounded 3-zone column; High-severity pages first (Finance, StationDetail, Maintenance, Libraries, Inventory, Warehouse, then the half-fit master-detail set).
3. **Legibility + aspect:** `text-pm-2xs`=eyebrows-only; data ≥ `text-pm-xs`; drop opacity modifiers; status via `StatusBadge` + RO resolvers; normalize radius; dedupe actions; fix zero states.
4. **Complex animations:** push stagger to rows/cards + the 4b catalog, all perf-tier gated.
5. **Tauri 2.0:** thin shell to :3500 after no-scroll lands.

---
*Note (2026-06-14): the page-transition shell-static fix + transparency-after-transition fix + the `Page` fit-mode foundation are already DONE. See memory `animations-restore-2026-06-14`.*
