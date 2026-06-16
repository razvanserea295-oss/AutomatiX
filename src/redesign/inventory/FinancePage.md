# FinancePage — function inventory
**Route:** finance · **Workspace:** finance · **File:** pages/FinancePage.tsx · **Lines:** 915
**Props/contract:** `FinancePage({ user }: { user: User | null })` — the `user` prop is received but unused (destructured as `_user`); no role gating is applied client-side in this file.

## Backend functions (apiCommand) — ALL must survive
- `get_finance_overview` — loads KPI overview (revenue/cost/profit/margin/projects-at-risk) · OverviewTab `reload()` on mount + after final-cost save
- `get_finance_projects` — loads per-project finance rows (revenue, cost, profit, margin, risk, is_finalized) for the Overview table · OverviewTab `reload()` on mount + after final-cost save
- `set_project_final_cost` — saves the final production cost for a finalized project; recalculates margin/profit/risk · "Cost final" row button → final-cost editor modal "Salvează" / Enter key (`saveFinalCost`)
- `get_finance_insights` — loads receivables-aging buckets + flagged (financially-risky) projects · OverviewTab mount effect
- `get_finance_compliance` — loads compliance task counts (open / overdue / legal / accounting) · OverviewTab mount effect
- `get_invoices` — loads invoice list for the Invoices tab · InvoicesTab `fetchInvoices()` on mount + after create/payment/status-change
- `create_finance_invoice` — creates a new invoice (project, client, dates, currency, notes, single line item) · "Factura noua" FormModal submit (`handleCreateInvoice`)
- `record_invoice_payment` — records a payment against an invoice (amount, date, method) · invoice row CreditCard action → payment FormModal submit (`submitPayment`)
- `update_invoice_status` — changes invoice status (e.g. draft→sent, →cancelled) · invoice row Check / X actions (`handleStatusChange`)
- `get_project_expenses` — loads project expense ledger for the Expenses tab · ExpensesTab `fetchExpenses()` on mount + after create
- `create_project_expense` — creates a project expense (project, category, description, amount, currency, date, invoice_ref, notes) · "Cheltuiala noua" FormModal submit (`handleCreateExpense`)
- `get_profit_loss_report` — loads profit/loss report rows by type (`monthly` | `project`) and `year` · ReportsTab mount/effect on [reportType, year] + "Generează raport" button (`generateReport`)

> Note: `downloadInvoicePdf(inv.id)` (from `@/lib/downloadPdf`) is the invoice PDF download; it wraps its own backend call inside that lib (not an inline `apiCommand` literal in this file). Must survive as the per-row "Descarcă PDF" action.

## Data sources (stores / hooks)
- `useMoney()` (settingsStore) — currency-aware money formatter; used in all four tabs.
- `useEurRate()` (settingsStore) — EUR→RON rate; used in ExpensesTab to fold EUR expenses into RON for category totals.
- `useProjectStore` — `projects` list + `fetchProjects()`; feeds invoice & expense project selects (InvoicesTab, ExpensesTab).
- `useClientStore` — `clients` list + `fetchClients()`; feeds invoice client select (InvoicesTab).
- `useFormModal()` — open/close state for the create-invoice and create-expense modals.
- `useSort<Invoice, InvoiceSortKey>()` — client-side sort state for the invoices table (default `due_date` asc).
- `toast` (toastStore) — success/error toasts (final-cost save, invoice status change).
- `nativeNotify` — native OS notification on invoice creation.
- Local component state: `tab`, `refreshKey` (cross-tab refresh), `overview`, `projects`, `insights`, `compliance`, `costEdit`, `savingCost`, `invoices`, `payingInvoice`, `expenses`, `reportType`, `year`, `data`, `loading`.

## User actions & controls
- **Top tabs (AnimatedTabs):** Prezentare / Facturi / Cheltuieli / Rapoarte — switches `tab`.
- **Overview tab:**
  - "Cost final" button per finalized project row → opens final-cost editor.
  - 🔒 lock indicator on non-finalized projects (cost/profit/margin/risk cells show "—" / "Disponibil la finalizare", not editable).
  - Final-cost editor: number input (min 0, autofocus), Enter to save, "Anulează" / "Salvează" buttons; backdrop click cancels (unless saving).
- **Invoices tab:**
  - "Factura noua" button → create-invoice modal.
  - Sortable column headers (8 keys: invoice_number, project_name, client_name, total, paid_amount, remaining, status, due_date).
  - Per-row actions (appear on hover/focus): Download PDF (`downloadInvoicePdf`); Record payment (CreditCard, hidden when paid/cancelled); Mark sent (Check, only when draft → status `sent`); Cancel (X, hidden when paid/cancelled → status `cancelled`).
- **Expenses tab:**
  - "Cheltuiala noua" button → create-expense modal.
  - Category summary tiles (top-5 categories by RON-normalized amount, with % of total).
- **Reports tab:**
  - Three selector buttons: Raport Lunar (set monthly), Raport Proiecte (set project), Generează raport (reload current data).
  - Report-type `<select>` (Lunar / Pe proiect) and year `<select>` (2024–2027, monthly only).
  - "Export CSV" button.

## Modals & dialogs
- **Final-cost editor** (inline custom modal, OverviewTab) — edits: final cost (RON, number). Saves via `set_project_final_cost`.
- **Create invoice** (FormModal, "Factura noua") — fields: project_id (select, req), client_id (select, req), issue_date (date, req), due_date (date, req), currency (select RON/EUR), line_desc (text, req), line_qty (number, req), line_price (number, req), notes (textarea). Submits one-line invoice via `create_finance_invoice`.
- **Record payment** (FormModal, "Plata factura {nr}") — fields: amount (number, req, prefilled with `remaining`), payment_date (date, req, default today), payment_method (select transfer/cash/card, default transfer). Client-side validation: amount > 0 and ≤ remaining (+0.01 tolerance). Submits via `record_invoice_payment`.
- **Create expense** (FormModal, "Cheltuiala noua") — fields: project_id (select, req), category (select, req — 11 categories), description (text, req), amount (number, req), currency (select RON/EUR), date (date, req), invoice_ref (text, optional), notes (textarea). Submits via `create_project_expense`.

## Filters / search / sort / tabs / sub-views
- **Tabs:** 4 main tabs (overview / invoices / expenses / reports).
- **Sort:** Invoices table — client-side sortable on 8 columns via `useSort` + `SortableTh` (default due_date asc; date key special-cased to Date objects).
- **Report sub-views:** monthly vs project report type; year filter (2024–2027) for monthly.
- **Search:** — none —
- **Pagination:** — none — (all tables render full result sets).

## Exports / print / file ops
- **Invoice PDF download** — `downloadInvoicePdf(inv.id)` per invoice row (Download icon).
- **CSV export (Reports)** — `exportCSV()`: builds CSV (BOM-prefixed, headers vary by report type), triggers browser download `raport_{reportType}_{year}.csv` via Blob + object URL.
- **Print / upload / clipboard:** — none —

## Keyboard shortcuts / realtime / polling
- **Keyboard:** Enter inside the final-cost editor input triggers `saveFinalCost()`.
- **Realtime / polling:** — none — (data loads on mount/effect; cross-tab `refreshKey` re-mounts Overview & Reports after invoice/expense mutations via `onDataChange`).

## Sub-components owned
- `OverviewTab` — KPI cards, receivables-aging bar, flagged-projects alert, compliance grid, projects finance table, final-cost editor modal.
- `InvoicesTab` — toolbar, sortable invoices table, create-invoice + payment FormModals.
- `ExpensesTab` — toolbar, category summary tiles, expenses table, create-expense FormModal.
- `ReportsTab` — report-type selectors, controls bar, summary cards, profit/loss bar chart, report table, CSV export.
- `KpiMini` — compact glassy metric tile (icon + label + animated MetricValue) used in the Overview KPI row.
- `categoryLabels` (RO label map for 11 expense categories) — shared by ExpensesTab form, summary, and table.

## Access / permissions
- No client-side role gating in this file; `user` prop is ignored (`_user`). All authorization is enforced server-side per `apiCommand`. Page-level gating (if any) is handled by `src/lib/access.ts` outside this component.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the 4-tab structure (Prezentare / Facturi / Cheltuieli / Rapoarte) under a single HeroHeader; tabs as the primary nav. Primary action is tab-contextual ("Factura noua" / "Cheltuiala noua" / "Export CSV").
- **Overview:** lead with the 4 featured KPI tiles (Venituri / Costuri / Profit / Marja, RON, count-up). Below, surface insight strips only when present: receivables-aging mini-bar, flagged-projects alert (amber), compliance 4-stat grid. Then the projects finance table — keep the "locked until finalized" semantics (cost/profit/margin/risk hidden with a clear "Disponibil la finalizare" affordance) and the per-row "Cost final" editor as a small inline dialog (not a full page). Table fits the data better than cards (numeric, comparative).
- **Invoices:** keep as a dense sortable table (8 sort keys, currency-aware money, status badge via `invoiceStatus`). Row actions (PDF, payment, mark-sent, cancel) should stay hover-revealed but be reachable/keyboard-focusable. Payment as a prefilled modal (amount defaults to remaining) — preserve the > 0 and ≤ remaining validation.
- **Expenses:** category summary tiles (top-5, %-of-total, EUR→RON normalized) above a simple ledger table; keep the 11-category taxonomy and mixed-currency RON folding.
- **Reports:** monthly/project toggle + year picker, summary cards (revenue/expenses/gross profit), a profit/loss bar chart, the report table, and CSV export. Table is the source of truth; chart is supporting.
- Reuse shared primitives (HeroHeader, AnimatedTabs, GlassCard, MetricValue, StatusBadge, SortableTh, FormModal, Button, filterSelectCls). Do not hardcode hex; keep var-driven tokens. Cross-tab refresh after mutations must persist (refreshKey pattern or store invalidation).
