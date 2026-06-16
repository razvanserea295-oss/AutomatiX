# PartsTreePage — function inventory
**Route:** parts-tree · **Workspace:** engineering · **File:** pages/PartsTreePage.tsx · **Lines:** 1407
**Props/contract:** `PartsTreePage({ user: User, initialProjectId?: number | null })` — `interface PartsTreePageProps { user: User; initialProjectId?: number | null; }`. Only `initialProjectId` is destructured/used (seeds the selected-project state); `user` is accepted but currently unused (auth comes from `useAuthStore`).

## Backend functions (apiCommand) — ALL must survive
### In PartsTreePage.tsx
- `get_project_stages_custom` — loads `Stage[]` for the selected project; needed to populate the "Etapa" select in the "Adaugă piesa" form · triggered automatically by `useEffect` on `selectedProject` change.
- `get_project_parts_tree` — loads the full CAD parts tree (`PartTreeNode[]` or `{ tree }`); the page's primary data load · triggered by `loadTree()` on project select, after import/add/wipe, and on piece-store changes.
- `import_scanned_parts` — imports a built `PartTreeNode[]` tree into the project (merge behaviour: new files added alongside existing) · triggered by `doImport()` (called from Electron folder pick, browser folder pick after upload, manual path scan, and drag-drop).
- `scan_parts_folder` — server-side scan of a folder path, returns `PartTreeNode[]` of CAD files found · triggered by Electron native folder pick (`handlePickFolder`) and by the manual path-input "Scaneaza" button (`handleScanFolder`).
- `wipe_project_parts_tree` — deletes all imported/scanned pieces from the project tree (manual pieces & physical uploaded files preserved); returns `{ deleted }` · triggered by the "Șterge arbore" button (`handleWipeTree`) after a confirm() dialog.

### In SupplierCodesModal.tsx (sub-component owned by this page)
- `get_supplier_codes` — loads supplier-code legend (`include_inactive: isAdmin`) · triggered when the Coduri modal opens (`refresh`).
- `create_supplier_code` — admin: add a new supplier code (code/label/description/color) · triggered by inline editor "Adaugă" save.
- `update_supplier_code` — admin: edit an existing supplier code · triggered by inline editor "Salvează" save.
- `delete_supplier_code` — admin: deactivate a supplier code · triggered by the per-row Trash2 button after confirm().

### Non-apiCommand backend calls (load-bearing, must also survive)
- `aiChat([...], sessionId)` (from `@/api/ai`) — used by `requestAiInsight` (4-sentence tree analysis via `query_database`) and `requestAiSort` (returns JSON ordering + cleaned names).
- `aiHealth()` (from `@/api/ai`) — pre-check in `requestAiSort` to fail fast to the rule-based fallback when the AI service is down.
- `window.electron.invoke('dialog_open_directory', { title })` — native folder picker (Electron mode only) in `handlePickFolder`.
- REST `POST {serverUrl}/api/parts-tree/{projectId}/upload-chunk?token=…` — chunked binary upload (4MB chunks) of each CAD file in browser mode; headers `X-Upload-Session`, `X-Chunk-Index`, `X-Chunk-Total`, `X-Rel-Path-B64`, `X-File-Size`; returns `{ server_path }` (`uploadFileChunked`).
- REST `GET {serverUrl}/api/parts-tree/{projectId}/download.zip?token=…` — streaming ZIP download via temporary anchor (`handleDownloadZip`).

## Data sources (stores / hooks)
- `useProjectStore` — `projects` (project selector + name/client labels) and `fetchProjects()` (loaded on mount).
- `usePiecesForProject(selectedProject)` — `pieces` (ProjectPiece[]) for the selected project; drives KPIs, AI sort, enhancements, and node→piece matching on row click.
- `usePieceStore` — `fetchPieces` (reload pieces, `force` variant via `reloadPieces`), `updatePiece` (persist sort_order/name/original_name in `persistOrder`), `createPiece` (used by the "Adaugă piesa" FormModal).
- `useAuthStore` — `user` → `isAdmin = role_name === 'admin'` (gates supplier-code CRUD).
- `useFormModal()` — open/close state for the "Adaugă piesa" FormModal.
- `useMoney()` (settingsStore, inside enhancements) — currency formatting for the branch cost rollup.
- `useLocalStorage` (enhancements) — persists snapshots & DXF markup notes per project.
- Local React state: `selectedProject`, `treeData`, `collapsed (Set)`, `selectedId`, `searchQuery`/`debouncedSearch`, `importing`, `folderPath`, `showFolderInput`, `aiInsight`, `aiLoading`, `status`, `viewingPiece`/`viewingBreadcrumb`, `codesModalOpen`, `assemblyOnly`, `stages`, `uploadProgress`, `sorting`.
- Browser/session storage: `localStorage 'promix_tree_assembly_only'` (assembly-only toggle), `sessionStorage 'promix_focus_piece'` (auto-open a piece detail on arrival from e.g. a Kanban card), token from `STORAGE_KEYS.TOKEN` (upload/ZIP auth).

## User actions & controls
- **Project selector** (`<select>`) — choose which project's tree to view; "Selectează proiect..." default.
- **Search input** — "Caută piesa..." filters rows by node name / file_name (debounced 120ms), with inline `<mark>` highlight of the match.
- **Expand/Restrânge toggle button** — collapse-all vs expand-all (label flips based on `collapsed.size`).
- **"Doar ansambluri" / "Toate fișierele" toggle** — prune tree to only `.SLDASM` assemblies + their folder chain; persisted in localStorage.
- **"Coduri" button** — opens SupplierCodesModal (legend / admin CRUD).
- **"Adaugă piesa" button** — opens the FormModal (disabled when no stages loaded).
- **"Import" button** — Electron: native folder dialog → `scan_parts_folder`; Browser: triggers hidden `<input webkitdirectory>` → chunked upload → import.
- **"ZIP" button** — downloads the whole tree as a ZIP (disabled when empty/importing).
- **"Șterge arbore" button** — wipes the imported tree after a detailed confirm() (shown only when totalParts > 0; red styling).
- **"Sort AI" button** — AI-driven (or rule-based fallback) reorder + rename of pieces; persists sort_order/name (disabled while sorting or no pieces).
- **Insight AI icon button (Sparkles)** — requests a 4-sentence AI summary of the tree (disabled when no parts).
- **Tree row click** — selects the row (opens right-side detail panel); if the node matches a piece (by name or source_file_name) it opens the full `PieceDetailView` with a computed breadcrumb.
- **Row chevron (expand/collapse)** — per-node collapse toggle (stopPropagation so it doesn't select the row).
- **Detail panel "X" (close)** — clears selection, frees tree width.
- **Drag-and-drop onto tree area** — dropped files become a flat `PartTreeNode[]` and are imported via `doImport`.
- **Manual folder-path input** (`showFolderInput`) — "Scaneaza" (`handleScanFolder`) / "Anulează"; fallback when native dialog unavailable.
- **Enhancements drawer ("Tools avansate parts-tree")** — collapsible; see Sub-components for its internal controls (snapshot capture, BOM export, DXF markup add/delete, ZIP import stub).

## Modals & dialogs
- **FormModal "Adaugă piesa"** — fields: `name` (text, required), `category` (select from PIECE_CATEGORIES: mixer/siloz/transportor/buncar/structura/automatizare/altele, required), `stage_id` (select from loaded stages, required), `quantity` (number, required). onSubmit → `createPieceStore` then `loadTree()`; toasts on success/error.
- **SupplierCodesModal** (`codesModalOpen`) — supplier-code legend; admin-only inline editor with fields: `code` (2–10 letters, uppercased prefix), `color` (color picker, default #f97316), `label` (required), `description` (optional textarea). CRUD via create/update/delete_supplier_code. Non-admin = read-only list. Uses confirm() before deactivate.
- **`confirm()` dialogs (native)** — wipe-tree confirmation (lists exactly what is/isn't deleted) and supplier-code deactivate confirmation.
- **PieceDetailView (full-page takeover, not an overlay)** — replaces the page render when `viewingPiece` is set; has `onBack` (clears + reloads tree) and `onUpdate` (reloads tree). Opened by row click on a matching piece or by `promix_focus_piece` deep-link.

## Filters / search / sort / tabs / sub-views
- **Search** — debounced (120ms) substring filter on node name + file_name; highlighted in rows.
- **Assembly-only filter** — prunes to `.SLDASM` + folder chain (localStorage-persisted).
- **Collapse/expand state** — per-node collapse Set; auto-collapses depth ≥2 nodes when tree > 50 nodes on load.
- **Sort** — "Sort AI": AI ordering (production order: structura → mixer/siloz/buncar → automatizare) with name cleanup; rule-based fallback uses CATEGORY_PRIORITY + stage_id + assembly_key + natural name compare; persisted via sort_order.
- **No tabs / no pagination** — single virtualized tree view; enhancements live in a collapsible drawer below.
- **Sub-views:** (1) tree + detail-panel split, (2) full-page PieceDetailView takeover.
- **KPI row:** Total fișiere (totalParts), Ansambluri (assembliesTotal), Piese proiect (pieces.length), Vizibile (filteredRows.length).

## Exports / print / file ops
- **ZIP download** — `GET …/download.zip?token=` via anchor (whole-tree ZIP, for handing project to another proiectant).
- **Folder import (Electron)** — native dialog → `scan_parts_folder` → `import_scanned_parts`.
- **Folder import (browser)** — hidden `<input webkitdirectory multiple>`; junk filtered (thumbs.db/desktop.ini/.ds_store/ehthumbs.db); each file chunk-uploaded (4MB) with live progress (MB done, MB/s, ETA, current file N/M), tree rebuilt with server paths, then `import_scanned_parts`.
- **Manual path scan** — text input path → `scan_parts_folder`.
- **Drag-drop import** — dropped files → flat tree → `import_scanned_parts`.
- **BOM export (enhancements)** — `ExportMenu` over pieces with columns ID/name/category/quantity/estimated_hours/estimated_cost, filename "bom".
- **ZIP bulk import (enhancements)** — UI stub: validates `.zip`, toasts that backend will finalize (no real extraction yet).
- **Snapshots/markup (enhancements)** — stored in localStorage (not server).

## Keyboard shortcuts / realtime / polling
- Keyboard shortcuts: — none — (no key handlers in this page).
- Realtime/reactive: tree auto-refetches whenever the central piece store changes (effect keyed on `pieces.length` and a serialized `id:stage_id:status:sort_order:name` signature) — so Kanban drags / PieceDetailView saves reflect here.
- Deep-link: `sessionStorage 'promix_focus_piece'` auto-opens a piece's detail on project load.
- Polling: — none —.
- Search-highlight pulse animation exists in RadialTreeNode (SVG `<animate>`), but the radial node/edge components are not mounted by the current page render.

## Sub-components owned
- **KpiMini** (in-file) — compact glass metric tile used in the KPI row.
- **TreeRowItem / TreeRowItemBase** (in-file) — virtualized react-window row: connector lines, collapse chevron, role color dot, name + search highlight, supplier_code badge, child count, category/file_type/size columns.
- **SupplierCodesModal** (parts-tree/SupplierCodesModal.tsx) — supplier-code legend + admin CRUD (4 apiCommands).
- **PartsTreeEnhancements** (parts-tree/PartsTreeEnhancements.tsx) — collapsible "Tools avansate" drawer containing 7 cards: VersionDiffCard (localStorage snapshots + add/remove/changed diff), BranchCostCard (cost rollup per category, useMoney), HourEstimateCard (heuristic production hours), DuplicatesCard (fuzzy name dupes), DxfMarkupCard (per-piece notes in localStorage, add/delete), BomExportCard (ExportMenu), ZipImportCard (zip upload stub).
- **RadialTreeNode** (parts-tree/RadialTreeNode.tsx) — memoized SVG node (root/semi rounded-rect, others circle; selection ring, search pulse, collapse `+N`, label, tooltip). NOTE: not imported/rendered by the current PartsTreePage (radial view appears dormant/legacy) but lives in this page's folder.
- **RadialTreeEdge** (parts-tree/RadialTreeEdge.tsx) — memoized SVG edge path (highlight color/width). Same dormant status as RadialTreeNode.
- **PieceDetailView** (`@/components/PieceDetailView`) — full piece editor (shared component, opened from row click).
- **FormModal** (`@/components/FormModal`) — generic form modal used for "Adaugă piesa".
- Helpers (in-file): `uploadFileChunked`, `pruneToAssemblies`, `flattenTree`, `getRole`, `buildTreeFromFiles`, `ruleBasedOrder`, `cleanupName`, `persistOrder`; from `./parts-tree/types`: `catColor`, `formatSize`, `countTotal`.

## Access / permissions
- **Admin-gated:** supplier-code create/update/delete controls in SupplierCodesModal (`isAdmin = currentUser.role_name === 'admin'`); non-admins see a read-only legend. Server enforces per-command auth regardless (per CLAUDE.md `withAdminUser`).
- No explicit viewer-only / role gating on the tree itself, import, ZIP, wipe, or AI actions at the page level — they're available to any user who can reach the page (server-side command auth is the real gate). Page route gating handled centrally in `src/lib/access.ts`.

## Rebuild notes (Modern-SaaS layout intent)
- **Header:** keep the HeroHeader (eyebrow "Proiectare", FolderTree icon, title "Arbore piese", subtitle) + the 4-tile KPI row (Total fișiere / Ansambluri / Piese proiect / Vizibile). Airy padding, glass KPI tiles.
- **Toolbar (single sticky glass bar, allow wrap):** project selector (primary control, left) · search · expand/collapse toggle · assembly-only toggle · legend (color → role) · then action cluster on the right: primary = **Adaugă piesa**; secondary outline = Import, ZIP, Sort AI, Coduri; destructive = Șterge arbore (red); icon-only = Insight AI (Sparkles). Keep the live `visible/total` counter.
- **Primary action:** "Adaugă piesa". Import is the secondary hero action when the tree is empty (empty-state card already centers an "Import folder" CTA — preserve).
- **Main view = tree, NOT a table.** It's an inherently hierarchical CAD structure; keep the virtualized indented tree (react-window) with connector lines, role color dots, supplier-code badges, and right-side metadata (category / file_type / size). Do not flatten to a flat list/grid.
- **Detail:** keep the right-side closable detail panel (≈18rem) for quick node metadata; full edit still escalates to the PieceDetailView takeover on matching pieces. Consider making the detail panel a slide-over on narrow screens.
- **Progress/status:** preserve the chunked-upload progress banner (MB/s + ETA + current file) and the ok/err status + AI-insight banners.
- **Enhancements:** keep the collapsible "Tools avansate" drawer below the tree (diff, BOM export, cost rollup, hours, duplicates, DXF notes, ZIP import) — it's clean as a secondary, opt-in section; could become a right-hand tab/panel.
- **Must-not-lose:** all 5 page apiCommands + 4 supplier-code apiCommands, both REST endpoints (upload-chunk, download.zip), AI sort/insight + rule-based fallback, assembly-only prune, search highlight, drag-drop import, focus-piece deep-link, reactive tree refetch on piece-store change, and the wipe confirm() copy.
