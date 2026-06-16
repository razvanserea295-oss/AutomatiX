# QuotationsPage — function inventory
**Route:** quotations · **Workspace:** sales · **File:** pages/sales/QuotationsPage.tsx · **Lines:** 870
**Props/contract:** `QuotationsPage({ user: _user }: { user: User | null })` — receives the current `User | null` but does NOT use it (prefixed `_user`; no client-side role gating in this page).

## Backend functions (apiCommand) — ALL must survive
- `list_quotations` — loads all quotations (with `lines` + `events`) into the list · triggered by `fetchAll()` on mount and after every mutation.
- `get_quotation_stats` — loads funnel `Stats` (draft/sent/viewed/accepted/rejected/converted/expired/pipeline_value) for the KPI row · `fetchAll()` on mount and after mutations.
- `delete_quotation` — `{ quotation_id }` deletes an offer · "trash" Button in detail actions (after confirm dialog).
- `decide_quotation` — `{ quotation_id, decision: 'accepted'|'rejected', reason }` marks accepted/rejected (reason via window.prompt for reject) · "Acceptată" / "Refuzată" buttons (shown for status sent|viewed).
- `list_quotation_attachments` — `{ quotation_id }` lists uploaded documents for the selected offer · `loadAttachments()` on selection change and after upload/delete.
- `add_quotation_attachment` — `{ quotation_id, filename, mime, data(base64) }` uploads a file (any format, ≤35 MB) · "Încarcă" file input in detail Documente section AND in the builder (attaches selected files to the freshly-created offer).
- `delete_quotation_attachment` — `{ id }` removes an uploaded document · trash icon on each attachment row (after confirm dialog).
- `create_quotation` — `{ request: {lead_id, client_id, client_name, contact_email, title, description, valid_until, discount_percent, tva_rate, currency, notes, lines[]} }` creates a new offer · "Creează ofertă" in QuotationBuilder.
- `send_quotation` — `{ request: {quotation_id, to_email, cc_emails[], subject, body_html?} }` emails the offer (PDF auto-attached) · "Trimite" in SendQuotationModal.
- `convert_quotation_to_contract` — `{ quotation_id, project_id }` converts an accepted offer into a contract · "Convertește" in ConvertModal.
- `generate_pdf_quotation` — `{ quotation_id }` returns a PdfPayload, triggers browser download · "PDF" button in detail actions (via lazy `downloadOfferPdfFromQuotation` from `@/lib/downloadPdf`).
- `get_quotation_attachment` — `{ id }` returns full base64 of one uploaded file for download · per-attachment "Download" icon (via lazy `downloadOneQuotationAttachment` from `@/lib/downloadPdf`).

## Data sources (stores / hooks)
- `apiCommand` (direct) — quotations list + stats + all mutations (no dedicated quotations store).
- `useMoney()` (settingsStore) — currency formatter for list totals, KPI pipeline value.
- `useClientStore` — `clients` + `fetchClients()` (client dropdown in builder).
- `useProjectStore` — `projects` + `fetchProjects()` (project dropdown in ConvertModal).
- `useSalesStore` — `leads` + `fetchLeads()` (lead-association dropdown in builder, filtered `status !== 'convertit'`).
- Local React state: `quotations`, `stats`, `selected`, `loading`, `showBuilder`, `showSend`, `showConvert`, `attachments`, `uploading`.

## User actions & controls
- **Ofertă nouă** (hero action + EmptyState action) → opens QuotationBuilder.
- **Select offer** — click any list row → loads it into the detail aside (and refetches its attachments).
- **PDF** (detail) → downloads quotation PDF (`generate_pdf_quotation`).
- **Trimite email** (detail, hidden when status converted/rejected) → opens SendQuotationModal.
- **Acceptată / Refuzată** (detail, only status sent|viewed) → `decide_quotation`; reject prompts for an optional reason via `window.prompt`.
- **Convertește în contract** (detail, only status accepted && no `converted_contract_id`) → opens ConvertModal.
- **Trash** (detail, ghost) → `delete_quotation` after confirm.
- **Încarcă** (detail Documente) → multi-file picker → `add_quotation_attachment` per file (skips empty / >35 MB).
- **Download attachment** (per row) → `get_quotation_attachment` download.
- **Delete attachment** (per row) → `delete_quotation_attachment` after confirm.
- **Builder line editing**: add line, remove line, inline-edit description/quantity/unit/unit_price/discount_percent; live per-line + grand totals; client-/lead-driven auto-fill of name/email/title; TVA-rate select; currency select; attach files at creation.

## Modals & dialogs
- **QuotationBuilder** (`max-w-4xl`) — create offer. Fields: lead (optional, excludes convertit), client-from-DB, client name*, contact email, title*, valid-until (date), global discount %, TVA rate (21/19/9/5/0), description, dynamic line rows (description/qty/UM/unit price/disc%/computed line total), notes, currency (RON/EUR), file attachments (multi, any format, ≤35 MB). Live subtotal/TVA/total summary.
- **SendQuotationModal** (`max-w-xl`) — fields: to_email* (prefilled from contact_email), cc_emails (comma-sep), subject (prefilled `Ofertă <num> — <title>`), body_html (optional; auto-generated if blank). Note: PDF auto-attached.
- **ConvertModal** (`max-w-md`) — single field: destination project* (select from projects). Shows client + total preview.
- **confirmDialog** (shared) — used for delete offer and delete attachment.
- **window.prompt** — reject reason capture.

## Filters / search / sort / tabs / sub-views
- **— none —** No text search, no filters, no sort controls, no tabs, no pagination. Master-detail bento: full quotations list (left) + selected-offer detail (right). List shows total count; STATUS_TONE maps status→localized label+tone for badges.

## Exports / print / file ops
- **PDF download** of a quotation (`generate_pdf_quotation` via lazy `downloadOfferPdfFromQuotation`).
- **Email send** with PDF auto-attached (`send_quotation`).
- **File upload** — multi-file attachments to an offer (base64, ≤35 MB cap; `fileToBase64` helper strips data-URL prefix), both in builder (deferred to post-create) and in detail.
- **File download** — single uploaded attachment (`get_quotation_attachment` via lazy `downloadOneQuotationAttachment`).
- **— no — clipboard / print / CSV / bulk export.**

## Keyboard shortcuts / realtime / polling
- **— none —** No keyboard shortcuts, no realtime/websocket, no polling. Refresh is manual via `fetchAll()` after each mutation. `window.prompt` is the only native dialog.

## Sub-components owned
- `KpiMini` — glassy metric tile for the KPI funnel row.
- `QuotationDetail` — selected-offer aside (header, action bar, totals, lines, Documente upload/list, Tracking timeline).
- `Row` — label/value line (used in totals + tracking).
- `QuotationBuilder` — create-offer modal (with line editor + attachments).
- `Field` — labeled form-field wrapper (shared by builder/send/convert modals).
- `SendQuotationModal` — email-send modal.
- `ConvertModal` — convert-to-contract modal.
- Helpers: `fileToBase64`, `formatFileSize`, constant `MAX_FILE_BYTES` (35 MB), `STATUS_TONE` map.

## Access / permissions
- No client-side role gating in this page; `user` prop is ignored. Permissions are enforced server-side per command. Page-level access is controlled centrally via `src/lib/access.ts` / route registry (workspace: sales), not here. Action visibility is purely status-driven (send hidden when converted/rejected; decide only sent|viewed; convert only accepted & not yet converted).

## Rebuild notes (Modern-SaaS layout intent)
- Keep the **master-detail** shape (it fits this funnel workflow well): airy hero with single primary action "Ofertă nouă", a KPI funnel strip (Trimise → Vizualizate → Acceptate → Valoare pipeline), then a two-pane layout — scrollable offers **list** on the left, sticky **detail** panel on the right.
- The left list is fine as cards/rows (number + status badge + title + client + total + line count). Consider adding a **status filter + search + sort** (currently absent) — would be a pure enhancement, must not drop any existing data.
- Detail panel keeps four stacked sections: action bar (status-driven buttons), totals card, line-items table, Documente (upload + per-file download/delete with uploader+date), and a Tracking timeline (sent/viewed/decided/rejection reason/valid-until). Render the line items as a proper table.
- Builder modal is large/dense — lay out as a clean form: identity (lead/client/email/title/validity), commercials (discount/TVA/currency), a real editable line-items table with running totals, notes, and an attachments dropzone. Preserve the lead/client auto-fill behavior and the live totals summary.
- All money must continue routing through `useMoney()`; preserve per-quotation `currency` (RON/EUR) on every total. Do not hardcode currency. Keep the 35 MB per-file cap and base64 upload path.
