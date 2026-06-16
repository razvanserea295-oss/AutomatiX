# SAP Fiori migration — handoff

Project: `C:\APLICATIE AUTOMATIX\Automatix-NEW` (React 18 + TS + Tailwind + wouter + Zustand; backend Node/Express in `server/` + `electron/`). Goal: migrate the whole app to **authentic SAP Fiori Horizon** via `@ui5/webcomponents-react` v2.23.1.

## How to build / run / verify
- Type-check: `npx tsc --noEmit` (app) — must be 0 errors.
- Build + deploy: `npm run build:prod` (= `vite build` + `tsc -p tsconfig.server.json`). Output `dist/` is served by the running tenant servers (`:3500` Promix, `:3501` ZET) statically.
- The live app is **login-gated**, so for VISUAL checks use the no-auth preview harness:
  1. `npx vite --port 5181 --host 127.0.0.1` (background)
  2. `node scripts/fiori-shot.mjs "http://127.0.0.1:5181/fiori-preview.html?page=<reservations|tables|menu|recipes>" out.png`
  3. read the PNG. `scripts/fiori-probe.mjs` / `fiori-probe-nav.mjs` pierce shadow DOM to read computed colors/vars.
- `src/fiori-preview.tsx` renders the REAL `AppShell` (businessType="restaurant") + mock store data; add new pages there to preview them.

## DONE (deployed, build-green, verified)
- **Foundation:** `src/ui5-config.ts` (imports `@ui5/webcomponents-react/dist/Assets.js` FIRST, then `fiori-brand.css`); `main.tsx` wraps app in `<ThemeProvider><Modals/>…`; compact density on desktop. Theme defaults to `sap_horizon`.
- **Brand theme** `src/redesign/fiori-brand.css` (retune by editing hex): navy ShellBar `#16213a`, emerald accent `#12936a`, dark navy SideNavigation rail (light items, emerald active item), shell-icon color fix.
- **FioriShell** `src/redesign/shell/FioriShell.tsx` — ShellBar + 2-tier SideNavigation + theme toggle + SaaS/Fiori mode switch. ⚠️ A CONCURRENT SESSION also edits this + `AppShell.tsx` — avoid clobbering.
- **AppShell** `src/components/shell/AppShell.tsx` — renders `FioriShell` when `uiMode==='fiori' || businessType==='restaurant'`, else the custom shell.
- **Pages migrated to Fiori** (DynamicPage; keep their zustand stores): `ReservationsPage`, `TablesPage`, `MenuPage`, `RecipesPage` (master-detail List + AnalyticalTable).

## IN PROGRESS — uncommitted, NOT yet built/verified
- **Breadcrumb "Automatix / {page}"**: new `src/redesign/shell/FioriBreadcrumbs.tsx` (uses Fiori `Breadcrumbs`/`BreadcrumbsItem`) + added `breadcrumbs={<FioriBreadcrumbs page="…"/>}` to all 4 pages' `DynamicPageTitle`. **NEXT: `npx tsc --noEmit` → `npm run build:prod` → screenshot to verify.** (Consider dropping ShellBar `secondaryTitle` to avoid showing the page name twice.)

## TODO (remaining, priority order)
1. **Verify the breadcrumb** (tsc + build + screenshot `?page=reservations`).
2. **Orders/POS → Fiori** — last restaurant page, MOST complex. `src/redesign/pages/OrdersPage.tsx` (still Tailwind); store `src/store/orderStore.ts` (`Order`, `NewOrderItem`, `OrderStatus`, statuses noua→in_preparare→gata→livrata/anulata). Needs a bespoke Fiori layout: menu-picker grid + cart panel + an active-orders status board (not the simple list pattern). Add `?page=orders` to `fiori-preview.tsx` to verify.
3. **Promix (manufacturing) pages → Fiori**, in batches (~65 pages: Financiar, Proiecte, Producție, Vânzări, Aprovizionare, etc.). `uiMode==='fiori'` already wraps them in the Fiori shell, so only the page CONTENT needs converting Tailwind→Fiori using the pattern below.
4. **Service worker cache (HIGH — why the user "doesn't see" deploys):** `sw.js` (registered in `main.tsx`, PROD only) caches old assets → must "clear site data" to see updates. Fix: make SW network-first for HTML/assets or bump a cache version per build. Until fixed, tell user to clear site data / use a private window.
5. **`vendor-ui5` chunk (perf):** `main` ≈1.12MB (UI5 eager). In `vite.config.ts`, convert `manualChunks` (object) → FUNCTION form and add `if (id.includes('@ui5')) return 'vendor-ui5';`. (Object form fails: `@ui5/webcomponents` has no `.` export.)
6. **Stale-tenant nav:** `getServerUrl()` (`src/config/server.ts`) appends `/t/<slug>` from `localStorage TENANT_SLUG` → ZET may fetch `/api/health` from Promix → wrong businessType → wrong shell. Workaround: clear site data.

## The Fiori page pattern (clone for every page)
`<DynamicPage style={{height:'100%'}} titleArea={<DynamicPageTitle breadcrumbs={<FioriBreadcrumbs page="X"/>} heading={<Title>X</Title>} subheading={<Text>…</Text>} actionsBar={<Toolbar design="Transparent"><ToolbarButton design={ButtonDesign.Emphasized} icon={addIcon} text="…" onClick/></Toolbar>}>{KPIs as flex row of Label+Title}</DynamicPageTitle>} headerArea={<DynamicPageHeader><FilterBar hideToolbar><FilterGroupItem label filterKey><Select/></FilterGroupItem></FilterBar></DynamicPageHeader>}><AnalyticalTable columns={useMemo<any[]>} data={useMemo} visibleRowCountMode="Auto" minRows={1} filterable sortable/></DynamicPage>` + a `<Dialog footer={<Bar design="Footer" endContent={<><Button Emphasized>Salvează</Button><Button Transparent>Anulează</Button></>}/>}>` with controlled UI5 Input/Select/DatePicker/TextArea.
- Enums: `import ButtonDesign from '@ui5/webcomponents/dist/types/ButtonDesign.js'` (Emphasized/Positive/Negative/Transparent); `import ValueState from '@ui5/webcomponents-base/dist/types/ValueState.js'` (None/Positive/Critical/Negative/Information). Icons: `import xIcon from '@ui5/webcomponents-icons/dist/x.js'`.
- ObjectStatus for row status; row actions = `<Button design={Transparent} icon=… />`.

## Gotchas (cost build cycles)
- `FilterGroupItem` REQUIRES `filterKey`. `DatePicker` has NO `icon` prop. Type AnalyticalTable `columns` as `useMemo<any[]>`.
- `<Select onChange>` value via `e.detail.selectedOption.dataset.value` (put `data-value` on `<Option>`); all events use `e.detail.*`.
- To restyle deep-shadow UI5 content that exposes NO `::part`: scope the relevant `--sap*` CSS var to the host element (it inherits into shadow DOM). That's how the dark nav + emerald active item were done.
- Horizon param defaults: `node_modules/@ui5/webcomponents-theming/dist/generated/themes/sap_horizon/parameters-bundle.css.js`. The package's own usage guide: `node_modules/@ui5/webcomponents-react/CLAUDE.md`.
- Verify icons exist before importing: `Test-Path node_modules/@ui5/webcomponents-icons/dist/<name>.js` (a missing icon import breaks the vite build).
