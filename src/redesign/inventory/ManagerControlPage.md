# ManagerControlPage — function inventory
**Route:** manager-control · **Workspace:** standalone · **File:** pages/ManagerControlPage.tsx · **Lines:** 400
**Props/contract:** `ManagerControlPage({ user }: { user: User | null })` — derives `role = user?.role_name`; `isManager = role === 'admin' || 'manager'`. Page is router-gated (`canAccessPage`) to admin/manager only.

## Backend functions (apiCommand) — ALL must survive
- `get_anomalies` — fetches the list of detected anomalies (`Anomaly[]`) · triggered by `loadAnomalies()` on mount + after detection/ack · ManagerControlPage.tsx:74
- `detect_anomalies` — runs the server-side anomaly detector, then reloads the list · triggered by the "Rulează detecție" header button (`detectAnomalies`) · ManagerControlPage.tsx:81
- `acknowledge_anomaly` — marks one anomaly as resolved (args `{ id }`) · triggered by the per-anomaly Check button (`ackAnomaly`) AND by the bulk-ack path passed into `ManagerEnhancements.onBulkAck` (one call per id, errors swallowed) · ManagerControlPage.tsx:91 and :244
- `get_activity_actors` — loads the list of audit actors (`ActivityActor[]`: user_id, names, role, event_count, last_active) to populate the user filter dropdown · triggered on mount in UserActivityLog · UserActivityLog.tsx:115
- `get_user_activity_log` — loads the audit trail (`ActivityEntry[]`) with args `{ from, to, limit: 1000 [, user_id] [, action] }` · triggered by `load()` whenever filters change + the "Reîmprospătează" button · UserActivityLog.tsx:126
- **Store-wrapped commands (via useHandoffStore — handoffStore.ts; the page never calls apiCommand directly for these but they are load-bearing):**
  - `fetchPending` store action — loads pending project handoffs (`pending`) · called on mount with `force=true`
  - `setUrgent` store action — toggles a handoff's urgent flag · called by `handleSetUrgent` (urgent toggle button)
  - `force` store action — forces a stage transition with a reason · called by `submitForce` (force modal submit)

## Data sources (stores / hooks)
- `useHandoffStore` (Zustand) — selectors: `pending` (ProjectHandoff[]), `fetchPending`, `setUrgent`, `force`. Primary supervision data.
- Local `useState` — `anomalies` (loaded via `get_anomalies`), `loadingAnom`, `forcing`, `forceReason`, `forceConfirmed`, `actingId`, `tab`.
- `UserActivityLog` local state — `actors`, `entries`, `userId`, `periodKey`, `actionFilter`, `loading` (data via `get_activity_actors` + `get_user_activity_log`).
- `useEscClose` hook — closes the force modal on Esc.
- `useLocalStorage` (from components/enhancements) — key `promix_manager_manual_anom_v1`, stores manual-anomaly drafts client-side only.
- `toast` (toastStore) — success/error notifications.

## User actions & controls
- **Tab switch** (AnimatedTabs, manager-only): "Supraveghere" ↔ "Activitate utilizatori".
- **"Rulează detecție"** header button → `detect_anomalies` (supervision tab only).
- **Handoff row — "Marchez urgent" / "Anulează urgent"** toggle → `setUrgent` (disabled while acting).
- **Handoff row — "Forțează"** button → opens force-transition modal.
- **Anomaly card — Check (✓) button** → `acknowledge_anomaly` for that id (optimistic remove from list).
- **ManagerEnhancements / Bulk acknowledge** — per-anomaly checkboxes (max 30 shown), optional common-reason text input, "Marchează rezolvate" button → `onBulkAck(selectedIds)` (→ `acknowledge_anomaly` per id).
- **ManagerEnhancements / Manual anomaly** — severity select (low/medium/high/critical), title input, "+" add button → appends to localStorage list (no backend).
- **UserActivityLog — Reîmprospătează** button → reloads `get_user_activity_log`.
- **UserActivityLog filters** — user select, period select, action select (each re-triggers load).

## Modals & dialogs
- **Force transition modal** (inline, fixed overlay; `forcing` truthy). Purpose: force a project handoff transition past a missing accept. Shows project_name, from_stage_name → to_stage_name. Fields edited: `forceReason` textarea (required), `forceConfirmed` checkbox (required confirmation). Actions: "Anulează" (resets state), "Forțează" (`submitForce` → `force` store action; disabled until reason + confirm + not acting). Closes on backdrop click / Esc (useEscClose) / success.
- No other modals; ManagerEnhancements cards render inline (not dialogs).

## Filters / search / sort / tabs / sub-views
- **Page tabs:** supervision · activity (AnimatedTabs, manager-only; non-managers see supervision only — tab strip hidden).
- **Supervision sub-sections:** KPI grid; "Predări blocate >24h" (overdue, shown only if >0); "Toate predările pendinte (n)"; "Anomalii detectate (n)"; ManagerEnhancements tools.
- **Overdue derivation:** `pending.filter(sla_due_at < now)` (client-side, no sort control).
- **Activity tab filters (UserActivityLog):** Utilizator (all / per actor with event_count), Perioadă (7d / 30d / 6m / 1y presets → from/to), Acțiune (all + distinct actions present). Entries grouped by calendar day (newest-first); per-action summary badge counts. Hard limit 1000 events with a truncation warning banner.
- Bulk-ack list caps display at first 30 anomalies. No pagination elsewhere.

## Exports / print / file ops
- **Incident report export** (ManagerEnhancements `IncidentReportCard` → `ExportMenu`): exports anomalies with columns id/severity/title/description/created_at, filename "incidente", title "Raport incidente lunar" (CSV/PDF/etc. per ExportMenu capability). For the monthly management meeting.
- No print, upload, or clipboard actions on this page.

## Keyboard shortcuts / realtime / polling
- **Esc** closes the force-transition modal (useEscClose).
- No polling/realtime — data loads once on mount (`fetchPending(true)`, `loadAnomalies`, `get_activity_actors`) and on explicit user action (detect, ack, refresh, filter change). Manual "Reîmprospătează" / "Rulează detecție" are the refresh path.

## Sub-components owned
- `Section` — titled section wrapper (ManagerControlPage.tsx).
- `HandoffRow` — one pending/overdue handoff card with urgent + force actions.
- `KpiMini` — glassy KPI tile (GlassCard + MetricValue count-up).
- `UserActivityLog` (pages/manager/UserActivityLog.tsx) — audit timeline view; internal helpers `Evidence` (renders details JSON as key=value chips), `actionTone`, period/date helpers.
- `ManagerEnhancements` (pages/manager/ManagerEnhancements.tsx) — wrapper rendering `TrendChartCard` (30-day anomaly bar trend), `BulkAckCard`, `ManualAnomalyCard`, `IncidentReportCard`. NOTE: `EscalationRulesCard`, `SlaRulesCard`, `ReassignCard` were removed from render (Q2 simplification) — defined no longer; do not resurrect without backend support.

## Access / permissions
- Page router-gated to admin/manager via `canAccessPage` (per file header comment).
- `isManager` (admin|manager) gates the tab strip; non-managers can only see the supervision tab.
- Activity log: server enforces the manager/admin gate on `get_user_activity_log` / `get_activity_actors` (client just renders).
- Force transition is logged server-side as "forced by Manager" in handoff history.

## Rebuild notes (Modern-SaaS layout intent)
Two-view page under one HeroHeader ("Birou de control"), tab-switched: **Supervision** and **User activity**.
- **Supervision:** lead with a 4-up KPI strip (pending · overdue >24h · urgent · unresolved anomalies — keep count-up + warn states). Below, a clean priority-ordered stack: Overdue handoffs (only when non-empty, red accent), All pending handoffs, Anomalies (severity-sorted, left-border tint by severity), then a collapsible "Advanced manager tools" group (trend chart, bulk ack, manual anomaly, incident export). Handoffs read best as **rows/cards** (project → role, stage→stage, SLA time, two trailing actions: urgent toggle + Forțează), not a dense table — keep the per-row primary/destructive split. Primary header action = "Rulează detecție".
- **Force modal:** keep as a focused destructive dialog — required reason + explicit confirm checkbox + disabled-until-valid submit; red framing.
- **User activity:** filter bar (user / period / action / refresh) + per-action summary chips + a day-grouped vertical **timeline** (time · action badge · entity · evidence chips · IP). Sticky day headers; keep the 1000-cap warning. Airy spacing, mono for timestamps/IP.
- Preserve every apiCommand and the localStorage manual-anomaly behavior; do not re-add the removed escalation/SLA/reassign cards (no backend).
