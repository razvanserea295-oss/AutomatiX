# FisaProiectantPage — function inventory
**Route:** fisa-proiectant · **Workspace:** engineering · **File:** pages/checklist/FisaProiectantPage.tsx · **Lines:** 655
**Props/contract:** `FisaProiectantPage({ user }: { user: User | null })` — receives the current authenticated user (for RBAC edit-gating); no other props. Owns all checklist/template state internally.

## Backend functions (apiCommand) — ALL must survive
- `get_checklist_by_project` — loads the existing fișă (checklist) for a project (`{ project_id }`) · triggered by selecting a project in the toolbar dropdown OR clicking a project card (`loadChecklist` / `handleSelectProject`).
- `create_checklist` — creates a new fișă for the selected project from a chosen template (`{ project_id, template_id }`) · triggered by "Creează fișă" → FisaTemplatePicker confirm (`handleTemplatePicked`).
- `update_checklist` — saves tracking_json + specs_json onto the current fișă; optionally sets `status: 'finalized'` (`{ id, tracking_json, specs_json, status? }`) · triggered by Save modal "Salvează pe fișă" (`handleSave(false)`) and "Finalizează fisa" (`handleSave(true)` via `handleFinalize`). Finalize promotes the project to "in productie" server-side.
- `update_fisa_template` — overwrites the source template's schema (`{ id, schema_json }`) · triggered by Save modal "Salvează în șablon" (`handleSaveToTemplate`). Server enforces admin-or-author. **Also** called by FisaTemplateEditor on edit-save (`{ id, name, description, schema_json }`).
- `create_fisa_template` — creates a brand-new template from current structure (`{ name, description?, schema_json }`) · triggered by Save modal "Salvează ca șablon nou" (`handleSaveAsNewTemplate`). **Also** called by FisaTemplateEditor on create-save.
- `get_fisa_templates` — lists all templates for the picker (returns `FisaTemplate[]`) · triggered by FisaTemplatePicker opening (`useEffect` on `open`).

> Note: EngineeringEnhancements.tsx contains NO apiCommand calls — all its actions are toast stubs / localStorage only.

## Data sources (stores / hooks)
- `useProjectStore` — `projects` (toolbar dropdown + project cards), `fetchProjects` (loaded on mount), `refreshAll()` (after finalize), `getState()` accessor.
- `useDashboardStore` — `getState().invalidate()` after finalize so KPIs/Kanban refresh.
- `toast` (toastStore) — success/error notifications throughout.
- `confirmDialog` (ConfirmDialog) — finalize confirm + discard-unsaved-changes confirm.
- `isViewerOnly` (lib/access) — RBAC gate for `canEdit`.
- `formatDateTimeRo` (lib/format) — "Actualizat" timestamp + project card deadlines.
- Local React state only: `projectId`, `checklist`, `tracking`, `specs`, `loading`, `saving`, `tab`, `compactView`, `saveModalOpen`, `editMode`, `savedSnapshot`, `templatePickerOpen`.
- EngineeringEnhancements: `useMoney` (settingsStore) for cost formatting; `useLocalStorage` (`promix_engineering_approvals_v1`) for the approval workflow list.

## User actions & controls
- **Project select dropdown** — choose a project (loads/creates its fișă).
- **Project cards** (when no project chosen) — clickable GlassCards (first 9 projects) that open/create the fișă; show name + deadline.
- **Creează fișă** button — opens FisaTemplatePicker (only when project selected, no checklist, not loading).
- **Editează ⇄ Vizualizare** toggle — switches read-only ↔ edit mode; disabled for viewer-only users; on exit-with-dirty asks discard confirm and reverts to last saved (`toggleEditMode`).
- **Compact / Normal** view toggle (`compactView`) — denser table/grid rendering.
- **Salvează •** button (edit mode) — opens FisaSaveModal; "•" marker when dirty.
- **Finalizează fisa** button (edit mode, status ≠ finalized) — confirm → `update_checklist` with status=finalized → project to production.
- **Tab switch** — Tracking Ansambluri ⇄ Specificatii Tehnice.
- **Tracking matrix checkboxes** — per sub-assembly toggle of 5 columns: Proiect / DXF / Desene / Executie / Livrat (`toggleTrackingField`); per-assembly Zincare (Zn) checkbox (`toggleZincare`). Disabled when read-only.
- **Specs inline edits** — header fields (6 fixed), section fields (text / textarea / select / checkbox via `updateSpecField`), Aprobat Beneficiar fields (contact / tel / email). All disabled when read-only.

## Modals & dialogs
- **FisaTemplatePicker** — pick a template before creating a fișă. Lists templates (name, description, "Implicit"/default star, created-by); pre-selects default but requires explicit confirm. Actions: select, Anulează, Creează fișa. (Calls `get_fisa_templates`.)
- **FisaSaveModal** — choose save destination. 3 radio options: (1) "Salvează pe fișa proiectului" (disabled if not dirty), (2) "Salvează în șablonul curent (suprascrie)" (disabled if no source template; shows template name), (3) "Salvează ca șablon nou" (reveals Name* + Descriere inputs). Auto-preselects 'project' if dirty else 'new'. Actions: pick option, Anulează, dynamic confirm (Salvează pe fișă / Salvează în șablon / Creează șablon).
- **FisaTemplateEditor** — full visual template editor (Tracking + Specs tabs). NOTE: imported file in this set but **not wired/rendered inside FisaProiectantPage** (no JSX/import reference). Documented as an owned sub-component used elsewhere (template management). Edits: template name*, description; Tracking = add/update/delete assemblies & sub-assemblies (5 fixed columns); Specs = add/update/delete sections & fields (type text/textarea/checkbox/select, auto-slug key, select options one-per-line, duplicate-key validation). Calls `create_fisa_template` / `update_fisa_template`.
- **confirmDialog** (shared) — "Finalizezi fisa?" and "Renunți la modificări?".

## Filters / search / sort / tabs / sub-views
- **Tabs:** `tracking` | `specs` (only when a checklist is loaded).
- **Sub-views / empty states:** no-project (project picker cards or empty state), project-without-fișă (prompt to create), loading spinner.
- **Project dropdown** acts as the primary selector (no free-text search/sort on this page).
- No pagination (project cards capped at first 9; full list in dropdown).
- EngineeringEnhancements "Where used" has its own local text search over nodes (max 16 matches) — separate sub-tool, not the main page filter.

## Exports / print / file ops
- — none — on the main page (no PDF/print/upload/download/clipboard).
- EngineeringEnhancements has stub-only export tools: "Export STEP / IGES skeleton" and "3D preview" — both toast.info placeholders, no real backend/file op.

## Keyboard shortcuts / realtime / polling
- — none — no custom keyboard shortcuts, no polling, no websocket/realtime. Data refreshed imperatively after finalize (`refreshAll` + dashboard `invalidate`). Dirty-state detection via JSON snapshot comparison (`savedSnapshot` vs current `{tracking, specs}`).

## Sub-components owned
- `KpiMini` — glassy KPI tile (Progres fișă %, Puncte verificate, Total puncte, Ansambluri).
- `TrackingTab` — checkbox matrix (rowspan'd assembly + Zn + sub-assembly rows × 5 columns; compact/readOnly aware).
- `SpecsTab` — technical spec form (fixed 6-field header, dynamic sections/fields, Aprobat Beneficiar block).
- `FisaSaveModal` (+ `SaveChoice`/`SaveDest` types) — save-destination chooser.
- `FisaTemplatePicker` (+ `FisaTemplate` type) — template chooser before create.
- `FisaTemplateEditor` (+ `EditorTab`, `TrackingEditor`, `SpecsEditor`, `FieldRow`) — visual template CRUD editor.
- `EngineeringEnhancements` (engineering workspace) — advanced tools panel: `WhereUsedCard`, `CostRollupCard`, `VersionDiffCard`, `CascadeReplaceCard`, `ApprovalCard`, `ThreeDPreviewCard`, `ExportStepCard` (mostly local/stub; not imported by FisaProiectantPage but part of the engineering inventory bundle).

## Access / permissions
- `canEdit = !!user && !isViewerOnly(user.role_name, 'fisa-proiectant', user.custom_pages)` — admins always edit; viewer/denied users get read-only fișă.
- Edit toggle disabled (with tooltip "Nu ai drepturi de editare") for viewer-only users; page opens in Vizualizare by default.
- Server enforces admin-or-author on `update_fisa_template`; client surfaces the "Doar autorul șablonului sau un admin poate edita" error.
- Finalize is gated behind edit mode + non-finalized status + confirm.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the existing **Hero + 4 KPI tiles** (Progres %, Puncte verificate, Total puncte, Ansambluri) — airy header row.
- **Primary flow is project-scoped:** a single prominent project selector (searchable combobox would improve on the raw `<select>`), then the fișă workspace. Keep the project-card grid as the empty/landing state (clean cards, lift the 9-item cap or add "see all").
- **Sticky action toolbar:** status badge (status + Rev.), updated-at, deadline chip, mode indicator (Vizualizare/Editare), and right-aligned actions: Compact/Normal · Editează/Vizualizare · Salvează · Finalizează. Make Save the primary button in edit mode.
- **Two tabs** (Tracking / Specs) below the toolbar with a slim progress bar — keep.
- **Tracking tab = table** (the assembly × sub-assembly × 5-checkpoint matrix is inherently tabular; keep rowspan'd assembly grouping, Zn column). Specs tab = **sectioned form/cards** (fixed header grid + dynamic section cards + Aprobat Beneficiar footer).
- Preserve the 3-destination **Save modal** (project / template / new template) and the explicit **template picker** on create — these encode important workflow rules; do not collapse into a single silent save.
- Preserve read-only vs edit-mode gating and the dirty marker; keep finalize → production side effect (refresh project store + dashboard).
- EngineeringEnhancements tools are largely stubs — safe to redesign/de-emphasize but must not silently drop the real cost-rollup and approval-workflow widgets if they surface here.
