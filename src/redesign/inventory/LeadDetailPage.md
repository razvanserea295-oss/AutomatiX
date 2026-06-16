# LeadDetailPage — function inventory
**Route:** sales-hub/:id · **Workspace:** sales · **File:** pages/sales/LeadDetailPage.tsx · **Lines:** 640
**Props/contract:** `LeadDetailPage({ user: User | null, leadId: number })` — `interface Props { user: User | null; leadId: number }`. `user` is destructured as `_user` (currently unused). `leadId` is the numeric id from the `/sales-hub/:id` route.

## Backend functions (apiCommand) — ALL must survive
- `get_sales_lead` — loads the full lead record (incl. `recent_notes[]`) by `{ id: leadId }` · triggered on mount + after every mutation via `fetch()`
- `list_lead_attachments` — loads all attachments (photos + files) by `{ lead_id: leadId }` · triggered on mount + after every mutation via `fetch()`
- `add_sales_lead_note` — appends a comment/note `{ request: { lead_id, content } }` · triggered by the comment input (Send button or Enter key) → `addNote()`
- `update_sales_lead` — used twice: (a) status-only change `{ request: { id, status } }` via the status `<select>` → `changeStatus()`; (b) full detail edit `{ request: { id, client_name, contact_person, contact_phone, contact_email, location, product_interest, estimated_value, next_followup_date } }` via the Edit modal → `submitEdit()`
- `add_lead_attachment` — uploads one attachment `{ request: { lead_id, kind: 'photo'|'file', filename, data: dataURL } }` · triggered per-file by the "Adaugă fișiere" file picker → `handleAttachmentFiles()` (loops over the FileList)
- `delete_lead_attachment` — removes an attachment `{ id }` · triggered by the per-attachment trash button (image hover overlay or file-row) → `removeAttachment()` (after confirm)
- `convert_sales_lead` — converts lead to a project `{ request: { lead_id, project_name } }` · triggered by "Trece în execuție" → Convert modal → `submitConvert()`; on success navigates to `/sales-hub`
- `delete_sales_lead` — deletes the whole discussion (cascades notes + files) `{ id }` · triggered by the "Șterge" button → `deleteLead()` (after confirm); on success navigates to `/sales-hub`

## Data sources (stores / hooks)
- Local component state via `useState`: `lead` (Lead | null), `attachments` (Attachment[]), `loading`, `noteText`, `previewImage`, `uploading`, `convertOpen`, `editOpen`; `fileInputRef` (useRef).
- `useMoney()` from `@/store/settingsStore` — currency formatter (`money(value, 'EUR', 0)`), used to render `estimated_value` (assumed EUR).
- `useLocation()` from `wouter` — navigation (back to `/sales-hub`, post-convert, post-delete).
- `toast` from `@/store/toastStore` — success/error notifications.
- `sessionStorage` key `promix_lead_edit` — read on mount; if it equals the leadId, auto-opens the Edit modal (the "edit direct din pipeline" deep-link handoff from SalesHubPage).
- Data load is via `fetch()` (a `useCallback` running both list/get apiCommands in `Promise.all`); no Zustand data store for the lead itself.

## User actions & controls
- **Back** — PageHeader `onBack` → navigate `/sales-hub`.
- **Status select** — `<select>` with 5 options (fara_contact, decizie_client, decizie_noastra, in_negocieri, convertit); onChange → `changeStatus()` (immediate `update_sales_lead`).
- **Editează** (Contact section action) — opens the Edit details FormModal.
- **Trece în execuție** (Button) — opens Convert modal; hidden when `status === 'convertit'`.
- **Șterge** (lead) — deletes the discussion after confirm.
- **Adaugă fișiere** (Attachments action) — triggers hidden multi-file `<input type=file>`; disabled while `uploading`.
- **Add comment** — text input + Send button; submits on click or Enter (Shift+Enter does NOT submit). Send disabled when input is empty/whitespace.
- **Image thumbnail click** — opens the lightbox preview (`setPreviewImage`).
- **Image delete** (hover trash overlay) — `removeAttachment()` after confirm.
- **File download** (download icon on non-image rows) — `downloadAttachment()` builds an `<a download>` from the base64 data URL and clicks it.
- **File delete** (trash icon on non-image rows) — `removeAttachment()` after confirm.
- **Email / phone links** — `mailto:` / `tel:` anchors in the Field rows.
- **Lightbox** — click backdrop or X to close; image click is stopPropagation.

## Modals & dialogs
- **Edit details modal** (`FormModal`, title "Editează detaliile lead-ului") — fields: `client_name` (text, required), `contact_person` (text), `contact_phone` (tel), `contact_email` (email), `location` (text), `product_interest` (text), `estimated_value` (number, min 0, "EUR"), `next_followup_date` (date). Submit "Salvează" → `submitEdit()` → `update_sales_lead`. Note: `product_interest` is editable here but is NOT one of the status-change fields.
- **Convert modal** (`FormModal`, title "Convertire lead → proiect") — single field `project_name` (text, required), prefilled `Statie {client_name}`. Submit "Convertește" → `submitConvert()` → `convert_sales_lead`, then navigate `/sales-hub`.
- **Confirm dialogs** (`confirmDialog`): delete lead ("Șterge discuția?" with body warning notes+files removed, danger); delete attachment ("Șterge poza?" / "Șterge fișierul?", danger — label depends on image vs file).
- **Image lightbox** — full-screen `fixed inset-0` overlay (not a FormModal); shows the selected image, closes on backdrop/X click.

## Filters / search / sort / tabs / sub-views
- — none — (single-record detail page; no list filtering, search, sort, tabs, or pagination). Attachments are split into two implicit groups in render: image thumbnail grid vs. non-image file list (by `kind === 'photo'` or `data` starting with `data:image/`).

## Exports / print / file ops
- **File upload** — multi-file picker; images are compressed via `compressImage()` (canvas, max edge 1024px, JPEG q=0.7) → data URL with kind `photo`; all other files read raw via `FileReader.readAsDataURL` → data URL with kind `file`. Per-file upload toasts (image/file/mixed pluralization).
- **File download** — `downloadAttachment()` triggers a browser download from the stored base64 data URL (filename = `att.filename` or `fisier-{id}`).
- **No PDF / print / clipboard** — the former "Ofertă PDF" button was intentionally removed (offer generation lives on the dedicated Vânzări → Oferte page).

## Keyboard shortcuts / realtime / polling
- **Enter** in the comment input submits the note (Shift+Enter does not).
- **No polling / no websockets / no realtime** — data refreshes only via explicit `fetch()` after each mutation.
- **sessionStorage handoff** — `promix_lead_edit` flag auto-opens the Edit modal on arrival from the pipeline.

## Sub-components owned
- `Section({ title, icon, actions, children })` — collapsible-less titled card section with header (icon + uppercase title + optional actions slot). Used for Contact, Status & acțiuni, Poze și atașamente, Note inițiale, Comentarii.
- `Field({ label, value, icon?, href? })` — label/value pair in the contact `<dl>`; renders an em-dash italic placeholder when empty, optional leading icon, optional anchor (mailto/tel).
- `compressImage(file, maxEdge=1024, quality=0.7)` — module-level image compressor helper.
- `pickFileIcon(att)` — module-level helper choosing a lucide icon by file extension (PDF/Word/Excel/PPT → FileText, else generic File).
- `fileToDataUrl(file)` — inner helper (FileReader → base64 data URL) for non-image files.

## Access / permissions
- No client-side role gating inside this page; `user` prop is accepted but unused (`_user`). Permission enforcement is server-side per command (`update_sales_lead`, `delete_sales_lead`, `convert_sales_lead`, attachment commands all go through the shared registry's auth middleware). Any user who can reach the route can attempt all actions; the backend rejects unauthorized mutations.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the **two-column master-detail**: left (2/3) = identity + actions + attachments; right (1/3) = comments stream. This is a master-detail page, so per MEMORY do NOT force `.mod-bento` here.
- **Header**: client name as title, product interest as subtitle, status badge top-right, back chevron. Primary action = "Trece în execuție" (convert); secondary = Edit; destructive = Delete (keep visually separated / `ml-auto`).
- **Sections** as airy cards: Contact (definition-list grid, inline edit affordance), Status & actions (status select + convert + delete), Attachments (image grid + file list with download/delete), Initial notes (only if present), Comments (inline composer + chronological list with author + timestamp).
- **Attachments**: preserve the image-thumbnail-grid vs file-list split, hover-reveal delete on images, download+delete on file rows, lightbox preview, empty-state dropzone. Keep multi-file upload with client-side image compression and per-type toast pluralization.
- **Comments**: keep the lightweight inline composer (Enter to send) over a heavyweight modal.
- Preserve the **sessionStorage `promix_lead_edit` auto-open-edit** handoff so the pipeline "edit" deep-link still works.
- Currency stays EUR via `useMoney`; do not hardcode hex (token-driven theming per CLAUDE.md). Reuse `PageHeader`, `Button`, `StatusBadge`, `FormModal`, `confirmDialog`.
