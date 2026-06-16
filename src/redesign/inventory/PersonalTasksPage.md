# PersonalTasksPage — function inventory
**Route:** tasks · **Workspace:** personal · **File:** pages/tasks/PersonalTasksPage.tsx · **Lines:** 1278
**Props/contract:** `PersonalTasksPage({ user }: { user: User | null })` — receives the current authenticated user (or null). Uses `user.id` for ownership/assignee/delegator checks throughout.

## Backend functions (apiCommand) — ALL must survive
- `list_personal_tasks` — loads my personal tasks (args `{ include_done: true }`) · triggered by `fetch()` on mount / after every mutation
- `list_mentions` — loads recent @-mentions + delegated-task notifications · triggered by `fetch()`
- `list_tasks_assigned_by_me` — loads tasks I delegated to others (args `{ include_done: true }`, `.catch(() => [])`) · triggered by `fetch()`
- `list_assignable_users` — loads the user list for assign/reassign dropdowns (has its own server-side role gate; `.catch(() => [])`) · triggered by `fetch()`
- `get_personal_task` — re-fetches a single task fresh (args `{ id }`) so the Info modal shows latest completion details · triggered by `openInfo()` (Info button / list checkbox→done)
- `assign_task_to_user` — creates a task delegated to another user (args `{ request: { target_user_id, title, description, instructions, notes, priority, due_date } }`) · triggered by Editor "Deleagă" save when an assignee ≠ self is selected
- `create_personal_task` — creates a task for myself (args `{ request: { title, description, instructions, notes, priority, due_date } }`) · triggered by Editor "Creează" save when no/self assignee
- `update_personal_task` — multi-purpose update; used for: edit fields (`{ id, title, description, instructions, notes, priority, due_date }`), mark done with completion (`{ id, status:'done', completion_status, completion_note }`), reopen (`{ id, status:'open', completion_note:'', completion_status:null }`) · triggered by Editor save (edit mode), Info modal completion buttons, Info modal "Redeschide", list checkbox toggle (done→open)
- `delete_personal_task` — deletes a task (args `{ id }`) · triggered by TaskCard trash button (`remove`) AND by Review modal "Confirmă"/"Acceptă ca nerezolvat" (`confirmResolution`, closes/confirms a delegated task)
- `reopen_personal_task` — sends a completed delegated task back to assignee, optionally reassigned (args `{ request: { id, response_note, reassign_to_user_id } }`) · triggered by Review modal "Trimite înapoi" (`sendBack`) and "Reasignează" (`sendBack(override)`)
- `request_task_clarification` — assignee asks delegator a question, keeps task open (args `{ request: { id, question } }`) · triggered by Clarification modal "Trimite" (`submitClarification`)
- `mark_mention_read` — marks one mention read (args `{ mention_id }`) · triggered by aside "Marchează citit" link
- `mark_all_mentions_read` — marks all mentions read (args `{}`) · triggered by aside "Toate citite" link

## Data sources (stores / hooks)
- No Zustand store for page data — all data is fetched directly via `apiCommand` into local `useState`.
- Local state: `tasks`, `delegated`, `mentions`, `users`, `loading`, `showDone`, `tab`, plus modal/draft state (`reviewTask/reviewNote/reviewReassignTo`, `clarifyOpen/clarifyText`, `editorOpen/editorMode/editorDraft`, `infoOpen/infoTask/completionNote/completionStatus`).
- `fetch` = `useCallback` running all four list commands via `Promise.all`, called on mount (`useEffect`) and after every mutation.
- `reviewBuckets` = `useMemo` deriving the "Statusuri" buckets from `delegated` + `tasks` + `user.id` (no extra IPC).
- KPI counts derived in-render from `tasks`/`delegated` (no extra IPC).
- External: `toast` from `@/store/toastStore` (toast notifications); `formatDateTimeRo` from `@/lib/format`; `apiCommand` from `@/api/commands`.

## User actions & controls
- **Hero "Task nou" button** (`openCreate`) — opens editor in create mode with `{priority:'normal', assignee_id:null}`.
- **Tab switch** (AnimatedTabs) — between Ale mele / Delegate / Statusuri.
- **"Arată terminate" checkbox** (`showDone`) — toggles inclusion of done tasks (tasks & delegated tabs only).
- **TaskCard checkbox** (own tab only, `onToggle`/`quickToggle`) — if not done → opens Info modal to pick completion status; if done → one-click reopen via `update_personal_task` (status:'open').
- **TaskCard Info button** (`openInfo`) — refetches task and opens Info/completion modal.
- **TaskCard Edit button** (`openEdit`, `canEdit`) — opens editor in edit mode prefilled.
- **TaskCard Delete (trash) button** (`remove` → `delete_personal_task`) — no confirm dialog.
- **Info modal completion buttons** — "Rezolvat" / "Necesită clarificări" / "Nerezolvat" (`completeTask(status)`).
- **Info modal "Cere clarificări"** (assignee-only) — opens Clarification modal.
- **Info modal "Redeschide task-ul"** (`reopenTask`, when done + canEdit).
- **Statusuri "Review" button** per task (`openReview`) — opens Review modal (delegator action).
- **Review modal actions** — "Confirmă"/"Acceptă ca nerezolvat" (`confirmResolution`→delete), "Trimite înapoi" (`sendBack`), "Reasignează" (`sendBack(override)`).
- **Clarification modal "Trimite"** (`submitClarification`, disabled when text empty).
- **Aside "Marchează citit"** per mention (`markRead`) and **"Toate citite"** (`markAllRead`).
- Editor field inputs: title, description, instructions, notes, assignee select (create only), priority select, due_date date input.

## Modals & dialogs
- **TaskEditorModal** (create/edit) — fields: Titlu* (required), Descriere scurtă, Instrucțiuni detaliate, Note suplimentare, Asignează (create-only select, defaults "Pentru mine"), Prioritate (low/normal/high), Deadline (date). Header/button labels switch to "Task delegat nou"/"Deleagă" when an assignee ≠ self is chosen. Backdrop-click + X close.
- **TaskInfoModal** — read-only details (title, priority/status tags, due, delegated-by/towards chips, description, instructions, notes, completion summary if done). For not-done + canEdit: completion note textarea + 3 completion buttons; assignee-only "Cere clarificări" block. For done + canEdit: "Redeschide task-ul". `canEdit = owner or delegator`; `isAssignee = owner AND task was delegated to them`.
- **ReviewModal** (delegator) — shows assignee's completion note; "Notă pentru asignat"/"Răspuns / clarificări" textarea; for `unresolved` status a "Reasignează altcuiva" select (excludes the current assignee). Footer buttons vary by completion_status: resolved/needs_clarification → "Trimite înapoi" + "Confirmă"; unresolved → "Reasignează" (if target picked) or "Acceptă ca nerezolvat".
- **ClarificationModal** (assignee) — single question textarea (autofocus), "Trimite" disabled until non-empty; z-index 60 (stacks above Info modal).

## Filters / search / sort / tabs / sub-views
- **Tabs (AnimatedTabs):** `tasks` (Ale mele, count = open), `delegated` (Delegate, count = delegatedOpen), `statusuri` (Statusuri, count = reviewBuckets.total, Inbox icon). A 4th conceptual tab `mentions` exists in state type but mentions render in the aside, not as a main tab; `mainTab` collapses 'mentions' to 'tasks'.
- **Filter:** "Arată terminate" checkbox (show/hide done) — applied only on tasks & delegated tabs.
- **No text search, no sort controls, no pagination** — lists render full backend order.
- **Statusuri sub-views (buckets):** delegator sections `needs_clarification`, `unresolved`, `resolved` (each with Review action); assignee section `waiting_response` (read-only, tasks awaiting delegator: clarification_pending or done+completion_status set).

## Exports / print / file ops
- — none — (no export, print, PDF, upload, download, or clipboard).

## Keyboard shortcuts / realtime / polling
- — none — no custom keyboard shortcuts, no polling, no realtime/websocket. Data refreshes only via explicit `fetch()` after mutations / on mount. (Editor title input and Clarification textarea use `autoFocus`.)

## Sub-components owned
All defined in-file (single file owns everything):
- `KpiMini` — compact glassy metric tile for the KPI row.
- `TaskCard` — list row, shared by own/delegated tabs (checkbox, title/desc, priority/status/completion badges, due-date overdue styling, delegated-by/to chips, completed-by note, Info/Edit/Delete actions).
- `TaskEditorModal` — create/edit form modal.
- `TaskInfoModal` — details + completion flow modal.
- `StatusuriTab` — bucketed review view with EmptyState.
- `ReviewModal` — delegator response form.
- `ClarificationModal` — assignee question form.

## Access / permissions
- `canAssign = true` (hardcoded) — delegation available to every authenticated user; backend restriction was removed but the variable is kept as a future gate. The assignee dropdown only shows in create mode.
- `list_assignable_users` and `list_tasks_assigned_by_me` are `.catch(()=>[])`-wrapped — non-delegators / forbidden roles get empty arrays gracefully (server-side role gate inside those commands).
- Per-task edit/complete rights gated client-side: `canEdit = infoTask.user_id === user.id || infoTask.assigned_by_user_id === user.id` (owner or delegator); assignee-only clarification: `infoTask.user_id === user.id && assigned_by_user_id !== null`.
- No explicit viewer-only/role-tier gating beyond the above; authoritative enforcement is server-side per command.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the bento split: **main column = task lists with tab strip**, **aside = recent mentions feed**. KPI row (Deschise / Scadente azi / Săptămâna asta / Delegate de mine) sits above, hero with single primary "Task nou" action on top.
- Three primary segmented tabs (Ale mele / Delegate / Statusuri) with live count badges; the "Statusuri" inbox concept (delegator review queue + assignee "waiting" queue) is the most distinctive feature — preserve both perspectives and the per-task Review entry point.
- Lists are **card rows, not a dense table** — they carry rich inline metadata (priority, status, completion badge, overdue highlight, delegated-by/to chips, completed-by). Cards over table is the right call given mixed content; keep the overdue red border and done-state opacity dimming.
- Primary action = "Task nou" (hero). Row actions = Info / Edit / Delete + checkbox-to-complete. Consider adding a delete-confirm (currently none).
- The completion flow (Rezolvat / Necesită clarificări / Nerezolvat + optional note) and the delegator Review flow (Confirmă / Trimite înapoi / Reasignează) are the core verbs — surface them clearly in modals. Keep the 3-state completion semantics and the reassign-on-unresolved path.
- "Arată terminate" is a simple show/hide toggle — fine as a checkbox or a filter pill; no text search currently exists (could add one for long lists).
