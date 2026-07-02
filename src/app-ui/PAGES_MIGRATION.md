# Rebuild from zero — page migration

**Design system:** `src/app-ui/` (Card, Kpi) — all pages get new cards via `@/redesign/ui` re-exports.

**Layout:** `src/redesign/layout/` (PageChrome, Panel, *Layout) — import via `@/app-ui`.

## Status

| Status | Pages |
|--------|-------|
| Done | Dashboard, Alerts, Clients, Reports, Sessions, Projects, Finance, Kanban, SalesHub, Warehouse, Inventory, Documents, Settings, AI, Calendar, Maintenance, Libraries, Email, Chat, Users, PartsTree, Procurement, FisaProiectant, Deplasari, PersonalTasks, FisaTemplates, ProjectBriefings, Tutorial, Quotations, ServiceTickets, PiecesOrdering, ManagerControl, **Contract, Print, DownloadApp, StationDetail, LeadDetail, Licenses, SharedFiles, SourceArchive, PublicDownload, CustomerPortal, RfqResponse** |
| Pending | — (all page shells migrated) |

## Rule per page

1. Copy store/API logic unchanged
2. Replace JSX with `PageChrome` + `Panel` + fixed grid (`DashboardLayout` or `MasterDetailLayout`)
3. Remove: TierToggle, EditLayoutButton, HeroHeader, GlassCard, enter-up animations
4. KPI strip: max 4, `Page.Kpis cols={4}`

## Batch 6 (2026-06-23)

Migrated this session: **Contract**, **Print**, **DownloadApp**, **StationDetail**, **LeadDetail**, **Licenses**.  
Layout polish: **Kanban**, **Calendar** — wrapped in `DashboardLayout` (KPI strip on Calendar).

## Missed-route audit (2026-06-24)

Found and fixed missed route-visible shells:

- **Birou de control** (`/manager-control`, `/birou-control`) — workspace tab now loads the migrated `src/redesign/pages/ManagerControlPage.tsx` instead of the obsolete legacy page.
- **SharedFiles** (`/shared-files`) — moved the page shell to `DashboardLayout` + `PageChrome` + `Panel`; file/folder logic unchanged.
- **SourceArchive** (`/arhiva`) — moved the admin source archive shell to `DashboardLayout` + `PageChrome` + `Panel`; download/upload/restart logic unchanged.

Intentional leftovers after marker scan: legacy primitive exports (`GlassCard`, `HeroHeader`, `PageHeader`, `CardGrid`, `TierToggle`, `EditLayoutButton`) remain for compatibility/internal components; `src/pages/ManagerControlPage.tsx` remains obsolete but no route imports it.

## UI polish pass (2026-06-24)

Full-app refinement while away-from-keyboard:

- Restored **`PageChrome`** + `chrome` prop on all 39 `*Page.tsx` shells (`scripts/patch-page-chrome.mjs`)
- **`polish-pass.css`** — micro-interactions, panel/KPI mount, drawer/dialog polish, table row hover
- **`GlassCard`** re-skinned to unified `pm-card` / `surface-card` tokens
- **`PageLoadingShell`** for full-page loading (Dashboard, Projects, Clients, Users, …)
- Migration gate: `npm run check:migration` ✅ · `npm run build:prod` ✅


`DashboardPage` rebuilt from scratch with `dashboard/` subcomponents:

- KPI strip (max 4): Venituri, Proiecte active, Necesită atenție, Blocaje operaționale — `@/app-ui` `Kpi`
- Unified attention feed (alerte + handoff-uri), proiecte active, acțiuni rapide (paletă), operațional, stoc critic, grafic venituri (`bodyClassName="!overflow-hidden"`)
- Data: `dashboardStore`, `projectStore`, `materialStore`, `alertStore`, `handoffStore`, `settingsStore`

## Strict route audit (2026-06-24)

Inventory sources checked:

- `src/App.tsx` direct routes, aliases, public hash routes, workspace fallback (`/:tabId`), `TAB_TO_WORKSPACE`, `WORKSPACE_DEFAULT_TAB`, and `TAB_PATH_ALIASES`.
- `src/pages/workspace/*.tsx` lazy tab renderers.
- Route-visible pages under `src/redesign/pages/**` and routed public/auth pages under `src/pages/**`.
- Dynamic tab/lazy imports including workspace tabs, detail routes (`/parts-tree/:projectId`, `/stations/:id`, `/sales-hub/:id`) and public routes (`/download`, `/portal/:token`, `/rfq/:token`).

Found and fixed additional missed route-visible shells:

- **PublicDownload** (`/download`) — public standalone download page now uses `DashboardLayout` + `PageChrome` + `Panel`; public `/api/download/latest` behavior unchanged.
- **CustomerPortal** (`/portal/:token`) — public client portal now uses `DashboardLayout` + `PageChrome` + `Panel` for normal, loading, and invalid-token states; read-only data rendering unchanged.
- **RfqResponse** (`/rfq/:token`) — public RFQ response flow now uses `DashboardLayout` + `PageChrome` + `Panel` for normal, loading, invalid-token, submitted, and decline states; submit behavior unchanged.

Confirmed route-visible pages already migrated in this stricter pass:

- Workspace detail states: **PartsTree** drill-in (`/parts-tree/:projectId`), **StationDetail** (`/stations/:id`), **LeadDetail** (`/sales-hub/:id`), and **Projects** detail modal are on the current redesign/layout shell.
- Workspace pages under `src/pages/workspace` render migrated pages; `ProcurementWorkspacePage` (`/purchase-orders`) is already on `DashboardLayout` + `PageChrome` + `Panel`.

Remaining marker exceptions:

- `src/pages/ManagerControlPage.tsx` still contains `HeroHeader`, `GlassCard`, and `enter-up`, but it is obsolete: current `/manager-control` and `/birou-control` import `src/redesign/pages/ManagerControlPage.tsx`.
- `SectionHeader` remains inside page sub-sections where it labels internal panels, not page shells (for example finance/report/settings/download-app section blocks).
- `enter-up` remains in internal transient rows/status strips (`ChatPage`, `AIAssistantPage`, `PartsTreePage`) where it animates messages/progress rows rather than a page shell.
- `mx-auto` / `max-w-*` remains in loaders, icons, modal dialogs, detail panes, and centered form content; these are internal components or constrained editor states, not route-level page wrappers.
- `<h1>` remains in layout primitives (`PageChrome`, `PageHeader`, `HeroHeader`) and internal/detail components (`PieceDetailView`, `AccessDeniedView`, auth/login gates). Print-only HTML in `ProcurementWorkspacePage` intentionally keeps `<h1>Lista Furnizori</h1>` for the printed document.
