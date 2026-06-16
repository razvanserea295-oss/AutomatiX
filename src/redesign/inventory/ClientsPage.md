# ClientsPage — function inventory
**Route:** clients · **Workspace:** sales · **File:** pages/clients/ClientsPage.tsx · **Lines:** 526
**Props/contract:** `ClientsPage(_props: { user: User | null })` — `user` prop is accepted but unused; the page is self-sourcing via Zustand stores.

## Backend functions (apiCommand) — ALL must survive
No `apiCommand('...')` literals appear directly in either file. All backend access is indirect, through Zustand store actions and shared components. The underlying commands these resolve to MUST survive:
- **`useClientStore.fetchClients`** — loads the client list on mount · triggered by `useEffect` on mount.
- **`useClientStore.createClient`** — creates a client · triggered by ClientFormModal submit (add mode).
- **`useClientStore.updateClient`** — updates a client · triggered by ClientFormModal submit (edit mode).
- **`useClientStore.deleteClient`** — deletes a client · triggered by row trash IconButton and aside delete button (after confirmDialog).
- **`useProjectStore.fetchProjects`** — loads projects on mount (for KPIs + per-client project list) · triggered by `useEffect` on mount.
- **`<AnafLookupButton>`** — ANAF/CUI company lookup; performs its own backend command to fetch firm data by CUI (denumire, reg_com, adresa, oras, judet, telefon) · triggered by the lookup button next to the CUI field in ClientFormModal.
> Rebuild note: confirm the actual `apiCommand` names inside `src/store/clientStore.ts`, `src/store/projectStore.ts`, and `src/components/AnafLookupButton.tsx` and preserve every one. These stores/components are the load-bearing backend surface for this page.

## Data sources (stores / hooks)
- `useClientStore` — `clients`, `loading`, `fetchClients`, `createClient`, `updateClient`, `deleteClient`.
- `useProjectStore` — `projects`, `fetchProjects`.
- `useMoney` (settingsStore) — currency formatter `money(n, 'RON')`, app-wide RON/EUR switch.
- `useFormModal` — modal state (`isOpen`, `editingItem`, `openModal`, `closeModal`, `isEditing`).
- `useSort<Client, ClientSortKey>` — client-side table sorting.
- `useLocalStorage` (from `@/components/enhancements`) — persistence backend for all CRM enhancement cards (timeline, credit score, tags, anniversaries).
- Derived/memoized: `activeProjects` (exclude `finalizat`/`anulat`), `activeProjectCount`, `totalRevenue` (sum of active project budgets), `activeClientCount` (distinct clients w/ active project), `projectsByClient` (Map), `filteredClients` (search), `sortedClients`, `selectedClientData`.

## User actions & controls
- **Adăugă client** (hero header button + empty-state action) → opens ClientFormModal in add mode.
- **Search input** (FilterBar) → filters by name / contact_person / email / phone (case-insensitive).
- **Sortable column headers** → Nume, Persoană contact, Email, Telefon (toggle asc/desc via `useSort`).
- **Row click** → selects/deselects client (toggles aside detail panel; `bg-accent/5` highlight).
- **Row Edit IconButton** (Pencil, intent=primary) → opens ClientFormModal in edit mode (stopPropagation).
- **Row Delete IconButton** (Trash2, intent=danger) → confirmDialog then deleteClient; toast success/error (stopPropagation).
- **Aside "Editează" button** → opens ClientFormModal for selected client.
- **Aside delete button** (Trash2) → handleDelete for selected client.
- **Aside close button** (X) → clears selection.
- **ClientFormModal**: text inputs for all fields, ANAF lookup button, Anulează (cancel), Adaugă/Actualizează submit (validates non-empty name, disables while submitting), X close.
- **Enhancement cards** (ClientsEnhancements): see Sub-components — multiple add/record/delete buttons, multi-select, file picker, external map links.

## Modals & dialogs
- **ClientFormModal** (in-file, lines 401–525) — add/edit client. Fields: **CUI** (with ANAF lookup button), **Reg. Com**, **Nume firmă \*** (required), **Persoană contact**, **Email**, **Telefon**, **Oraș**, **Județ**, **Adresă**, **Bancă (bank_name)**, **IBAN**, **Note** (textarea). Validates name not empty; submit shows "Se salvează..." spinner state. Closes on submit/cancel/X.
- **confirmDialog** (shared) — delete confirmation; danger styling; warns when client has N associated projects (those projects will be left without a client).
- **Toasts** — success ("Client șters cu succes") / error on delete; info/error in enhancement cards.

## Filters / search / sort / tabs / sub-views
- **Search:** single FilterBar text input over name/contact/email/phone.
- **Sort:** 4 sortable columns (name, contact_person, email, phone) via SortableTh + useSort, default `{key:'name', dir:'asc'}`.
- **Sub-view:** master-detail — clients table (main) + selected-client detail aside (contact details + associated projects list with status & value).
- **No tabs, no pagination** (table uses fill rows up to 18 via TableFiller; scroll container min/max height).
- Result count label: "N clienți" + "găsiți pentru „search"".

## Exports / print / file ops
- **CSV/file import** (CsvImportCard enhancement) — `<input type=file accept=".csv,.tsv,.xls,.xlsx">`; reads text, counts rows, toasts "N rânduri detectate — confirmare admin necesară" (no actual import wired; stub).
- **External links:** GeoMapCard opens OpenStreetMap search per client address (`openstreetmap.org/search?query=...`, new tab).
- **Email blast** (EmailBlastCard) — multi-select recipients + subject + body; "Pregătește trimitere" toasts "necesită SMTP server activ" (no send wired; stub).
- No PDF / print / clipboard on this page.

## Keyboard shortcuts / realtime / polling
- — none — (no page-local keyboard handlers, polling, or realtime subscriptions; data loaded once on mount).

## Sub-components owned
- **KpiMini** (in-file) — compact glass KPI tile (icon, label, value, optional format/warn).
- **ClientFormModal** (in-file) — the add/edit client modal (see Modals).
- **ClientsEnhancements** (`ClientsEnhancements.tsx`) — "Tools CRM" section. Cards:
  - **TimelineCard** — interaction timeline (client + kind call/email/visit/order + note); persisted `promix_clients_timeline_v1` (localStorage). RENDERED.
  - **EmailBlastCard** — recipient multi-select + subject/body composer (`{{name}}` token); stub. RENDERED.
  - **AnniversariesCard** — anniversary/reminder records (client + date + label); upcoming ≤30 days; persisted `promix_clients_anniversaries_v1`. RENDERED.
  - **CsvImportCard** — CSV/Excel file import stub. RENDERED (note: header comment claims removed, but JSX still renders it).
  - **GeoMapCard** — clients-with-address list + OpenStreetMap links. RENDERED.
  - **CreditScoreCard** — manual 0–100 credit score per client (OK/Atenție/Risc); persisted `promix_clients_credit_v1`. RENDERED.
  - **TagsCard** — client tag chips (add/remove); persisted `promix_clients_tags_v1`. RENDERED.
  > NOTE: the `export default` JSX renders all 7 cards despite a leading comment claiming Csv/Geo/Credit/Tags were "removed". Treat all 7 as live and preserve them.

## Access / permissions
- No client-side role gating in either file. Page is in `sales` workspace; access governed centrally by `src/lib/access.ts` and server-side per-command auth (clientStore commands likely `withAuthenticatedUser`/`withAdminUser`). CSV-import card text hints "confirmare admin necesară". No viewer-only branch in the page itself.

## Rebuild notes (Modern-SaaS layout intent)
- **Layout:** keep the master-detail shape — airy hero header (eyebrow "Vânzări", Users icon, title "Clienți", subtitle, primary "Adaugă client" action) + 4-up KPI row (Total clienți, Clienți activi, Proiecte active, Valoare proiecte in RON) + bento: clients **table** (left, primary) and selected-client **detail aside** (right).
- **Primary action:** "Adaugă client" (hero, top-right). Empty state also offers it.
- **Table vs cards:** keep a sortable table for the client list (4 sortable cols + sticky right Acțiuni column with edit/delete). Detail aside shows contact block + associated projects list (name, status, value).
- **Modal:** single clean add/edit sheet with the ANAF/CUI auto-fill as the headline feature (CUI field + lookup button populates name, reg_com, address, city, county, phone). Group fields: Identitate (CUI, Reg.Com, Nume\*), Contact (persoană, email, telefon), Adresă (oraș, județ, adresă), Bancă (bank_name, IBAN), Note.
- **Enhancements:** the "Tools CRM" section (timeline, email blast, anniversaries, csv import, geo map, credit score, tags) is localStorage-backed and partly stubbed — keep it as a clearly secondary, collapsible section below the main table; do not let it compete with the core client list. Decide per-card whether to keep the stubs (email blast / CSV import need real SMTP/import backends to be functional).
- Preserve: currency formatting via `useMoney`, RON display, active-projects-only KPI semantics, delete confirmation that warns about orphaned projects.
