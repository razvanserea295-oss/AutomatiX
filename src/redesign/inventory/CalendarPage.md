# CalendarPage — function inventory
**Route:** calendar · **Workspace:** personal · **File:** pages/calendar/CalendarPage.tsx · **Lines:** 862
**Props/contract:** `CalendarPage({ user: _user }: { user: User | null })` — receives the current user (currently unused, prefixed `_user`); no other props. Self-loads all data via apiCommand.

## Backend functions (apiCommand) — ALL must survive
- `get_calendar_events` — fetches events for the visible date range `{ from, to, types? }`; `types` is the active filter set (or undefined when none) · triggered by `fetchEvents()` on mount and whenever view/cursor/filters change (useEffect → useCallback).
- `build_calendar_ical` — returns `{ ical: string }` for the current range `{ from, to }`; client wraps it in a Blob and triggers a `.ics` download · triggered by the "iCal" Download button in the hero.
- `create_personal_calendar_event` — inserts a personal event `{ title, date, end_date|null, notes|null, color|null }` · triggered by `savePersonal()` (when draft has no `id`) from the PersonalEventEditor "Adaugă" button.
- `update_personal_calendar_event` — updates a personal event `{ id, title, date, end_date, notes, color }` · triggered by `savePersonal()` (when draft has an `id`) from the editor "Salvează" button.
- `delete_personal_calendar_event` — deletes a personal event `{ id }` · triggered by `deletePersonal()` from the editor "Șterge" button (after a `confirm()` prompt).
- `reschedule_calendar_event` — moves an event to a new date `{ event_id, new_date }` · triggered by `handleDrop()` when an event card is drag-dropped onto another day cell (Month/Week views).

## Data sources (stores / hooks)
- **No Zustand store for calendar data.** All event data lives in local component state (`useState<CalendarEvent[]>`), loaded directly via `apiCommand('get_calendar_events')`.
- `toast` from `@/store/toastStore` — success/error notifications for iCal, save/update/delete, reschedule.
- `useLocation` (wouter) — `setLocation(ev.url)` to navigate to a source entity when a non-personal event is clicked.
- `useLocalStorage` (from `@/components/enhancements`) — in CalendarEnhancements, persists dismissed conflict pairs under key `promix_calendar_conflicts_dismissed_v1`.
- Local state: `view` (month/week/day), `cursor` (focus date), `events`, `loading`, `filters` (Set of event types), `editorOpen`, `draft` (PersonalEventDraft), `saving`.
- Derived (useMemo): `range` (from/to per view), `eventsByDay` (Map keyed by ISO day, multi-day events spanned across cells), `upcoming` (today-forward, soonest first, max 8), plus KPI counts.

## User actions & controls
- **iCal download** (hero, outline button) → `downloadIcal()` → `build_calendar_ical`, Blob download named `promix-calendar-<from>_to_<to>.ics`.
- **"Eveniment personal"** (hero, primary button) → `openCreateEditor()` opens editor with today preset.
- **Prev / Today / Next** nav buttons → `goPrev` / `goToday` / `goNext` (step size depends on active view: month/week/day).
- **View switch** — AnimatedTabs (Luna / Săptămâna / Zi) → `setView`.
- **Filter chips** — one StatusBadge button per event type; `toggleFilter(t)` adds/removes from the filter Set (empty Set = all shown); "resetează" clears the Set (shown only when filters active).
- **Event click** — `handleEventClick`: personal events open the editor (edit/delete); all others navigate to `ev.url`.
- **Month cell "+N mai multe"** button → `onOpenDay(iso)` → switches to Day view focused on that date.
- **Drag-and-drop reschedule** — event cards are `draggable` (Month & Week); cells are drop zones (`onDragOver`/`onDrop`) → `handleDrop` → `reschedule_calendar_event`. (Day view cards are NOT draggable.)
- **Upcoming aside** — each upcoming event is a button → `handleEventClick` (same edit/navigate logic).
- **Conflict checkbox** (CalendarEnhancements) — marks a conflict pair as accepted (persisted in localStorage); "resetează acceptate" clears all dismissals.
- **Personal editor fields** — title input, start date, end date (min = start), notes textarea, 9-swatch color picker (incl. "Implicit"/none), Save, Cancel, Delete.

## Modals & dialogs
- **PersonalEventEditor** (in-file component, fixed overlay `z-50`, backdrop click = cancel) — create/edit/delete a private personal event. Fields: `title` (required), `date` start (required), `end_date` (optional, min=date), `notes` (optional), `color` (optional, 9 preset swatches). Header reads "Eveniment personal — privat" with reassurance text "Doar tu vezi acest eveniment." Buttons: Șterge (only in edit mode), Anulează, Adaugă/Salvează (disabled while saving or when title/date empty). Delete path uses a native `confirm()`.
- No other modals/sheets. (No native delete dialog beyond the `confirm()`.)

## Filters / search / sort / tabs / sub-views
- **No free-text search.**
- **Type filters** — multi-select chip Set over 8 event types: project_deadline, project_start, deplasare, maintenance, compliance_task, invoice_due, quotation_valid_until, personal. Empty Set means "show all". Sent server-side via `types` arg.
- **View tabs / sub-views** — Month (6-week grid), Week (7-day columns), Day (single day, events grouped by type). Driven by AnimatedTabs.
- **Sort** — upcoming aside sorts by date ascending; Day view groups by event type. No user-controlled sort.
- **No pagination** — month=6-week range, week=7 days, day=1 day; upcoming aside caps at 8; conflict list caps at 20 visible.

## Exports / print / file ops
- **iCal export** — `build_calendar_ical` → Blob (`text/calendar`) → anchor download `.ics`; toast on success/error. No print, PDF, upload, or clipboard.

## Keyboard shortcuts / realtime / polling
- **No keyboard shortcuts** (editor title has `autoFocus`; no Esc/Enter handlers — overlay closes on backdrop click only).
- **No polling / realtime.** Re-fetch is reactive: `get_calendar_events` re-runs whenever range (view/cursor) or filters change, and after every create/update/delete/reschedule (`fetchEvents()`).

## Sub-components owned
- `KpiMini` (in-file) — compact glassy metric tile (icon, label, MetricValue) for the KPI row.
- `PersonalEventEditor` (in-file) — the create/edit/delete modal.
- `MonthView` (in-file) — 6-week grid, drag-drop, "+N mai multe" overflow, today/weekend/out-of-month styling.
- `WeekView` (in-file) — 7 day columns, drag-drop, per-day event list.
- `DayView` (in-file) — single-day list grouped by type, shows status and end_date; non-draggable.
- `eventVisual()` (in-file helper) — resolves Tailwind class or inline style for personal events with custom hex color.
- `CalendarEnhancements` (pages/calendar/CalendarEnhancements.tsx) — wrapper rendering `ConflictDetectorCard`.
- `ConflictDetectorCard` (in CalendarEnhancements) — detects overlapping event time ranges, lists conflicts (max 20), per-conflict accept checkbox persisted in localStorage, reset-accepted action.

## Access / permissions
- Workspace: **personal**. Page reads `user` prop but does not gate UI on role (param is unused).
- Per-command auth is enforced **server-side** (registry middleware). Personal events are private to the user ("Doar tu vezi acest eveniment. Restul utilizatorilor nu îl pot vedea.").
- No viewer-only / read-only branches in the page; all actions are always rendered.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the three-zone layout: **Hero** (eyebrow "Personal" + title "Calendar" + subtitle, right-aligned actions: iCal export + "Eveniment personal" primary) → **KPI row** (4 tiles: În interval / Astăzi / Deadline-uri / Deplasări) → **Bento** (main calendar card + "Următoarele evenimente" aside, max 8).
- **Main card** holds: nav bar (Prev/Today/Next + readable header label) + view tabs (Luna/Săptămâna/Zi) + type filter chips with reset + the grid. Preserve drag-drop reschedule in Month & Week, and the "+N mai multe" → Day-view drill-in.
- Calendar events are **date-level, not time-of-day** — do not introduce time-slot grids; Day view is a grouped list, not an hour timeline.
- Personal-event editor stays a focused modal (title/start/end/notes/color), with the privacy reassurance and a clearly destructive Delete in edit mode.
- Keep the **conflict detector** panel below the grid (overlap detection + localStorage-persisted dismissals).
- Table vs cards: calendar is inherently grid/cards, not a table — keep the grid for Month/Week and card-list for Day + upcoming aside. Color-coding per type (8 types) must survive, including user-picked hex for personal events.
- All 6 apiCommands are load-bearing and must remain wired to the same controls.
