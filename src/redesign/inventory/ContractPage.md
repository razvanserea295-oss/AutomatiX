# ContractPage — function inventory
**Route:** contracts · **Workspace:** projects-contracts · **File:** pages/contract/ContractPage.tsx · **Lines:** 521
**Props/contract:** `ContractPage({ user }: { user: User | null })` — `user` is destructured as `_user` (currently unused; access gating is page-level, not in-component).

## Backend functions (apiCommand) — ALL must survive
- `get_contracts` — loads the full contract list for the left panel · triggered on mount via `fetchContracts()` and re-run after every create/save/revision.
- `get_contract` `{ contract_id }` — loads one contract's full detail (incl. sections) when a list row is clicked · triggered by clicking a contract in the left list.
- `list_contract_attachments` `{ contract_id }` — loads uploaded document attachments for the selected/created contract · triggered by `loadAttachments()` on row-select, after create, and after upload/delete.
- `create_contract` `{ project_id, title, client_id, delivered_product, sale_price, execution_term }` — creates a new contract · triggered by submitting the "Contract nou" create form.
- `add_contract_attachment` `{ contract_id, filename, mime, data }` — uploads one file (base64, no data-URL prefix) to a contract · triggered by `uploadFilesToContract()` (both create-form file input and detail "Încarcă fișier").
- `delete_contract_attachment` `{ id }` — removes an uploaded file from a contract · triggered by the per-attachment trash button (after confirm dialog).
- `update_contract` `{ id, title, site_location, delivered_product, sale_price, execution_term, pif_term, status, observations, sections:[{id,content}] }` — saves edits to the selected contract · triggered by "Salvează" in edit mode.
- `create_contract_revision` `{ contract_id, notes }` — creates a new revision of a contract with notes · triggered by "Revizuire" button → FormModal submit (`submitRevision`).

Note: dashboard refresh is fired (not an apiCommand) via `useDashboardStore.getState().invalidate()` after create/save/revision.

Attachment download helpers (lib, NOT apiCommand — but load-bearing): `downloadContractAttachments(contract_id)` (all files, header "Descarcă contract"), `downloadOneContractAttachment(attachment_id)` (single file, per-row download icon). From `@/lib/downloadPdf`.

## Data sources (stores / hooks)
- `useMoney()` (settingsStore) — `money(n, 'RON')` currency formatter for the "Valoare totală" KPI and sale_price display.
- `useProjectStore` — `projects` (create-form Proiect dropdown) + `fetchProjects()` on mount.
- `useClientStore` — `clients` (create-form Client dropdown) + `fetchClients()` on mount.
- `useDashboardStore` — `invalidate()` called after create/save/revision to refresh dashboard KPIs.
- `toast` (toastStore) — success/error notifications throughout.
- Local React state: `contracts`, `selected`, `loading`, `showCreate`, `editing`, `saving`, `revisingContractId`, `attachments`, `uploading`.
- ContractEnhancements uses `useLocalStorage` (browser localStorage, NOT backend) for its tools — see Sub-components.

## User actions & controls
- **Contract nou** (HeroHeader action) — opens the inline create form (`setShowCreate(true)`).
- **Left list row click** — selects a contract, exits edit mode, clears attachments, fetches full detail (`get_contract`) + attachments. Rows show contract_code, StatusBadge, title, client — project; left border tinted by status tone.
- **Editează** (detail header, view mode) — enters inline edit mode (`setEditing(true)`).
- **Salvează** (detail header, edit mode) — calls `update_contract`; shows spinner while saving.
- **Revizuire** (detail header) — opens revision FormModal.
- **Descarcă contract** (detail header) — downloads all attachments of the selected contract.
- **Inline field edits** (edit mode) — text inputs for: Produs livrat, Pret vanzare (numeric), Termen executie, Termen PIF, Locație; plus a Status `<select>` (active/amended/closed). Each mutates `selected` in place.
- **Încarcă fișier** (Contract încărcat section header) — hidden multi-file `<input type=file>`; uploads via `add_contract_attachment`, then reloads attachments.
- **Per-attachment download** (download icon) — `downloadOneContractAttachment(a.id)`.
- **Per-attachment delete** (trash icon) — confirm dialog → `delete_contract_attachment`.
- **Create form fields** — Titlu* (required), Proiect* (required select), Client* (required select), Produs livrat, Pret vanzare (number step .01), Termen executie, Contract files (multi-file input, max 35 MB/file). Submit "Creează contract" / Cancel "Anulează".

## Modals & dialogs
- **Revision FormModal** (`FormModal`, `isOpen={revisingContractId !== null}`) — title "Revizuire contract"; single field `notes` (textarea, optional, placeholder "Descrie modificarile (optional)"); submit "Creează revizuire" → `create_contract_revision` (empty note defaults to "Revizuire fără observatii").
- **ConfirmDialog** (`confirmDialog`) — "Șterge fișierul?" danger confirm before deleting an attachment.
- **Create form** — rendered inline in the right detail panel (not a true modal/overlay; shown when `showCreate`).

## Filters / search / sort / tabs / sub-views
- **— none —** No search box, no filter bar, no sort controls, no tabs, no pagination. The list shows all contracts unsorted (server order). Right panel is a view-switcher: empty-state / create-form / detail.

## Exports / print / file ops
- **Download all attachments** — "Descarcă contract" header button (`downloadContractAttachments`).
- **Download single attachment** — per-row download icon (`downloadOneContractAttachment`).
- **File upload** — multi-file upload on create form and in detail (base64 inline, 35 MB/file client cap via `MAX_FILE_BYTES`); helpers `fileToBase64()` and `formatFileSize()`.
- No print, no PDF generation, no clipboard on this page.

## Keyboard shortcuts / realtime / polling
- **— none —** No keyboard shortcuts, no polling, no realtime subscriptions. Data refreshes only on explicit mutation (manual `fetchContracts()` + dashboard `invalidate()`).

## Sub-components owned
- **KpiMini** (in ContractPage.tsx) — compact GlassCard metric tile used in the KPI row (icon, label, value, optional `format`).
- **ContractEnhancements.tsx** — `ContractEnhancements({ contractId?, contractNo?, expiresAt? })`. NOTE: imported file exists but is NOT rendered anywhere in ContractPage.tsx (orphaned in current page). Its tools are localStorage-only (no backend), card-based via `SectionCard`:
  - **TemplateLibraryCard** — contract templates (`promix_contract_templates_v1`): add/delete name+preset.
  - **AutoNumberingCard** — numbering pattern (`promix_contract_numbering_v1`): pattern `{YYYY}/{MM}/{NNNN}` + counter, live preview.
  - **ESignatureCard** — email input + "Trimite link" (toast only; needs email/SMS server).
  - **RenewalRemindersCard** — per-contract reminders (`promix_contract_reminders_{id}_v1`): daysBefore + channel (email/sms/chat), add/delete.
  - **RevisionCompareCard** — paste two revision texts → line-by-line diff (client-side, max 80 lines shown).
  - **AddendaCard** — addenda/acte adiționale (`promix_contract_addenda_v1`): label + date, filtered by contractId.
  - **PublicLinkCard** — generates a random-token watermarked public link (`/#/portal/contract/<token>`, client-side only, toast "valabil 7 zile").
- Shared UI used: `Page`, `HeroHeader`, `GlassCard`, `MetricValue`, `Button`, `StatusBadge` (+ `statusBorderClass`, `contractStatus` resolver), `EmptyState`, `FormModal`.

## Access / permissions
- Page-level gating only (via `src/lib/access.ts` for the `contracts` route); `user` prop is received but ignored in-component (`_user`). No in-page role checks, no viewer-only branches. All command-level auth is enforced server-side. Status options hardcoded: active/amended/closed ('draft' removed, migration 112 migrates legacy drafts to active).

## Rebuild notes (Modern-SaaS layout intent)
- Keep the **master-detail split**: left list panel (≈320px) + right detail panel, each scrolling independently. Do NOT wrap in `Page.Body` (max-width/padding fights the split — current code notes this).
- Top: airy **HeroHeader** (eyebrow "Proiecte & Contracte", icon ScrollText) + a 4-tile KPI row (Total / Active / Amendate / Valoare totală in RON). Primary action = "Contract nou" in the hero.
- Left list = status-tinted rows (code + StatusBadge + title + client/project). Consider adding the missing search/sort/status-filter here (currently absent) — high-value, low-risk additions.
- Right detail = three stacked sections: header (code/status/rev + Editează/Salvează, Revizuire, Descarcă), "Detalii contract" field grid (inline-editable: produs, pret, termen executie, termen PIF, locație, status), and "Contract încărcat" attachment list with upload/download/delete.
- Create = inline form in the right panel (could become a slide-over/sheet in the rebuild) with file upload.
- Revision stays a small modal (single textarea).
- Currency via `useMoney`; never hardcode RON formatting.
- DECIDE: ContractEnhancements is currently orphaned. The rebuild should either wire it into the detail panel (e.g. an "Avansate" tab/accordion) or intentionally drop it — but note its features are localStorage-only and not load-bearing on the backend.
