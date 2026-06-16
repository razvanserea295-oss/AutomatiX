# DocumentsPage — function inventory
**Route:** documents · **Workspace:** finance · **File:** pages/documents/DocumentsPage.tsx · **Lines:** 742
**Props/contract:** `DocumentsPage(_props: DocumentsPageProps)` where `DocumentsPageProps = { user: User | null }`. The `user` prop is accepted but currently unused (named `_props`). Sub-component `DocumentsEnhancements({ documents: DocLite[] })`.

## Backend functions (apiCommand) — ALL must survive
- `get_documents` — loads all documents (raw rows mapped: backend `name`/`uploaded_at` → page `title`/`created_at`) · triggered on mount via `fetchData()`
- `get_document_categories` — loads category list · triggered on mount via `fetchData()`
- `get_projects` — loads project list for the "Proiect" select (`.catch(() => [])` so failure is non-fatal) · triggered on mount via `fetchData()`
- `update_document_categories_order` — persists category drag-reorder order `{ ids }` to server; on failure falls back to `localStorage('promix_doc_cat_order')` + toast · triggered by category chip drag-and-drop drop (`handleCatDrop`)
- `create_document_category` — creates a new category `{ name, description: '' }` · triggered by "Adaugă" button in category manager (`handleAddCategory`)
- `update_document_category` — renames a category `{ id, name }` · triggered by "Salvează" in inline category edit (`handleUpdateCategory`)
- `update_document` — updates an existing document (id + full payload) · triggered by FormModal submit when `isEditing` (`handleSubmit`)
- `create_document` — creates a new document (full payload incl. `file_data` base64) · triggered by FormModal submit when not editing (`handleSubmit`)
- `delete_document` — deletes one document `{ document_id }` · triggered by row trash button (`handleDelete`) AND by bulk delete (`handleBulkDelete`, looped per id)
- `get_document_file` — fetches embedded base64 `{ data, mime, filename, size }` for in-app preview · triggered by row Download button (`handleDownload`)

Note: `DocumentsEnhancements.tsx` makes NO `apiCommand` calls — all its features are localStorage-backed or toast-only placeholders.

## Data sources (stores / hooks)
- React local state: `documents`, `categories`, `projects`, `selectedCategory`, `loading`, `error`, `searchQuery`, `selectedIds` (Set), category-manager state (`showCatManager`, `newCatName`, `editingCatId`, `editingCatName`).
- `useFormModal()` hook — drives add/edit modal (`isOpen`, `editingItem`, `openModal`, `closeModal`, `isEditing`).
- `useDashboardStore` (Zustand) — `.getState().invalidate()` called after create/update/delete to refresh dashboard KPIs.
- `toast` (toastStore) — success/error/info notifications.
- `confirmDialog` — async confirmation for deletes.
- `localStorage` `promix_doc_cat_order` — category display order persistence (read on load, write on reorder fallback).
- Derived: `docStats` (useMemo: total, catCount, topType by file_type), `filteredDocuments` (useMemo: category + search filter).
- Enhancements `useLocalStorage` keys: `promix_documents_versions_v1`, `promix_documents_share_v1`, `promix_documents_expiry_v1`, `promix_documents_watermark_v1`.

## User actions & controls
- **Adaugă document** (HeroHeader action button) — opens FormModal in create mode.
- **Search input** — filters documents by title/description/category (live).
- **Category filter chips** — "Toate" + one per category; click sets `selectedCategory`. Chips are `draggable` for reordering (persisted via `update_document_categories_order`).
- **Per-chip "+" button** — selects that category AND opens the add-document modal pre-targeted to it.
- **Pencil (toggle category manager)** — shows/hides the inline category management panel.
- **Category manager:** add category (input + Enter or "Adaugă" button); inline rename (Pencil → input + "Salvează"/"Anulează", Enter to save); drag handle visual.
- **Select-all checkbox** (table header) — selects/clears all filtered docs.
- **Per-row checkbox** — toggles single doc in `selectedIds`.
- **Row Download button** — opens document via `get_document_file` (blob → new tab, legacy `/api/files/` fallback).
- **Row Delete (trash) button** — confirm + `delete_document`.
- **Bulk action strip** (appears when `selectedIds.size > 0`, fixed bottom-center): "Șterge selectia" (bulk delete) + "Anulează" (clear selection).
- **EmptyState action** — "Încarcă document" / "Încarcă primul document" opens add modal.
- **Enhancements cards** — see Sub-components.

## Modals & dialogs
- **FormModal** (add/edit document) — title "Adaugă document" / "Editează document". Fields:
  - `name` (Titlu, text, required)
  - `description` (Descriere, textarea, optional)
  - `category_id` (Categorie, select, required; hint to create a category first if none)
  - `project_id` (Proiect, select, optional; "— Fără proiect —")
  - `file_upload` (Selectează fisier, file, required only on create; `fileFillsFields` auto-populates path/type/size/original_name/file_data/file_mime; ~6 MB limit hint)
  - `file_path` (Cale / nume fisier, text, read-only confirmation, optional)
  - `file_type` (Tip, text, read-only confirmation, optional)
- **confirmDialog** (delete single) — "Șterge documentul?" danger.
- **confirmDialog** (bulk delete) — "Șterge documentele?" with count body, danger.

## Filters / search / sort / tabs / sub-views
- **Search:** main page search box (title/description/category, case-insensitive) + a second independent full-text search inside Enhancements (name/category).
- **Category filter:** chip row ("Toate" + per-category), single-select.
- **Sort:** no column sorting. Categories have manual drag-reorder (persisted). Documents render in `get_documents` order.
- **Tabs:** none. **Pagination:** none (all rows rendered; `TableFiller` pads to ~18 rows).
- **Sub-views:** main table + "Tools avansate" enhancements section below it.

## Exports / print / file ops
- **Upload:** file input in FormModal, content base64-encoded into `file_data` (~6 MB cap) sent with create/update.
- **Download / open:** `get_document_file` → base64 → Blob → `URL.createObjectURL` → `window.open` new tab (revoked after 60s); legacy fallback to `/api/files/<path>` or direct http/absolute path.
- **ZIP bulk download (Enhancements):** select docs → "Descarcă ZIP" — currently `toast.info` placeholder only (no backend call).
- **No print/PDF export** on this page.
- `formatFileSize` / `guessMime` helpers for display/preview.

## Keyboard shortcuts / realtime / polling
- **Enter** in new-category input → add category; **Enter** in rename input → save category.
- No realtime/websocket; no polling. Data refreshes only via explicit `fetchData()` after mutations.
- After create/update/delete/bulk-delete: `useDashboardStore.getState().invalidate()`.

## Sub-components owned
- **KpiMini** (in DocumentsPage.tsx) — compact glass metric tile for the 4 KPIs (Total documente, Categorii, Cu proiect, Afișate).
- **DocumentsEnhancements** (DocumentsEnhancements.tsx, "Tools avansate" section), composed of:
  - **FullTextSearchCard** — local search over name/category.
  - **VersioningCard** — capture/list document versions (localStorage `..._versions_v1`; "Capturează" button).
  - **ShareLinkCard** — generate share link with expiry (doc select + days + "+"; localStorage `..._share_v1`; delete link).
  - **OcrPlaceholderCard** — static informational placeholder (no action).
  - **AutoCategorizeCard** — read-only category bucket counts (AI suggestion placeholder).
  - **ZipDownloadCard** — multi-select + "Descarcă ZIP" toast placeholder.
  - **ExpiryRemindersCard** — add/list expiry reminders (doc + date + days-before; localStorage `..._expiry_v1`; delete).
  - **WatermarkCard** — toggle watermark policy (enabled/includesUser/includesDate; localStorage `..._watermark_v1`).
- Shared UI used: `Page`, `HeroHeader`, `GlassCard`, `MetricValue`, `Button`, `FormModal`, `TableFiller`, `EmptyState`, `ListPageSkeleton`, `SectionCard`, filterControls classes.

## Access / permissions
- No client-side role gating in this component; `user` prop unused. Page access is governed centrally by `src/lib/access.ts` and per-command server auth (`withAuthenticatedUser`/`withAdminUser`). No viewer-only branches in the page itself.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the **hero header + 4 KPI tiles** (Total, Categorii, Cu proiect, Afișate). Primary action = "Adaugă document" (upload).
- Two-zone layout: a left/top **category rail** (filter + reorder + manage) and a main **documents table** (checkbox select, title w/ file icon, category, project, type, size, date, row actions Download/Delete). Table is correct here (tabular metadata) — keep it, add column sorting as a clean win.
- Surface **bulk selection** as a sticky action bar (already present) — preserve select-all + bulk delete.
- Fold the **category manager** into a side sheet/popover rather than an inline expanding panel for a cleaner look; preserve add/rename/drag-reorder + server persistence of order.
- The **Enhancements ("Tools avansate")** section is mostly localStorage/placeholder tooling — keep behind a collapsible/secondary tab so it doesn't clutter the primary library view, but DO retain every card (versions, share-link, OCR note, auto-categorize, ZIP, expiry reminders, watermark) so nothing is removed.
- Critical to preserve: file upload (base64, ~6 MB), in-app blob preview with legacy `/api/files/` fallback, the read shape mapping (`name`→`title`, `uploaded_at`→`created_at`), and all 10 apiCommands.
