# UI Density Audit

Audit date: 2026-06-24  
Default mode: **compact** (`data-density="compact"` on `<html>`, `:root` tokens = compact)  
Migration status: **complete** — all 54 V2 pages under `src/v2/pages/`

## System delivered

| Artifact | Path |
|----------|------|
| Density tokens (3 modes) | `src/redesign/tokens/density.css` |
| Apply + persist API | `src/lib/density.ts` |
| React hook | `src/hooks/useDensity.ts` |
| Boot provider | `src/components/DensityProvider.tsx` |
| Storage key | `localStorage['ui-density']` (+ `promix-layout-storage` sync) |
| Settings UI | V2 `SettingsPage`, classic `AspectSection` / `SettingsPage` |
| Analytics KPI/charts | `src/v2/analytics/` — `KPICard`, `DataTable`, `DashboardGrid` |
| Page primitives | `src/v2/components/app/Page.tsx` — `Page fill`, `PageBody`, `DataTableCard` |

## Pages audited — rows visible (1080p, ~900px content height)

| Page | Before (comfortable) | After (compact) | After (dense) | Status |
|------|---------------------|-----------------|---------------|--------|
| **ApiListPage** template | ~7–8 rows | ~12–14 rows | ~16–18 rows | ✅ |
| **Dashboard** KPI strip | 4 cols, 88px | 4–6 cols, 80px | 6 cols, 72px | ✅ `KPICard` |
| **Reports** | loose sidebar | 240px sidebar + `DataTableCard` | same | ✅ |
| **Finance** | loose KPI grid | `PageKpis` + `KPICard` | same | ✅ |
| **Sidebar / Top bar** | 48px / 220px | 44px / 200px | 40px / 180px | ✅ tokens |

## V2 page migration checklist (54/54)

### List / table (`Page fill` + `DataTableCard` or `ApiListPage`)
- [x] ClientsPage, UsersPage, UserSessionsPage, MaterialsPage, SuppliersPage
- [x] PurchaseOrdersPage, GoodsReceiptsPage, WarehousePage, ProjectsPage
- [x] StationsPage, ServiceTicketsPage, DocumentsPage, AlertsPage
- [x] QuotationsPage, ContractsPage, LicensesPage, ArhivaPage
- [x] LibrariesPage, FisaTemplatesPage, PiecesOrderingPage, TasksPage
- [x] SharedFilesPage, BriefingsPage, LicensesPage

### Dashboard / analytics
- [x] DashboardPage — `KPICard`, `PageKpis`, density list items
- [x] ReportsPage — `DataTableCard`, compact config sidebar
- [x] FinancePage — `KPICard`, `DataTableCard`
- [x] ManagerControlPage — `KPICard`, density handoff rows
- [x] PipelinePage — `KPICard` stage strip
- [x] UserSessionsPage — `KPICard`

### Master-detail / complex
- [x] ProjectDetailPage — `PageSplit` / `PagePanel`
- [x] LeadPage — `density-form-grid`
- [x] QuotationsPage — `PageSplit` master-detail
- [x] StationDetailPage, KanbanPage, PartsTreePage, FisaProiectantPage, DeplasariPage

### Communication
- [x] ChatPage, EmailPage, CalendarPage

### Tools / admin / settings
- [x] SettingsPage — density toggle + `density-form-grid`
- [x] TutorialPage, PrintPage, RemoteSupportPage, DownloadAppPage, AiPage, UserActivityPanel

### Auth / public (lighter touch — density tokens)
- [x] LoginPage, LicenseLoginGate, ForcePasswordChangePage, LicenseActivationPage
- [x] CustomerPortalPage, RfqResponsePage, DownloadPage, QuickSupportGuestPage

## Components updated

- `button`, `input`, `table`, `card`, `badge`, `tabs`, `dialog`, `label`
- `StatCard` (legacy), `KPICard` (analytics), `Page` primitives
- `AppSidebar`, `TopBar`, `Avatar`
- `layout.css`, `globals.css` — page padding, split widths, viewport math

## Utility classes (opt-in)

```html
<div class="density-page">…</div>
<table class="table-density">…</table>
<div class="density-kpi">…</div>
<div class="density-form-grid density-form-grid-3">…</div>
<div class="density-list-item">…</div>
<div class="density-toolbar">…</div>
<div class="density-setting-row">…</div>
```

## Philosophy checklist

- [x] Compact default for new sessions
- [x] Three global density levels via `data-density`
- [x] CSS custom properties drive components
- [x] Settings toggle persisted
- [x] Tabular nums on data tables
- [x] Tables opt-in via `.table-density` / `Table` component
- [x] Every V2 page on `Page fill` pattern (or justified `max-w-*` for narrow tools)
- [x] Dashboard + Reports + Finance use `@/v2/analytics` KPI components

## Follow-up (out of scope)

- Classic redesign pages in `src/redesign/pages/` — partially `density-compact` already
- Skeleton loaders — align heights to `--density-row-h` in loading package
- Reports chart band (optional `AnalyticsBarChart` when report sources expose time series)
