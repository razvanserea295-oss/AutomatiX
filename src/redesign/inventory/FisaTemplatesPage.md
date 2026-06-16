# FisaTemplatesPage — function inventory
**Route:** fisa-templates · **Workspace:** engineering · **File:** pages/FisaTemplatesPage.tsx · **Lines:** 205
**Props/contract:** `export default function FisaTemplatesPage()` — no props (self-contained page; pulls current user from `useAuthStore`).

## Backend functions (apiCommand) — ALL must survive
- `get_fisa_templates` — loads the full list of global fișă templates (returns `Template[]`) · triggered on mount via `refresh()` (useEffect) and after every mutating action.
- `clone_fisa_template` — clones an existing template under a new name (`{ id, new_name }`) · triggered by the per-card "Clonează" (Copy) button → `prompt()` for the name.
- `delete_fisa_template` — soft-deletes/deactivates a template (`{ id }`) · triggered by the per-card "Dezactivează" (Trash2) button → `confirm()`; hidden for default templates.
- `create_fisa_template` — creates a new template (`{ name, description, schema_json }`) · triggered by **FisaTemplateEditor** Save when `template === null` (create mode).
- `update_fisa_template` — updates an existing template (`{ id, name, description, schema_json }`) · triggered by **FisaTemplateEditor** Save in edit mode.

## Data sources (stores / hooks)
- `useAuthStore(s => s.user)` — current user (`me`); used for `isAdmin` (`role_name === 'admin'`), ownership checks (`created_by_user_id === me?.id`), and the "Ale mele" KPI.
- Local `useState`: `templates: Template[]`, `loading`, `editing: Template | null`, `creating: boolean`.
- `apiCommand` (`@/api/commands`) — sole backend transport (no Zustand data store; the list lives in component state, refetched via `refresh()`).
- Derived `stats` via `useMemo` (no IPC): `total`, `active` (`t.active`), `implicit` (`t.is_default`), `mine` (`created_by_user_id === me?.id`).

## User actions & controls
- **Header "Template nou"** button (Plus) — opens editor in create mode (`setCreating(true)`).
- **Per-card "Clonează"** (Copy) — always visible to everyone; `prompt()` for new name (default `"<name> (copie)"`) → `clone_fisa_template` → toast + refresh.
- **Per-card "Editează"** (Pencil) — visible only when `canEdit` (admin or author); opens editor in edit mode (`setEditing(t)`).
- **Per-card "Dezactivează"** (Trash2) — visible only when `canEdit` AND `!t.is_default`; `confirm()` → `delete_fisa_template` → toast + refresh.
- **Inside FisaTemplateEditor (modal):**
  - Edit template `Nume *` (required) and `Descriere` inputs.
  - Tabs: Tracking ansambluri / Specs tehnice (with live counts).
  - Tracking: add/rename/delete assembly; add/rename/delete sub-assembly (delete assembly/section guarded by `confirm()`).
  - Specs: add/rename/delete section; add/delete field; per-field edit label, key (auto-slugified from label, manually overridable, sanitized to `[a-z0-9_]`), type (text/textarea/checkbox/select); select type shows an "Opțiuni" textarea (one option per line).
  - Save (Save icon) — validates non-empty name + unique non-empty field keys per section, serializes schema, calls create/update; Cancel/X to close.

## Modals & dialogs
- **FisaTemplateEditor** (`./checklist/FisaTemplateEditor.tsx`) — full-screen overlay modal. Two modes:
  - **Create** (`template={null}`, opened by `creating`): empty schema (`EMPTY_SCHEMA`).
  - **Edit** (`template={editing}`): parses `schema_json` into `{ tracking, specs:{header, sections} }`.
  - Fields edited: template `name`, `description`; schema `tracking[]` (assembly name + sub-assembly names; 5 fixed columns PROIECT/DXF/DESENE/EXECUTIE/LIVRAT not editable), `specs.sections[]` (section title + fields {key,label,type,options}); `specs.header` is a fixed 6/7-field read-only display (tip_statie, loc, beneficiar, ing_proiect, data_inceput, data_finalizare).
  - On save: `onSaved()` closes modal + refreshes the list.
- **Browser-native dialogs (page-level):** `prompt()` (clone name), `confirm()` (deactivate). Inside editor: `confirm()` on delete assembly / delete section.

## Filters / search / sort / tabs / sub-views
- **Page:** — none — (no search box, no filter bar, no sort controls, no pagination, no tabs). Templates rendered as a responsive card grid (1/2/3 cols), order as returned by backend.
- **Editor:** two tabs (Tracking / Specs) — internal sub-views, not page-level filters.

## Exports / print / file ops
- — none — (no export, print, PDF, upload, download, or clipboard).

## Keyboard shortcuts / realtime / polling
- — none — (no keyboard shortcuts, no polling, no realtime/websocket; list refreshes only on mount and after mutations).

## Sub-components owned
- `KpiMini` (in-file) — compact glass metric tile for the KPI row (icon/label/value/warn).
- `FisaTemplateEditor` (`pages/checklist/FisaTemplateEditor.tsx`) — the create/edit modal; owns these in-file sub-components:
  - `EditorTab` — tab button.
  - `TrackingEditor` — assemblies + sub-assemblies editor.
  - `SpecsEditor` — sections + fields editor (renders fixed header notice).
  - `FieldRow` — single spec field editor (label/key/type + select options textarea).
  - Helpers: `slugify`, `newId`; constants `FIVE_LABELS`, `FIELD_TYPES`, `EMPTY_SCHEMA`.

## Access / permissions
- Page itself is GLOBAL — visible to all authenticated users (templates are global).
- **Clone**: available to everyone.
- **Edit / Deactivate**: gated by `canEdit(t)` = `isAdmin || t.created_by_user_id === me?.id` (admin or author only).
- **Deactivate** additionally hidden when `t.is_default` (default templates protected).
- "Ale mele" KPI counts templates authored by the current user.
- Server-side auth still enforced per command (client gating is convenience only).

## Rebuild notes (Modern-SaaS layout intent)
- Keep the **HeroHeader + 4-KPI row** (Total / Active / Implicite / Ale mele) — clean, airy, single primary action ("Template nou") top-right.
- **Card grid is correct** for this page (templates are rich objects with description/author/badges, not a flat tabular list) — keep responsive 1/2/3 columns, hover-lift glass cards. Do NOT force `ListReport`/table.
- Per-card footer action row: Clone (always) · Edit + Deactivate (ownership-gated). Show the "Implicit" star badge and "creat de <name>" author line.
- Consider replacing the browser `prompt()`/`confirm()` with proper modals/`StatusBadge` confirmations for clone-name and deactivate (current uses native dialogs).
- Empty/loading states already present (spinner + "Niciun template configurat.") — preserve.
- The editor modal is feature-complete (two-tab visual schema editor, no JSON typing) — port it wholesale; only restyle. Preserve key uniqueness validation, auto-slug, fixed 5 tracking columns, fixed specs header, and the 4 field types incl. select-options.
