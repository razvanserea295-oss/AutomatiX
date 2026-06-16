# ProcurementWorkspacePage — function inventory
**Route:** purchase-orders/suppliers/goods-receipt/rfqs/three-way-match · **Workspace:** procurement · **File:** pages/procurement/ProcurementWorkspacePage.tsx · **Lines:** 956
**Props/contract:** `ProcurementWorkspacePage({ user: User | null; initialTab?: TabId })` where `TabId = 'furnizori' | 'comenzi' | 'receptii'`. `initialTab` defaults to `'furnizori'`; `'receptii'` is redirected to `'furnizori'` (the receptions sub-tab is parked). `user` prop is accepted but unused in render.

## Backend functions (apiCommand) — ALL must survive
- `get_suppliers` — load supplier list · SuppliersTab mount (`fetchSuppliers`), PurchaseOrdersTab mount (parallel), workspace KPI fetch on mount
- `create_supplier` — create a new supplier · "Adaugă furnizor" → FormModal submit (when not editing)
- `update_supplier` — update existing supplier (sends `id` + fields) · row Edit (Pencil) → FormModal submit (when editing)
- `delete_supplier` — delete a supplier (blocked if it has linked orders) · row Delete (Trash2) after confirmDialog
- `get_purchase_orders` — load purchase orders · PurchaseOrdersTab mount, ReceptionsTab `loadOrders`, workspace KPI fetch on mount
- `get_materials` — load materials (id/code/name/unit) for PO line selects · PurchaseOrdersTab mount (parallel)
- `get_projects` — load projects (id/name) for PO project select · PurchaseOrdersTab mount (parallel)
- `create_purchase_order` — create a PO with supplier_id, project_id, internal_ref, lines[{material_id, qty_ordered}] · PurchaseOrderCreateModal "Creeaza comanda"
- `get_purchase_order` — load a single PO with its lines (PODetail) · ReceptionsTab left-list row click (`loadPODetail`)
- `receive_purchase_line` — receive qty on a PO line (payload `{ request: { purchase_order_line_id, qty_received } }`) · ReceptionsTab "Receptioneaza" → recepție FormModal submit

Note: the four enhancement files (ProcurementEnhancements, GoodsReceiptEnhancements, RfqsEnhancements, ThreeWayMatchEnhancements) contain **NO `apiCommand` calls** — they are localStorage + toast stubs. The only enhancement actually wired into the page is `SupplierToolsBar` (from ProcurementEnhancements). The others are imported by sibling pages, not by this page.

## Data sources (stores / hooks)
- `apiCommand` (`@/api/commands`) — all backend I/O (see above).
- `useDashboardStore` (`@/store/dashboardStore`) — `.getState().invalidate()` called after supplier create/update/delete and after PO create to refresh dashboard caches.
- `toast` (`@/store/toastStore`) — success/error/info notifications.
- `confirmDialog` (`@/components/ConfirmDialog`) — supplier delete confirmation.
- `useFormModal` (`@/hooks/useFormModal`) — open/close + editingItem/isEditing state for the supplier FormModal.
- `useSort` (`@/hooks/useSort`) — supplier table sorting (SupplierSortKey).
- `useColumnWidths` (`@/hooks/useColumnWidths`) — resizable supplier columns, persisted to localStorage key `promix-cols-suppliers`.
- `useLocalStorage` (`@/components/enhancements`) — all enhancement cards persist to localStorage (keys listed under Sub-components).
- Local `useState` only (no store) for PO orders/materials/projects lists, PO create modal, and reception detail/selection.

## User actions & controls
**Workspace shell:** AnimatedTabs switch between `furnizori` and `comenzi` (only two tabs registered in `TABS`). HeroHeader (decorative). KPI row of 4 KpiMini tiles (Furnizori / Comenzi / În așteptare / Finalizate) — display only.

**Suppliers tab:**
- "Adaugă furnizor" button (header + EmptyState action) → open create FormModal.
- "Export CSV" button → `exportSuppliersCSV` (client-side Blob download).
- "Printeaza" button → `printSuppliers` (opens print window).
- Per-row Edit (Pencil IconButton) → open FormModal pre-filled.
- Per-row Delete (Trash2 IconButton) → confirmDialog then `delete_supplier`.
- Website cell "↗" link → opens supplier website in new tab.
- Sortable column headers (name, category, products, contact_person, email, phone, cui, payment_terms) via SortableTh + useSort.
- Column resize handles (ColResizeHandle) on each sortable column, persisted.
- Supplier count display.

**SupplierToolsBar (pinned above suppliers list):**
- Lead time tracker: supplier select + promised(days) + actual(days) inputs + add button; per-row deviation badge; list persisted to localStorage.
- Negotiation history: supplier select + note + discount% inputs + "Adaugă"; per-row delete (Trash2); list persisted.

**Purchase Orders tab:**
- "Comanda noua" button → open PurchaseOrderCreateModal.
- "Export CSV" button → `exportOrdersCSV` (client-side Blob download).
- Read-only orders table (order_number, supplier, date, status badge, total). No row actions.
- Orders count display.

**PurchaseOrderCreateModal:**
- Supplier select (required), Project select (required), Internal ref text input.
- Dynamic line items: "+ Adaugă linie", material select + qty number input per line, remove-line "×" (when >1 line).
- "Creeaza comanda" submit (validates supplier, project, ≥1 valid line), "Anulează"/backdrop/× close.

**ReceptionsTab (parked, exported, not in TABS):**
- Left panel: list of pending POs (status not completed/cancelled/anulat); click loads PO detail.
- Right panel: PO header + lines table (Material, Comandat, Receptionat, Ramas, Acțiune).
- Per-line "Receptioneaza" button → opens recepție qty FormModal (disabled while receiving; shows spinner); "Complet" label when fully received.

## Modals & dialogs
- **Supplier FormModal** (`FormModal` + `useFormModal`) — create/edit supplier. Fields: name (required), category (select, 6 categories + necategorizat), products (textarea), cui (cui type), address (text), contact_person (text), email (email), phone (tel), website (text), payment_terms (text), notes (textarea). Submit → create_supplier or update_supplier.
- **PurchaseOrderCreateModal** (custom inline modal) — create PO. Fields: supplier (select, required), project (select, required), internal_ref (text), lines[] (material select + qty). Submit → create_purchase_order.
- **Reception qty FormModal** (ReceptionsTab, parked) — single field `qty` (number, required, max = remaining). Submit → receive_purchase_line.
- **confirmDialog** — supplier delete confirmation (danger).

## Filters / search / sort / tabs / sub-views
- **Tabs:** AnimatedTabs — `Furnizori` and `Comenzi achizitie` (only two active). `receptii` redirected away.
- **Sort:** Suppliers table fully sortable (8 keys, default name asc) via useSort/SortableTh. Orders table is NOT sortable. Reception PO list filtered to pending (no UI sort).
- **Search:** — none — (no search box on any tab).
- **Filters:** Reception PO list implicitly filtered to non-completed/non-cancelled orders (`pendingOrders` memo). No explicit filter UI.
- **Pagination:** — none — (tables scroll; supplier list capped at max-h-[70vh] overflow-auto; sticky header).
- **Sub-views:** Reception is a master-detail split (left PO list / right line table), but parked.

## Exports / print / file ops
- `exportSuppliersCSV` — CSV (Nume,Contact,Email,Telefon) Blob download, BOM-prefixed, filename `furnizori_<date>.csv`.
- `printSuppliers` — opens print window with a Furnizori HTML table.
- `exportOrdersCSV` — CSV (Nr. comanda,Furnizor,Data,Status,Total) Blob download, filename `comenzi_achizitie_<date>.csv`.
- File upload: ReceptionPhotoCard (GoodsReceiptEnhancements, not on this page) reads image files to data-URLs into localStorage.
- PrintBonCard (GoodsReceiptEnhancements, not on this page) opens a print window for a reception slip.
- ExportMenu (ThreeWayMatchEnhancements, not on this page) — Excel export of match rows.

## Keyboard shortcuts / realtime / polling
- Keyboard shortcuts: — none — (page-level).
- Realtime/polling: — none — (data loads once per tab mount / KPI loads once on workspace mount; refresh is manual via re-fetch after mutations).

## Sub-components owned
Defined in ProcurementWorkspacePage.tsx:
- `SuppliersTab`, `PurchaseOrdersTab`, `ReceptionsTab` (exported, parked), `PurchaseOrderCreateModal`, `KpiMini`.
- Helpers: `exportSuppliersCSV`, `printSuppliers`, `exportOrdersCSV`, `orderStatusTone`, `categoryLabel`, `SUPPLIER_CATEGORIES`.

Imported from ProcurementEnhancements.tsx (used by this page):
- `SupplierToolsBar` (active — renders LeadTimeCard + NegotiationCard above suppliers list).
- Also exported there but NOT used by this page: `ProcurementEnhancements` (default — ScorecardCard, AutoRfqCard, CompareOffersCard, AvlCard, LeadTimeCard, NegotiationCard, PoPlannerCard). localStorage keys: `promix_procurement_scores_v1`, `promix_procurement_avl_v1`, `promix_procurement_lead_v1`, `promix_procurement_negotiations_v1`.

Enhancement modules for sibling procurement routes (NOT mounted by this page, no apiCommand — localStorage/toast stubs):
- **GoodsReceiptEnhancements.tsx** — QualityChecklistCard, ReceptionPhotoCard (file upload), PartialReceiptCard, PrintBonCard (print), AutoUpdateInventoryCard, DiscrepancyReportCard. Keys: `promix_goodsreceipt_checklist_v1`, `promix_goodsreceipt_photos_v1`, `promix_goodsreceipt_partial_v1`, `promix_goodsreceipt_discrepancies_v1`.
- **RfqsEnhancements.tsx** — MultiSendCard, CompareMatrixCard, AwardCard, TemplateLibraryCard, DeadlineReminderCard, PublicLinkCard. Keys: `promix_rfqs_templates_v1`, `promix_rfq_reminder_hours_v1`.
- **ThreeWayMatchEnhancements.tsx** — AutoMatchRulesCard, ToleranceCard, ApprovalWorkflowCard, CurrencyConversionCard, AuditLogCard, ExportReportCard (ExportMenu Excel). Keys: `promix_3wm_rules_v1`, `promix_3wm_global_tolerance_v1`, `promix_3wm_exceptions_v1`, `promix_3wm_audit_v1`.

## Access / permissions
- No client-side role gating inside the page (no `access.ts` checks, no viewer-only branches). `user` prop is passed but unused.
- Gating is server-side per command (`get_suppliers`, `create_supplier`, etc. via withAuthenticatedUser/withAdminUser). Supplier delete is server-guarded against suppliers with linked orders (surfaced as a toast error).

## Rebuild notes (Modern-SaaS layout intent)
- Keep the **HeroHeader + 4-KPI glass row + tabbed GlassCard** scaffold — it is the approved airy/featured-KPI/glass dashboard direction. KPIs (suppliers, orders, pending, done) derive from `get_suppliers` + `get_purchase_orders` — no new IPC.
- **Two primary sub-views as tabs:** Furnizori (table) and Comenzi achiziție (table). Keep the parked Recepții master-detail code available for re-enable; ideally make it a third tab in the rebuild (the full receive flow + `get_purchase_order`/`receive_purchase_line` already exist).
- **Suppliers = data-dense sortable table** (keep sort + resizable columns + CSV/print). Primary action top-right: "Adaugă furnizor" (accent button). Row actions hover-revealed (edit/delete). Notes/products shown as secondary lines under name. This is a table, not cards — many columns, scan-heavy.
- **Orders = read-only table** currently; rebuild should surface status as StatusBadge and keep the "Comanda noua" multi-line create modal. Consider making rows clickable into a PO detail/receive view (the backend supports it).
- **SupplierToolsBar** (lead-time + negotiation) is localStorage-only utility UI pinned above the suppliers list — keep it but treat as secondary/collapsible so it doesn't crowd the primary table. The richer ProcurementEnhancements panel (scorecard/AVL/auto-RFQ/compare/planner) is currently retired from this page; decide whether to reintroduce as a side panel or drop.
- Primary action per tab is the single accent "create" button; exports/print are quiet secondary (outline) buttons next to the count chip.
