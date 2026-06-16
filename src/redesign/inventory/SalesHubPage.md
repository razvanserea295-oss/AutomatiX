# SalesHubPage — function inventory
**Route:** sales-hub · **Workspace:** sales · **File:** pages/sales/SalesHubPage.tsx · **Lines:** 430
**Props/contract:** `SalesHubPage({ user }: { user: User | null })` — receives the logged-in user (used only to derive `role_name` for the manager/admin lens). No other props.

## Backend functions (apiCommand) — ALL must survive
The page issues **no `apiCommand` literals directly** — every backend call is made through Zustand store actions it invokes. The load-bearing commands reached from THIS page:

- `get_sales_leads` — loads the full lead pipeline list · via `useSalesStore.fetchLeads(true)` in `fetch()` on mount (salesStore.ts:74)
- `get_projects` — loads projects (filtered client-side to `status !== 'finalizat'` for the "Proiecte în execuție" tab) · via `useProjectStore.fetchProjects(true)` in `fetch()` (projectStore.ts:157)
- `get_sales_stats` — loads KPI/aside stats (`total_leads, fara_contact, decizie_client, decizie_noastra, in_negocieri, converted, pipeline_value, stale_leads`) · via `useDashboardStore.fetchSalesStats()` in `fetch()` and again after create (dashboardStore.ts:113)
- `create_sales_lead` — creates a new lead from the "Discuție nouă" FormModal · via `useSalesStore.createLead(payload)` in `handleCreate` (salesStore.ts:101). On success the page navigates to `/sales-hub/:id`.

Reachable indirectly (same `useSalesStore`, but triggered on the LeadDetailPage this page navigates to — NOT called from SalesHubPage itself; listed so the rebuild keeps the wiring intact): `get_sales_lead`, `update_sales_lead`, `delete_sales_lead`, `add_sales_lead_note`, `convert_sales_lead`.

## Data sources (stores / hooks)
- `useSalesStore` → `leads` (cast to `Lead[]`), `fetchLeads`, `createLead`.
- `useProjectStore` → `projects`, `fetchProjects`. (projects filtered to non-finalizat = `activeProjects`.)
- `useDashboardStore` → `salesStats` (cast to `Stats | null`), `fetchSalesStats`.
- `useMoney()` (settingsStore) → currency formatter `money(n, 'EUR', 0)`; estimated values/pipeline assumed EUR.
- `useFormModal()` → `isOpen, openModal, closeModal` for the create-lead modal.
- `useLocation()` (wouter) → `setLocation` for navigation to lead detail pages.
- Local `useState`: `tab` ('pipeline'|'executie'), `creatorFilter`, `sortBy`, `loading`.
- `useMemo` derived: `creators` (distinct lead owners), `displayedLeads` (owner-filter + sort applied), `fields` (FormModal field config), `statusBreakdown`.

## User actions & controls
- **"Oferte"** outline button (hero) — `<Link href="/quotations">` navigates to quotations page.
- **"Discuție nouă"** primary button (hero) — `openModal()` opens the create-lead FormModal.
- **Tab switch** — AnimatedTabs between `pipeline` ("Discuții cu clienți") and `executie` ("Proiecte în execuție").
- **Lead row click / Enter / Space** — `openLead(id)` → navigates to `/sales-hub/:id` (detail page). Row is `role="button"`, keyboard-activatable.
- **Per-row "Editează lead" (pencil) button** — `openLeadEdit(id)`: writes `sessionStorage['promix_lead_edit'] = id` then navigates to `/sales-hub/:id`; LeadDetailPage reads the flag and auto-opens its edit modal. `e.stopPropagation()` prevents the row click.
- **Manager lens — owner filter `<select>`** (manager/admin only) — sets `creatorFilter`; "Toți utilizatorii" + one option per distinct `created_by_name`.
- **Manager lens — sort `<select>`** (manager/admin only) — sets `sortBy`: implicită / după utilizator / cele mai noi / cele mai vechi.
- **"Resetează" button** (manager lens, shown when a filter/sort is active) — clears `creatorFilter` and `sortBy`.
- **EmptyState "Adaugă discuție"** (pipeline empty) — `openModal()`.
- **EmptyState "Vezi pipeline-ul"** (execuție empty) — `setTab('pipeline')`.
- Execuție tab rows are display-only (no row actions).

## Modals & dialogs
- **FormModal "Discuție nouă"** (create lead) — `onSubmit=handleCreate`, submitLabel "Adaugă". Fields:
  - `client_name` (text, required), `contact_person` (text), `contact_email` (email), `contact_phone` (tel),
  - `product_interest` (text, required), `location` (text), `estimated_value` (number, EUR — coerced to Number, default 0),
  - `status` (select: fără contact / decizie client / decizie noastră / în negocieri / convertit),
  - `next_followup_date` (date), `notes` (textarea — initial notes).
  - On submit: `createLead` → `fetchSalesStats` → navigate to new lead's detail page.

## Filters / search / sort / tabs / sub-views
- **Tabs:** pipeline (leads) vs execuție (active projects).
- **Owner filter** (`creatorFilter`) and **sort** (`sortBy`) — manager/admin only, pipeline tab only, only when `activeLeads.length > 0`. Sort modes: default, by user (grouped, newest-first per user), newest, oldest.
- **Count indicator:** `displayedLeads.length / activeLeads.length`.
- No text search box, no pagination — full list rendered in a scroll container (`min-h-[55vh] max-h-[72vh]`).
- Projects tab filters client-side to `status !== 'finalizat'`.

## Exports / print / file ops
— none — (no export/print/PDF/upload/download/clipboard on this page; file/photo attachment lives on LeadDetailPage).

## Keyboard shortcuts / realtime / polling
- **Keyboard:** lead rows respond to Enter / Space (open detail).
- **Polling/realtime:** none — single data load on mount via `fetch()` (Promise.all of the 3 fetches); re-fetch of stats only after creating a lead.
- **Stale indicator:** purely client-computed per row — `daysSince = floor((now - lastTouch)/86_400_000)` where `lastTouch = last_contact_date || updated_at`; `isStale` when status ≠ 'convertit' and `daysSince >= 7` → red left-border + "Fără update Nz" pill.

## Sub-components owned
- **`KpiMini`** (in-file, lines 414-429) — compact glass metric tile (icon + label + MetricValue), used 4× in the KPI row; accepts optional `warn` and `format`.
- Consumes shared UI: `Page`, `HeroHeader`, `GlassCard`, `AnimatedTabs`, `MetricValue`, `Button`, `StatusBadge` (+ `statusBorderClass`), `EmptyState`, `SkeletonList`, `FormModal`, filter control helpers (`filterSelectCls`, `filterResetBtnCls`).
- Status token resolvers: `leadStatus`, `leadProjectStatus` (statusTokens.ts).

## Access / permissions
- **Manager/admin only:** the owner-filter + sort lens, the per-row creator/created-at line (`created_by_name · created_at`). Derived from `isManagerOrAdmin = ['admin','manager'].includes(user.role_name.toLowerCase())`.
- All other features available to any authenticated user reaching the page. No viewer-only/read-only mode handled here; backend per-command auth governs writes.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the airy bento: **HeroHeader** (eyebrow "Vânzări", title "Sales Hub", primary action **"Discuție nouă"**, secondary **"Oferte"** link) → **4-KPI row** (În discuție, În negocieri, Valoare pipeline [EUR], Convertite) → **2-col bento**: main = tabbed list, aside = stale-alert card + status-breakdown card.
- **Primary action:** create lead. **Main surface = list (table-like rows), not cards** — dense rows with status left-border, stale rows flagged red; per-row inline edit (pencil) + open-detail affordance (ArrowRight). Click navigates to a dedicated `/sales-hub/:id` detail page (no side panel).
- Manager lens (owner filter + sort + count) sits between the tabs and the list, manager/admin-gated; offer a clean reset.
- Aside: red stale-lead alert (only when `stale_leads > 0`) + per-status breakdown with total. Reuse GlassCard/StatusBadge primitives — do not hardcode hex or status spans. Currency via `useMoney()`.
- Two tabs: "Discuții cu clienți" (leads) and "Proiecte în execuție" (active projects, display-only). Preserve EmptyStates with their actions.
