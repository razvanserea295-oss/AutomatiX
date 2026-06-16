# ReportsPage — function inventory
**Route:** reports · **Workspace:** finance · **File:** pages/reports/ReportsPage.tsx · **Lines:** 340
**Props/contract:** `ReportsPage({ user: _user }: { user: User | null })` — receives the current user, but the prop is unused (aliased `_user`); page does no client-side role gating.

## Backend functions (apiCommand) — ALL must survive
- `get_report_sources` — fetches available report data sources (`SourceDef[]`: name, label, columns with field/label/type, filterable_fields) · triggered on mount (`useEffect`)
- `list_report_presets` — loads saved report presets (`Preset[]`: id, name, source, config, is_shared) · triggered on mount and after save/delete via `refreshPresets()`
- `run_report` — runs the configured report, returns `{ source, columns, rows, total_rows, totals? }`; payload `{ config: { source, columns[], filters[], sort?, limit:1000 } }` · triggered by "Ruleaza raportul" button
- `save_report_preset` — saves current builder config as a named preset; payload `{ request: { name, source, config: { source, columns[], filters[], sort? } } }` · triggered by the Save (disk) icon button
- `delete_report_preset` — deletes a preset by id; payload `{ id }` · triggered by the trash icon on each preset row

## Data sources (stores / hooks)
- No Zustand stores. Pure local React state (`useState`/`useEffect`/`useCallback`).
- `toast` from `@/store/toastStore` for success/error notifications.
- Local state: `sources`, `sourceName` (default `'projects'`), `columns` (Set of selected fields), `filters` (Filter[]), `sortField`, `sortDir` ('asc'|'desc'), `report`, `running`, `presets`, `presetName`.
- Derived: `source` = currently selected `SourceDef`.

## User actions & controls
- **Source select** (`switchSource`) — change report data source; resets report, clears filters, re-selects all columns of the new source by default.
- **Column checkboxes** — per-field toggle add/remove from the `columns` Set (all columns checked by default on source change).
- **Add filter** ("Adaugă filtru") — appends a filter row `{ field: first filterable field, op:'eq', value:'' }`.
- **Filter row controls** — field select (from `filterable_fields`), operator select (eq/neq/contains/gt/gte/lt/lte/between via `OP_LABELS`), value text input, and X button to remove the filter row. (`value2`/`between` second value exists in the `Filter` type but no second input is rendered.)
- **Sort field select** + **sort direction select** (↑ asc / ↓ desc; default field "— fără —").
- **Run report** ("Ruleaza raportul") — executes `run_report`; spinner while `running`; toasts error on failure.
- **Preset name input** + **Save button** (disk icon) — `savePreset`; requires non-empty name (else toast error), clears input + refreshes list on success.
- **Load preset** — click preset name to restore source, columns, filters, and sort from `p.config`.
- **Delete preset** — trash icon per preset row.
- **Export Excel** — two triggers (hero header action when a report exists + results-toolbar button).

## Modals & dialogs
— none — (no modals/dialogs/sheets; everything is inline in the two-panel layout)

## Filters / search / sort / tabs / sub-views
- **Filters:** dynamic builder list; each = field + operator + value; operators eq, neq, contains, gt, gte, lt, lte, between.
- **Sort:** single field + direction selector.
- **Columns:** multi-select checkbox list scoped to the chosen source.
- **No tabs, no text search box, no pagination** — `run_report` uses a fixed `limit: 1000`. Results show `total_rows` count (singular/plural label "înregistrare"/"înregistrări").
- Results table renders selected columns with type-aware formatting (currency/number → right-aligned tabular-nums; currency → `.toFixed(2)`; null → "—"). Optional `tfoot` totals row when `report.totals` present (currency totals suffixed " RON", first column labeled "TOTAL").

## Exports / print / file ops
- **Export Excel** (`exportExcel`) — lazy-imports `xlsx`, builds a worksheet from `report.columns`/`report.rows`, writes `raport-<source>-<YYYY-MM-DD>.xlsx` via `XLSX.writeFile` (client-side download); toasts success/error. No PDF, print, upload, or clipboard.

## Keyboard shortcuts / realtime / polling
— none — (no keyboard shortcuts, no realtime subscriptions, no polling; data loads once on mount + on explicit user actions)

## Sub-components owned
- `KpiMini` (in-file) — compact glass metric tile (icon + label + `MetricValue`), used in the KPI row.
- KPI row tiles: Surse disponibile (`sources.length`), Coloane selectate (`columns.size`), Presete salvate (`presets.length`), Rânduri rezultat (`report?.total_rows ?? 0`).
- Uses shared UI: `Page`, `HeroHeader`, `GlassCard`, `MetricValue`, `Button`, plus lucide icons.

## Access / permissions
- No client-side role gating; `user` prop unused. Access control is server-side per command (registry/auth middleware). Preset `is_shared` flag exists in the `Preset` type but is not surfaced/edited in the UI.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the **two-panel builder** shape: left config rail (sticky/scrollable) + right results panel. Modernize into a clean card layout: airy hero with eyebrow "Rapoarte", title, subtitle, and a primary "Export Excel" action that appears only when a report exists.
- **Left rail sections** (clearly grouped, with section labels): Sursă (select) → Coloane (checkbox group, consider select-all/clear-all) → Filtre (repeatable rows + "Adaugă filtru") → Sortare (field + dir) → primary "Ruleaza raportul" CTA → Presete (save input + saved list with load/delete).
- **Right panel:** empty-state hint until run; then a results toolbar (row count + Export Excel) over a sticky-header data **table** (not cards — tabular numeric data, type-aware alignment, totals footer). Preserve currency `.toFixed(2)` + " RON" totals formatting and "—" null placeholder.
- Primary action = Run report. Secondary = Export Excel + Save preset. Consider adding the missing `between` second-value input and surfacing `is_shared` for presets, but do NOT remove any of the 5 apiCommands or the fixed `limit:1000` behavior without intent.
