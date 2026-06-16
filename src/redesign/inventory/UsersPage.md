# UsersPage — function inventory
**Route:** users · **Workspace:** sistem · **File:** pages/auth/UsersPage.tsx · **Lines:** 483
**Props/contract:** `UsersPage(_props: { user: User | null })` — receives the current authenticated user but ignores it (prefixed `_props`). All gating is server-side (admin-only commands). Default export.

## Backend functions (apiCommand) — ALL must survive
- `get_users` — loads full user list (`User[]`); used for the left list, KPI counts, and re-select after every mutation · triggered by initial `fetchData()` (mount) and after create/update/delete/save-pages/save-dashboard
- `get_roles` — loads role list (`Role[]`); feeds the role `<select>` in the form modal and the "Roluri" KPI · triggered by mount `fetchData()` and post-mutation refreshes
- `create_user` — creates a new user with `{ ...formData, role_id:Number, active:true }` · triggered by FormModal submit when not editing ("Adaugă utilizator")
- `update_user` — updates a user `{ id, ...formData, active:true }`; `password` stripped from payload if blank when editing · triggered by FormModal submit when editing ("Editează" → "Actualizează")
- `delete_user` — deletes a user `{ id }` · triggered by the trash icon in the detail header, after `confirmDialog` confirmation
- `update_user_pages` — saves per-user page-access overrides `{ user_id, pages: customPages }` (JSON map pageId→level) · triggered by "Salvează permisiuni" SaveButton
- `update_user_dashboard_config` — saves per-user dashboard widget visibility `{ user_id, config: dashboardWidgets }` · triggered by "Salvează dashboard" SaveButton

## Data sources (stores / hooks)
- Local `useState`: `users`, `roles`, `loading`, `selected` (active user in right panel), `customPages` (Record<pageId,level>), `dashboardWidgets` (Record<DashboardWidgetId,boolean>).
- `useAuthStore` (Zustand) — `getState().user` / `setUser()`; used inside `doSavePages` and `doSaveDashboardConfig` to live-update the current user's sidebar/dashboard when admin edits themselves.
- `useFormModal()` — provides `isOpen, editingItem, openModal, closeModal, isEditing` for the add/edit user modal.
- `useSaveAction(fn, {successMessage,errorMessage})` — two instances: `savePages`/`saveState` and `saveDashboardConfig`/`dashSaveState`, drive SaveButton state + toasts.
- `@/core/types`: `DASHBOARD_WIDGETS` (12-item const list), `parseDashboardConfig()` (JSON→map, missing keys default visible), `DashboardWidgetId`, `User` type.
- No remote store; data is fetched directly via `apiCommand` and held in component state.

## User actions & controls
- **Adaugă utilizator** (hero header button) — opens FormModal in create mode (`openModal()`).
- **User list rows** (left panel) — click selects user (`selectUser`), hydrates `customPages` + `dashboardWidgets`, highlights row with accent border.
- **Editează** (detail header) — opens FormModal pre-filled (`openModal(selected)`).
- **Delete (trash icon)** — `handleDelete(selected.id)` with danger confirm dialog; clears selection if the deleted user was selected.
- **Page-access `<select>`** per page (`setPageAccess`) — 4 levels: Implicit (rol)/inherit, Fără acces/denied, Viewer/viewer, Editor/full. `inherit` deletes the key (role default applies); others write explicit override. Color-coded select (green=full, amber=viewer, red=denied, neutral=inherit).
- **Salvează permisiuni** (SaveButton) — persists `customPages` via `update_user_pages`, refreshes, re-selects, live-updates self in authStore.
- **Dashboard widget checkboxes** (per widget, `toggleDashboardWidget`) — toggle visibility of each of 12 dashboard widgets for the selected user.
- **Tot vizibil / Tot ascuns** buttons (`setAllDashboardWidgets(true/false)`) — bulk set all 12 widgets visible/hidden.
- **Salvează dashboard** (SaveButton) — persists `dashboardWidgets` via `update_user_dashboard_config`, refreshes, re-selects, live-updates self.
- Visible-count indicator: `N / 12 vizibile`.

## Modals & dialogs
- **FormModal** (add/edit user) — title "Adaugă utilizator" / "Editează utilizator"; fields: `username` (text, required), `full_name` (text, required), `job_title` (text, optional, with placeholder examples), `email` (email, required), `password` (text; required only when creating, placeholder "Gol = păstrează" when editing), `role_id` (select; options = roles excluding those whose description starts with `[DEZACTIVAT]`, labels via ROLE_LABELS). Submit label "Adaugă"/"Actualizează". On submit calls create_user/update_user, refreshes, re-selects edited user.
- **confirmDialog** (delete) — `{ title: 'Șterge utilizatorul?', danger: true }` before `delete_user`.

## Filters / search / sort / tabs / sub-views
- **— none —** No search box, no filter bar, no sort, no tabs, no pagination. The user list renders all users unfiltered in fetch order. Right panel is a master-detail sub-view driven by row selection (empty-state prompt "Selectează un utilizator" when none selected).

## Exports / print / file ops
- **— none —** No export, print, PDF, upload, download, or clipboard operations.

## Keyboard shortcuts / realtime / polling
- **— none —** No keyboard shortcuts, no realtime subscriptions, no polling. Data refreshes only after mount and after each mutation (manual refetch).

## Sub-components owned
- **KpiMini** (in-file) — compact glassy metric tile (icon + label + MetricValue); 4 instances: Total utilizatori, Admini, Manageri, Roluri.
- In-file constants/helpers: `ROLE_LABELS`, `ROLE_COLORS`, `ROLE_AVATAR_BG`, `ALL_PAGES` (28 assignable pages grouped Personal/Vanzari/Proiecte/Proiectare/Productie/Aprovizionare/Financiar/Instrumente/Sistem), `getInitials()`.
- Shared UI used: `Page`, `HeroHeader`, `GlassCard`, `MetricValue`, `StatusBadge`, `SaveButton`, `FormModal`.
- Note (line 450): the legacy "Tools admin" floating panel (force-logout, 2FA enforcement, live session monitoring) was retired and moved to the dedicated "Sesiuni" tab — do NOT reintroduce it here.

## Access / permissions
- Page is admin-facing (Sistem workspace). All mutating commands are admin-gated server-side (`withAdminUser` per CLAUDE.md). The page itself does no client role check beyond ignoring its `user` prop.
- Page-access model: per-user `custom_pages` JSON overrides role defaults — `denied` beats role default (admin can lock a page even for manager/financiar); `viewer` = read-only; `full` = editor; absent key = inherit role.
- Dashboard config: per-user `dashboard_config` JSON; missing widget keys default to TRUE (visible) so fresh users keep the full dashboard.
- Self-edit awareness: when admin edits their own account, page-access and dashboard saves push the updated User into `useAuthStore` so the sidebar/dashboard re-render instantly without a reload.
- Roles with description starting `[DEZACTIVAT]` are hidden from the role select (soft-disabled roles).

## Rebuild notes (Modern-SaaS layout intent)
Keep the **master-detail split**: left = scrollable user list (avatar w/ role color + initials, name, job_title, email, role chip); right = selected-user detail. Add a real **search box** + role filter above the list (currently missing — a clean win). Top: airy HeroHeader ("Utilizatori" / "Conturi, roluri și acces pe pagini") with primary action "Adaugă utilizator", plus the 4-KPI glass strip (Total / Admini / Manageri / Roluri). Right panel as stacked cards: (1) identity header card with Editează + Delete; (2) role + active StatusBadge card; (3) **Acces pagini** card — group pages by the 9 nav groups, each row = page label + 4-state access select, sticky "Salvează permisiuni"; (4) **Configurare dashboard** card — 12 widget checkboxes in a 2-col grid with Tot vizibil/Tot ascuns bulk toggles + N/12 counter + "Salvează dashboard". Prefer table-style rows for page-access (dense, scannable) and a checkbox grid for widgets. Empty state for no selection stays. Two independent save zones (pages, dashboard) must remain separate — do not merge into one save. All 7 apiCommands must survive.
