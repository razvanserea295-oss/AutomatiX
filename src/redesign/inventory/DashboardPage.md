# DashboardPage — function inventory
**Route:** dashboard · **Workspace:** standalone · **File:** pages/DashboardPage.tsx · **Lines:** 629
**Props/contract:** `DashboardPage({ user, onNavigate }: { user: User | null; onNavigate: (page: string, opts?: Record<string, unknown>) => void })`

> The page file itself contains **zero** `apiCommand` literals — all data access is delegated to Zustand stores, the AI HTTP client, and three embedded widgets. The commands below are the load-bearing ones the page transitively triggers (on initial load, manual refresh, the 5s poll, time-range changes, and inside its owned widgets). All MUST survive the rebuild.

## Backend functions (apiCommand) — ALL must survive
Triggered directly by this page's load/refresh/poll path (via stores):
- `get_dashboard_data` — main dashboard snapshot (projects_total/active/in_production, materials_critical_stock, active_alerts, documents_total, revenue_total, costs_materials/labor/other_total, profit_total); accepts `{from,to}` date range · via `useDashboardStore.fetchDashboardData` (refreshAll, setRange, poll tick)
- `get_finance_overview` — finance aggregates (total_actual_revenue/cost/profit fallback) · via `useDashboardStore.fetchFinanceOverview`; 403 expected for non-finance roles (left null)
- `get_sales_stats` — sales/lead pipeline stats · via `useDashboardStore.fetchSalesStats` (part of refreshAll; not directly rendered here but always fetched)
- `get_projects` — project list for "Proiecte active", "Producție pe etape", project counts · via `useProjectStore.fetchProjects`
- `get_materials` — materials list for "Stoc critic", total materials count · via `useMaterialStore.fetchMaterials`
- `generate_system_alerts` — server regenerates alert rows before fetch (best-effort, errors swallowed) · via `useAlertStore.generateAndFetch`
- `get_alerts` — alerts list for "Alerte" zone · via `useAlertStore.generateAndFetch`
- `get_my_handoffs` — pending handoffs for current user (drives Inbox + poll) · via `useHandoffStore.fetchPending` (force=true on doRefresh + 5s poll)

Triggered inside owned widgets:
- `get_finance_insights` — `monthly_cash_flow` for the 12-month revenue chart · RevenueChartWidget (finance-gated)
- `get_my_briefing` — cached monthly briefing (summary_text, action_count, details_json: highlights+sections) · DailyBriefingWidget initial load + 15s silent poll
- `refresh_my_briefing` — force-recompute today's briefing · DailyBriefingWidget refresh button
- `accept_handoff` `{id}` — accept a pending handoff · InboxWidget "Accept" button (via handoffStore.accept)
- `reject_handoff` `{id, reason}` — reject a handoff with reason · InboxWidget "Respinge" + reason modal (via handoffStore.reject)

Available on the same stores but NOT reachable from the dashboard UI (no control wired here; listed so rebuild doesn't accidentally treat them as dashboard-owned): `force_handoff`, `set_handoff_urgent`, `get_project_handoffs`, `create_project`, `update_project`, `delete_project`, `create_material`, `update_material`, `delete_material`, `create_alert`, `update_alert`, `acknowledge_alert`.

Non-`apiCommand` backend calls (direct HTTP to the Rust AI service, port 8100/`/ai`):
- `aiHealth()` → GET `/health` — gates whether the AI Summary widget + AI generation run
- `aiChat(messages, sessionId)` → POST `/chat` — generates the Romanian "Sinteză AI" 3-sentence summary from the live KPI facts (debounced 1.5s after data change)

## Data sources (stores / hooks)
- `useProjectStore` — `projects`, `fetchProjects`
- `useMaterialStore` — `materials`, `fetchMaterials`
- `useAlertStore` — `alerts`, `generateAndFetch` (aliased `fetchAlerts`)
- `useDashboardStore` — `dashboardData`, `financeOverview`, `refreshAll`, `setRange`, `startPolling` (reference-counted 5s poll, paused on hidden tab)
- `useHandoffStore` — `fetchPending`, `startPolling` (5s poll)
- `useSettingsStore` — `load`, `eurToRonRate`, `defaultCurrency`
- `useMoney()` — app-wide money formatter; converts RON aggregates → company display currency at BNR rate
- `useCountUp(amount)` — animates KPI numbers from 0 to value
- `aiChat`, `aiHealth` from `@/api/ai`
- Local React state: `loading`, `refreshing`, `aiSummary`, `aiSummaryLoading`, `aiConnected`, `timeRange`, `customFrom`, `customTo`

## User actions & controls
- **Reîmprospătează** button (hero, top-right) — `handleRefresh()` → refreshes dashboard + materials + projects + alerts + handoffs + AI health; spinner while running
- **Time-range presets** (when `widgets.time_range`): Tot timpul / Ultima lună / Ultimele 6 luni / Ultimul an / Custom — sets store range, refetches dashboard
- **Custom date pickers** (from/to) — shown when preset=custom; clamp each other (max/min); push range on change
- **Proiecte active → "Deschide"** — `onNavigate('projects')` (projects access only)
- **Each active-project row** (top 6) — click → `onNavigate('projects')`
- **Alerte → "Toate"** — `onNavigate('alerts')` (alerts access only)
- **Each alert row** (top 5) — click → `onNavigate('alerts')`
- **Stoc critic → "Deschide"** — `onNavigate('materials')`
- **AI Summary** — auto-generated, no control (debounced regeneration on data change)
- **Inbox (InboxWidget):** project-name click → `onOpenProject` (sets `sessionStorage.promix_focus_project` then `onNavigate('projects')`); per-row **Accept** (accept_handoff) and **Respinge** (opens reject-reason modal); "live" indicator
- **Daily Briefing (DailyBriefingWidget):** **Mai multe/Mai puțin** expand toggle; **Reîmprospătează** (refresh_my_briefing); clickable highlight chips + section items route to mapped page via `onNavigate` (manager-control/alerts/dashboard/sales-hub/projects/materials/finance/production based on keyword)

## Modals & dialogs
- **Reject-reason modal** (owned by InboxWidget) — textarea for rejection reason (required), Anulează / Respinge buttons; calls `reject_handoff`. Backdrop click + stopPropagation dismiss.
- No other modals; the page is read-mostly with inline actions.

## Filters / search / sort / tabs / sub-views
- **Time-range filter** (5 presets + custom from/to) — gated by `widgets.time_range`; pushes `{from,to}` into dashboardStore, refetches `get_dashboard_data`
- No search box, no tabs, no pagination
- Implicit client-side sorts/slices: active projects sorted by deadline (top 8, shown 6); critical stock first 6; unacknowledged alerts first 5; projects-by-stage sorted desc (top 5); Inbox sorted urgent → SLA-overdue → oldest

## Exports / print / file ops
— none — (no export, print, PDF, upload, download, or clipboard on this page)

## Keyboard shortcuts / realtime / polling
- **Polling:** dashboard store 5s (immediate first tick) + handoff store 5s, both reference-counted and **paused when `document.hidden`**; stopped on unmount
- **Briefing widget** self-polls every 15s (silent) + reloads on `visibilitychange`
- **AI summary** debounced 1.5s after KPI data changes (only when `aiConnected` and not loading)
- **No keyboard shortcuts** owned by this page (global Ctrl+K command palette lives in the shell)
- Time-range change `useEffect` pushes range to store

## Sub-components owned
- `TimeRangeBar` — preset + custom date range control (embedded mode)
- `KpiFeature` — featured "Profit net" hero metric (count-up, trend chip, noAccess "NaN" state)
- `KpiSplit` — compact split metric (Venituri / Proiecte active / Costuri)
- `ZoneEmpty` — empty/`fără acces` placeholder for each zone
- `MiniStat` — operational mini-stat tile (În producție / Stoc critic / Proiecte / Materiale)
- `DashboardBackground` — animated ambient aurora background (imported)
- **Embedded widgets (imported, owned in spirit):** `RevenueChartWidget` (lazy, only recharts consumer), `InboxWidget` (+ its reject modal), `DailyBriefingWidget`
- Local helpers: `presetRange`, `isoDate`, `fmtCount`, `parseDashboardConfig` (widget visibility)

## Access / permissions
- Page-level gating via `canAccessPage(role, page, user.custom_pages)` (`normalizeRole`)
- **Per-domain KPI gating:** finance / projects / production / warehouse. When a domain is inaccessible the tile shows **"NaN" + "nu ai acces la acest tip de date"** instead of a misleading 0
- **Profit / Venituri / Costuri / revenue chart** — finance access only
- **Proiecte active list + counts** — projects access
- **Producție pe etape + "În producție"** — production access
- **Stoc critic + low-stock count** — warehouse access
- **Alerte zone + "Toate"** — alerts access
- **Per-user widget visibility** — `parseDashboardConfig(user.dashboard_config)` controls `time_range`, `kpi_strip`, `revenue_chart`, `ai_summary`, `briefing`, `inbox`, `critical_stock`; missing keys default to visible (admin configures via Sistem → Utilizatori → "Configurare dashboard")
- AI Summary additionally requires `aiConnected` (health check passes)
- Inbox handoff accept/reject are themselves server-permission-checked

## Rebuild notes (Modern-SaaS layout intent)
- Keep it a **single scrollable dashboard, no tabs** — airy bento per the approved redesign (see memory: dashboard redesign is final; reuse, don't re-iterate). Sections in order: Hero (greeting + system-status pulse + Refresh + optional time-range) → featured **Profit** KPI with 3 split metrics + currency/curs footnote → revenue chart hero → asymmetric Proiecte active | Alerte row → Producție pe etape | Operațional row → secondary grid (AI Summary, Daily Briefing, Inbox, Stoc critic).
- **Primary action** = Reîmprospătează (manual refresh). No create actions live here.
- **Cards over tables** everywhere — lists are short (top 5–8) clickable rows that navigate to the owning page, not data grids.
- **Preserve every gate:** per-domain "NaN / fără acces" states, per-widget visibility flags, and finance-currency footnote. Do not collapse "no access" into "0".
- **Preserve the live feel:** 5s polling paused on hidden tab, count-up KPIs, AI-summary debounce, briefing 15s self-poll. Keep the lazy-load of RevenueChartWidget (it's the only recharts consumer — eager import balloons the landing chunk by ~545kB).
- Money via `useMoney()` in display currency; all aggregates arrive in RON.
