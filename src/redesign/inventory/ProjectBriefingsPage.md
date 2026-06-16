# ProjectBriefingsPage — function inventory
**Route:** briefings · **Workspace:** engineering · **File:** pages/ProjectBriefingsPage.tsx · **Lines:** 970
**Props/contract:** `export default function ProjectBriefingsPage()` — no props (route-level page component).

## Backend functions (apiCommand) — ALL must survive
- `get_project_briefings` — loads the master list of briefings; args `{ mode: 'inbox'|'sent'|'all', status?: Status }` · triggered by page load + tab change (mode) + status filter change (via `refresh()`)
- `get_users` — loads user list for the "Proiectant" (assignee) dropdown in CreateModal · triggered once on mount
- `update_project_briefing_status` — advances briefing status (acknowledged / accepted / rejected / completed / cancelled), passes extra fields like `rejection_reason` · triggered by (a) auto-acknowledge effect when assignee opens a `sent` briefing, and (b) the action-bar buttons (Acceptă / Refuză / Acceptă oricum / Marchează finalizat / Anulează briefing)
- `create_project_briefing` — creates a new briefing as `draft` or `sent`; args include title, project_id, assigned_to_user_id, scope, technical_requirements, client_expectations, deadline, priority, status · triggered by CreateModal "Salvează ca ciornă" / "Trimite briefing"
- `list_briefing_clarifications` — loads the Q&A thread for the selected briefing; args `{ briefing_id }` · triggered when the Clarificări tab opens (and after ask/answer/reopen)
- `ask_briefing_clarification` — posts a new question; args `{ briefing_id, question }` · triggered by "Trimite" in the "Pune o întrebare nouă" box
- `answer_briefing_clarification` — answers a pending clarification; args `{ id, answer }` · triggered by ClarificationItem "Trimite răspuns"
- `reopen_briefing_clarification` — reopens an answered clarification; args `{ id }` · triggered by ClarificationItem "Redeschide"
- `list_briefing_attachments` — loads attachments for a briefing; args `{ briefing_id }` · triggered when BriefingAttachments mounts / after upload/delete/note-edit
- `delete_briefing_attachment` — removes an attachment; args `{ id }` · triggered by per-file Trash2 button (after confirmDialog)
- `update_briefing_attachment_note` — saves the inline annotation/note for an attachment; args `{ id, annotation }` · triggered by inline textarea blur / Enter in BriefingAttachments

Indirect commands invoked via helper libs (still load-bearing for this page):
- `uploadBriefingFile(briefingId, file, note, onProgress)` from `@/lib/briefingUpload` — chunked streaming upload (server stores on disk >5MB / inline); honors `BRIEFING_MAX_BYTES` (500MB) · triggered by "Adaugă fișier" / drag-drop
- `downloadOneBriefingAttachment(id)` from `@/lib/downloadPdf` — downloads a single attachment · triggered by per-file Download button

## Data sources (stores / hooks)
- `useProjectStore` → `projects` (list) and `fetchProjects()` (called on mount) — feeds the "Proiect (opțional)" dropdown in CreateModal
- `useAuthStore` → `me` (current user); `isAdmin = me?.role_name === 'admin'` — drives the "Toate" tab visibility + all permission gating
- Local React state: `mode`, `statusFilter`, `list`, `loading`, `selectedId`, `createOpen`, `users`; derived `selected` (useMemo) and `briefStats` (useMemo KPIs); detail/attachment/clarification sub-state inside child components
- `apiCommand` direct calls (no dedicated store for briefings/clarifications/attachments)

## User actions & controls
- **Briefing nou** button (hero header) → opens CreateModal
- **Mode tabs**: Primite (inbox) / Trimise (sent) / Toate (all, admin-only) — switching resets `selectedId`
- **Status filter** select — filters list by any of 8 statuses or "Toate statusurile"
- **Master list rows** — click selects a briefing (loads detail); shows title, status badge, from/to, project, priority dot, deadline, open-clarification count, timeAgo
- **Detail tabs**: Briefing / Clarificări (Clarificări shows a red count badge when `open_clarifications > 0`)
- **Action bar (status transitions)**, gated by role/status:
  - **Acceptă** (status=sent) → accepted
  - **Refuză** (status=sent or acknowledged) → rejected; `prompt('Motiv refuz:')` captures reason
  - **Acceptă oricum** (status=clarification_requested) → accepted
  - **Marchează finalizat** (status=accepted) → completed
  - **Creează fișa (soon)** (status=accepted) — DISABLED placeholder (designer sheet pre-fill, step 5)
  - **Anulează briefing** (author/admin, not closed) → cancelled; `confirm()` guard
  - Closed state shows a label + completed_at date instead of buttons
- **Clarifications**:
  - "Pune o întrebare nouă" textarea + **Trimite** → ask_briefing_clarification (hidden when briefing closed)
  - Per-item **Răspunde** → inline reply textarea + **Trimite răspuns** / **Anulează** (pending items)
  - Per-item **Redeschide** → reopen_briefing_clarification (answered items)
- **Attachments** (BriefingAttachments):
  - **Adaugă fișier** button + drag-and-drop zone (click also opens picker) — multi-file, any type, 500MB cap each, progress %
  - Note input applied to the next uploads
  - Per-file **Download**, **Șterge** (admin or owner only, with confirmDialog)
  - Inline **note edit** per file (click → textarea, save on blur / Enter, Escape cancels, max 500)

## Modals & dialogs
- **CreateModal** — "Briefing nou". Fields: Titlu (required), Proiectant/assignee select (required), Proiect select (optional/standalone), Deadline (date), Prioritate (low/medium/high/critical), Scop (textarea), Cerințe tehnice (textarea), Așteptări client (textarea). Footer: "Salvează ca ciornă" (status=draft) and "Trimite briefing" (status=sent). Closes on backdrop click / X.
- **confirmDialog** (`@/components/ConfirmDialog`) — "Ștergi fișierul?" before deleting an attachment (danger).
- **Native `prompt()`** — "Motiv refuz:" when rejecting a briefing.
- **Native `confirm()`** — "Sigur anulezi briefing-ul?" when cancelling.

## Filters / search / sort / tabs / sub-views
- **Tabs (mode):** Primite / Trimise / Toate (Toate admin-only) — server-side filter via `get_project_briefings` `mode`
- **Status filter:** dropdown, 8 statuses + "all" — server-side filter via `status` arg
- **Detail sub-views:** Briefing tab vs Clarificări tab
- **No client-side sort, no search box, no pagination** — list order/limit is server-driven; count label shows `list.length`

## Exports / print / file ops
- **File upload:** multi-file, any type (PDF/Excel/Word/images/CAD/ZIP…), drag-and-drop or picker, 500MB/file cap, chunked streaming with live % via `uploadBriefingFile`
- **File download:** per-attachment via `downloadOneBriefingAttachment`
- **No PDF export / print / clipboard** on this page

## Keyboard shortcuts / realtime / polling
- **No polling, no realtime/websocket.** Refresh is manual/event-driven (after each mutation via `onChanged`/`refresh`).
- **Auto-acknowledge effect:** when the assignee opens a briefing whose status is exactly `sent`, fires `update_project_briefing_status → acknowledged` then refreshes (non-fatal on error).
- **Keyboard:** in inline note textarea — Enter (no shift) blurs/saves, Escape cancels; reply textareas autoFocus. No global shortcuts.

## Sub-components owned
- `ModeTab` — inbox/sent/all tab pill (uses `filterToggleCls`)
- `BriefingDetail` — right-hand detail panel (header, tabs, body, action bar); owns status transitions + clarification thread
- `BriefingAttachments` — attachment grid with upload/drag-drop/download/delete/inline-note; helper `fileKind()` picks icon+tint by mime/extension
- `ClarificationItem` — single Q&A card with answer/reopen flows
- `Section` — labelled read-only text block (Scop / Cerințe tehnice / Așteptări client)
- `DetailTab` — Briefing/Clarificări tab button
- `CreateModal` — new-briefing modal
- `Field` — labelled form-field wrapper
- `KpiMini` — compact glass KPI tile
- Types/maps owned: `Briefing`, `Clarification`, `UserRow`, `BriefingAttachment`, `Mode`, `Status`, `Priority`; `STATUS_LABEL`, `STATUS_TONE`, `PRIORITY_COLOR`, `PRIORITY_LABEL`; helpers `formatDate`, `timeAgo`

## Access / permissions
- **Wide-by-design (2-role intent):** anyone can create a briefing; anyone can ask/answer clarifications.
- **"Toate" tab** visible only to admin (`isAdmin`).
- **Action bar** (Acceptă / Refuză / Acceptă oricum / Marchează finalizat): `canManage = isAssignee || isAdmin`.
- **Anulează briefing:** `canCancel = isAuthor || isAdmin`, only when not closed.
- **Attachment delete:** admin OR the file's creator (`me.id === a.created_by_user_id`).
- **Auto-acknowledge:** only fires for the assignee (`assigned_to_user_id === me.id`).
- Server enforces real authz per command; client gating is UX-only.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the **master-detail split** (left list ~380px, right detail) — it suits an intake/inbox flow. Do NOT force `.mod-bento`/ListReport here (per memory: master-detail is exempt).
- **Top:** airy HeroHeader (eyebrow "Proiectare", icon MessageCircle) + primary action **Briefing nou**, followed by the **4 featured-KPI tiles** (Total / În lucru / Clarificări / Finalizate) — KPIs are derived client-side, no extra IPC.
- **Filter strip:** mode tabs (Primite/Trimise/Toate) + status select + count, using centralized `filterControls` classes — don't hardcode pill/select styles.
- **Detail panel:** header (title + status badge + from/to/project/priority/deadline/timeAgo), two tabs (Briefing read-sections + Attachments card; Clarificări Q&A thread), and a sticky bottom **action bar** whose buttons appear by status+role. Preserve every status transition and the disabled "Creează fișa (soon)" placeholder.
- **Replace native `prompt()`/`confirm()`** for reject-reason and cancel with proper modals/inputs for a clean SaaS feel (keep the same data flow → `update_project_briefing_status`).
- **Attachments:** keep drag-drop + multi-upload + per-file note + 500MB cap + download/delete; cards in a responsive grid.
- Table vs cards: master list = compact list rows; attachments = card grid. No pagination needed unless lists grow large (then add server-side paging on `get_project_briefings`).
