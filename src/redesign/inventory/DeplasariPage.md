# DeplasariPage — function inventory
**Route:** deplasari · **Workspace:** personal · **File:** pages/deplasari/DeplasariPage.tsx · **Lines:** 1543
**Props/contract:** `DeplasariPage({ user }: { user: User | null })` — top-level page component. Only `user` is consumed (for role gating: `user.role_id`). No callbacks/render-props.

## Backend functions (apiCommand) — ALL must survive
- `get_deplasari` — loads the full list of `Deplasare[]` for the table, KPIs, active-aside · triggered by `fetch()` on mount + after every mutation.
- `create_deplasare` — creates a new trip (person, extra persons, destination, reason, project, dates, notes; cost fields intentionally NOT sent at creation) · triggered by CreateDeplasareModal submit (new mode).
- `update_deplasare` — full update of a trip; used in 4 distinct ways: (1) **Edit modal** — details + status + all costs (transport/accommodation/diurna_per_day/diurna_total/other_costs/currency/diurna_people); (2) **CompleteCostsModal** — costs only; (3) **Mark returned** — `{status:'intors', return_date:today}`; (4) **PaymentsModal close** — `{status:'finalizat'}` returns the updated row incl. `exported_expense_id` (auto-post to Financiar/Cheltuieli) · triggered by Edit modal save, Complete-costs save, the ◀ "Marcat întors" row/card button, and the "Marchează încheiată" close button.
- `delete_deplasare` — deletes a trip (after confirm dialog) · triggered by the 🗑 trash row action.
- `list_deplasare_payments` — fetches `{ payments[], total_paid, total_cost, remaining, currency, eur_rate }` for a trip · triggered on mount of PaymentsSection (inside Info modal) and PaymentsModal.
- `record_deplasare_payment` — logs a payment to a traveller `{ deplasare_id, amount, currency, paid_at, paid_to, note }` (paid_at/note omitted in the compact PaymentsSection form) · triggered by "Adaugă plată"/"Plată" buttons.
- `delete_deplasare_payment` — deletes a single payment `{ id }` (after confirm) · triggered by the 🗑 button on each payment ledger row (both PaymentsSection and PaymentsModal).

## Data sources (stores / hooks)
- Local state `deplasari: Deplasare[]` loaded via `apiCommand('get_deplasari')` (no Zustand store for the list itself).
- `useProjectStore` → `projects`, `fetchProjects()` — populates the project `<select>` in create/edit.
- `useDashboardStore.getState().invalidate()` — called after every mutation so the dashboard refreshes.
- `useSettingsStore` → `eurToRonRate` (RON↔EUR fold for "Cost total" KPI + payment currency conversion), `load()` (settings bootstrap).
- `useMoney()` (from settingsStore) — app-wide currency formatter, used throughout for `money(n, currency)`.
- `useSort<Deplasare, DepSortKey>` (`@/hooks/useSort`) — client-side sortable table.
- `useEscClose(true, onClose)` — ESC-to-close on every modal.
- `toast` (toastStore), `nativeNotify` (lib/nativeNotify), `confirmDialog` (ConfirmDialog) — feedback/confirmations.
- `deplasareStatus` (lib/statusTokens) — status → StatusBadge tone/label resolver.

## User actions & controls
- **Hero:** "Deplasare nouă" (+) button → opens CreateDeplasareModal; live "{n} în deplasare" chip when active>0.
- **KPI row (4 tiles):** Total deplasări, Active acum, Costuri întârziate (warn-colored when >0), Cost total (money-formatted, EUR folded to RON).
- **Table row actions (4 per row):** Info (ℹ details modal), Wallet (💰 Plăți & buget modal), Pencil (✎ edit modal), Trash (🗑 delete w/ confirm).
- **Active-trips aside card actions (4 per card):** Info, Wallet, Pencil, ◀ "Marcat întors" (mark returned → status `intors`, sets return_date=today).
- **Sortable columns:** person_name, destination, reason, project_name, departure_date, return_date, status (via SortableTh; default sort departure_date desc).
- **Create/Edit modal controls:** person name, add/remove extra travellers (dynamic rows), destination, reason, project select, departure date, return date, notes; **edit-only:** status select, currency select, transport/accommodation/other cost inputs, DiurnaField (rate/day + "= total" auto-calc button + manual total), live total readout.
- **CompleteCostsModal:** currency, transport (req), accommodation (req), other, DiurnaField, total readout; finalizes when transport>0 && accommodation>0.
- **PaymentsModal:** add-payment form (date, amount req, currency, beneficiary w/ datalist of trip persons, note), payment ledger with per-row delete, budget progress bar, "Marchează încheiată" close button (Admin/Manager only).
- **Top synced horizontal scrollbar** mirroring the table's scrollLeft (custom ref-based sync).

## Modals & dialogs
- **CreateDeplasareModal** (dual-mode create/edit) — fields: person_name, additional_persons[], destination, reason, project_id, departure_date, return_date, notes; edit adds status + transport/accommodation/other/diurna_per_day/diurna_total + currency. Submits `create_deplasare` or `update_deplasare`.
- **CompleteCostsModal** — fields: currency, transport_cost, accommodation_cost, other_costs, diurna_per_day, diurna_total. Submits `update_deplasare`; auto-finalizes + `nativeNotify` when both transport & accommodation > 0. (Opened only from the Info modal's "Completează costuri" CTA / `intors` footer button — not wired to a table row directly.)
- **DeplasareInfoModal** — read-only overview: People, Route, Timeline (incl. costs_completed_at), Costs breakdown, embedded PaymentsSection, Notes, Created-by. CTAs: "Completează costuri" (→ CompleteCostsModal) when status=`intors`; "Deschide panoul complet Plăți & buget" (→ PaymentsModal).
- **PaymentsModal** — budget summary (total/paid/remaining + progress bar + over-budget warning), payments ledger (add/delete), close-delegation section (gated to canClose; explains auto-post to Financiar/Cheltuieli; warns if no project). EUR↔RON conversion hint at BNR rate.
- **confirmDialog** — used for: delete trip (danger), delete payment (danger), payment-over-budget warning, close-delegation confirmation (with project/budget context hints).

## Filters / search / sort / tabs / sub-views
- **Search** (FilterBar): matches person_name, destination, reason, project_name, and additional_persons.
- **Status filter** (single select): viitoare, in_deplasare, Intors (costuri lipsa), finalizat, anulat — filters on `computeDisplayStatus`.
- **Sort:** 7 sortable columns (see above), default departure_date desc.
- **Sub-views:** main history table + "În deplasare acum" aside (active trips, future-dated excluded) + overdue-costs alert card. No tabs, no pagination (TableFiller pads to 16 rows).
- **Derived status:** `computeDisplayStatus` maps future-dated `in_deplasare` → `viitoare`; overdue = `intors` >7 days w/o both transport & accommodation costs.

## Exports / print / file ops
- No direct PDF/CSV/print/upload from the page. **Indirect:** closing a delegation (`update_deplasare status:finalizat`) auto-posts costs into Financiar/Cheltuieli (returns `exported_expense_id`); surfaced via "Postat automat în Financiar / Cheltuieli" chip. No clipboard.

## Keyboard shortcuts / realtime / polling
- **ESC** closes every modal (`useEscClose`). No other shortcuts.
- No polling / websockets / realtime. Refresh is manual: `fetch()` re-runs after each mutation, plus `useDashboardStore.invalidate()`.
- `nativeNotify` desktop notification on delegation close / cost finalize.

## Sub-components owned
- **KpiMini** — glass metric tile for the KPI row.
- **CreateDeplasareModal** — create/edit trip modal.
- **CompleteCostsModal** — final-costs entry modal.
- **DeplasareInfoModal** — read-only overview modal.
- **PaymentsSection** — embedded budget/payments mini-ledger (used inside Info modal).
- **PaymentsModal** — full payments & budget + close-delegation modal.
- **Section** — labeled icon section wrapper (modals).
- **InfoRow / CostBox / Mini** — small read-only value tiles.
- **Field** — labeled form-field wrapper (with required marker).
- **CurrencySelect** — RON/EUR picker.
- **DiurnaField** — per-diem rate + auto-compute (rate × days × headcount) + editable total.
- **ModalStyles** — scoped `.input-md` styles injected per modal.
- Helpers: `tripDays`, `computeDisplayStatus`, `daysSinceReturn`.

## Access / permissions
- **Close delegation** (`status → finalizat` via PaymentsModal "Marchează încheiată") is **Admin (role_id 1) or Manager (role_id 3) only** — `canCloseTrip = user?.role_id === 1 || === 3`; backend enforces the same on `update_deplasare`. Non-privileged users see a locked notice ("Doar Admin sau Manager poate închide delegația").
- All other actions (create, edit, complete costs, mark returned, record/delete payments, delete trip) are available to any authenticated user reaching the page (page-level gating handled upstream in `src/lib/access.ts`).

## Rebuild notes (Modern-SaaS layout intent)
- Keep the **split layout**: wide history table (flex-1) + fixed ~300px right rail (overdue alert card + "În deplasare acum" active-trip cards). Stacks below xl. Do NOT force `.mod-bento` — an 8-col table needs the width.
- **Hero** with primary action "Deplasare nouă" top-right + live active-count chip. **KPI row** of 4 tiles (Total, Active, Costuri întârziate [warn], Cost total).
- **Table** (not cards) for history: 7 sortable columns + sticky right Acțiuni column with 4 icon actions; sticky header; top-pinned horizontal scrollbar; row tint red when overdue; `+n` badge for extra travellers.
- Preserve all **4 modals** and their exact field sets — especially the DiurnaField auto-calc, currency (RON/EUR) per trip, and the payments ledger / budget progress / close-delegation flow with role gating.
- Status lifecycle to honor: `viitoare → in_deplasare → intors (costuri lipsă) → finalizat`, plus `anulat`; derived `viitoare`/`intors`/overdue computed client-side — replicate `computeDisplayStatus`, `daysSinceReturn`, `tripDays`.
- Cost-overdue alerting (>7 days, missing transport+accommodation) and the auto-post-to-Financiar on close are load-bearing business rules — surface them clearly.
