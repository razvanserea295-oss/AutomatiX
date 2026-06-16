# Automatix — UI/UX Redesign Plan
**Tema**: industrial modern · greyscale clasic + turcoaz · ready-to-deploy
**Constraint absolut**: zero modificări la logica de business, store-uri, IPC, API.
Doar layout + tokens + componente vizuale. Toate testele e2e existente trebuie
să treacă fără modificare.

---

## 0. Vision / North Star

> "Un panou de control industrial care arată ca produs SaaS premium din 2026:
> dens când trebuie, calm restul timpului, cu o singură culoare-semnătură
> (turcoaz) care apare doar acolo unde sistemul vorbește cu utilizatorul."

**3 cuvinte-cheie pentru orice decizie:**
1. **Calm** — interfață ne-zgomotoasă, alb/negru/gri (no chrome cu culoare)
2. **Dens** — informație multă, dar ierarhizată în 3-4 nivele clare
3. **Tactil** — fiecare interacțiune are feedback (lift, scale, glow)

**Referințe vizuale (în ordinea relevanței):**
- Linear (densitate + tipografie)
- Raycast (command palette, animații)
- Vercel Dashboard (greyscale + accent)
- Siemens TIA Portal (industrial UX patterns)
- Cron / Superhuman (motion, micro-interactions)
- Tremor / shadcn (component primitives)

**Anti-patterns explicit interzise:**
- Multiple culori brand (doar turcoaz)
- Iconuri colorate în lista de navigație (greyscale → accent doar la hover/active)
- Backgrounds cu gradient pe carduri
- Animații care durează > 320ms
- Iconuri > 18px în toolbar-uri
- Border-radius > 14px în context industrial

---

## 1. Design System — Re-foundation

### 1.1 Tokens (CSS variables)

**Greyscale ladder cu undertone cool ușor** (subtilă răceală — diferențiază de tema actuală):

| Token | Light | Dark |
|---|---|---|
| `--color-bg-rail` | `#BFBFC2` | `#040506` (aproape negru pur cu o șoaptă albastră) |
| `--color-bg-primary` (chrome) | `#D2D3D6` | `#0B0D10` |
| `--color-bg-page` | `#ECEDEF` | `#1A1D21` |
| `--color-bg-secondary` (carduri) | `#FFFFFF` | `#23272D` |
| `--color-bg-tertiary` (hover) | `#DCDDE0` | `#2D3239` |
| `--color-bg-elevated` (popover) | `#D2D3D6` | `#0B0D10` |
| `--color-text-primary` | `#0E1115` | `#ECEEF1` |
| `--color-text-secondary` | `#3A3F46` | `#A8AEB7` |
| `--color-text-muted` | `#6B7079` | `#6B7079` |
| `--color-border` | `#B4B6BB` | `#373C44` |
| `--color-border-subtle` | `#CDCFD3` | `#23272D` |
| `--color-accent` | `#0891B2` (cyan-600) | `#22D3EE` (cyan-400) |
| `--color-on-accent` | `#FFFFFF` | `#08171B` |

**Status (semantic, neschimbat):**
- success/warning/danger/info/progress/special — keep tokens

**Elevation ladder (5 trepte):**
- e0: none
- e1: 1px outline shadow (carduri)
- e2: hover/raised (interactive cards)
- e3: dropdown / popover
- e4: modal / dialog

**Motion (4 trepte):**
- instant (80ms) — toggle states
- fast (160ms) — hover/focus
- base (220ms) — modal/transition
- page (420ms) — route changes

**Easings (3):**
- default `cubic-bezier(0.22, 1, 0.36, 1)` — soft
- spring `cubic-bezier(0.34, 1.56, 0.64, 1)` — modal-in
- emphasized `cubic-bezier(0.2, 0, 0, 1)` — page transitions

**Type scale (clarificat pentru densitate industrială):**
| Token | Size / Line / Weight | Use |
|---|---|---|
| `text-pm-2xs` | 10/14 | eyebrow, table headers |
| `text-pm-xs` | 11/16 | dense table rows, captions |
| `text-pm-sm` | 12/16 | table body, secondary copy |
| `text-pm-base` | 13/18 | default body, button labels |
| `text-pm-md` | 14/20 | card titles |
| `text-pm-lg` | 16/22 | section headings |
| `text-pm-xl` | 18/24 | page titles (where used) |
| `text-pm-2xl` | 22/28 | dashboard hero numbers |
| `text-pm-3xl` (NEW) | 32/36 | empty-state hero |

**Radius scale:**
- `sm: 6px`, `md: 8px`, `lg: 10px`, `xl: 14px`, `2xl: 18px`
- Default Card = `lg` (10px)
- Default Button = `md` (8px)
- Pills/badges = `999px`

### 1.2 Tailwind config

- Extinde `boxShadow` cu `e1..e4` mapate la CSS vars
- Adaugă `tabular-nums` la `font-feature-settings` global pe `.font-mono`
- Adaugă breakpoint nou `xs: 480px` pentru tabletă verticală
- Definește `keyframes`: `slide-up`, `scale-in`, `fade-in`, `pulse-dot`, `progress-sweep`

---

## 2. Layout architecture — Shell rebuild

### 2.1 Schema generală

```
┌─────────────────────────────────────────────────────────────┐
│ TopBar (h-11)                                              │ ← chrome (locked dark)
│  [icon] Brand · breadcrumb        [search]    [user] [⚙]  │
├──┬──────────────────────────────────────────────────────────┤
│  │ ContentArea (bg-surface-page)                           │
│  │  ┌─────────────────────────────────────────────────┐    │
│  │  │ PageHeader (h-14)                              │    │
│  │  │  [icon] Title • subtitle    [actions...]       │    │
│  │  │  [tabs row, optional]                          │    │
│  │  └─────────────────────────────────────────────────┘    │
│ S│  ┌─────────────────────────────────────────────────┐    │
│ i│  │ PageBody (max-w-1600, scrollable)              │    │
│ d│  │  Page.Section eyebrow="..." title="..."        │    │
│ e│  │   [content]                                    │    │
│ b│  │  Page.Section ...                              │    │
│ a│  └─────────────────────────────────────────────────┘    │
│ r│                                                          │
├──┴──────────────────────────────────────────────────────────┤
│ StatusBar (h-7)                                            │
│  Page · User · Time · ServerStatus                          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 TopBar (rebuild complet)

**Dimensiuni**: `h-11` (44px), padding `px-4`.

**Stânga:**
- Brand cluster (icon 16px + "Automatix" — 14px medium)
- Separator vertical 1px (line-subtle)
- Breadcrumb dinamic: `Home / Proiecte / Mixer X-23` (clickable, max 3 nivele, "..." dacă mai multe)

**Centru:**
- Search global (Cmd+K) — pill `rounded-full`, w-[480px] max, placeholder gri, cu `⌘K` hint pe dreapta
- Click → deschide CommandPalette overlay (vezi §3.4)

**Dreapta:**
- Live connection dot (server health) — punct mic, label hover
- Notifications bell cu contor (deschide drawer)
- Help (?) — keyboard shortcuts overlay
- User avatar 28px (cu menu: profile, theme toggle, logout)
- Window controls (Min / Max / Close) — doar pe Electron

**Vizual:**
- bg `gradient-to-b from-bg-primary to-bg-rail`
- top edge: `1px gradient highlight white/15`
- bottom border: `border-line/50`
- shadow: `e1`

### 2.3 Sidebar (rebuild)

**Dimensiuni**: collapsed 56px, expanded 240px. Toggle în top-right cu animație soft.

**Header**: "Workspace" eyebrow + brand mic în versiunea expanded; ascuns în collapsed.

**Navigație:**
- Grupuri colapsabile cu hairline divider gradient (nu border solid)
- Nume grup uppercase 10px tracking-wide, cu chevron
- Item activ:
  - Bară stânga 3px accent cu glow `0 0 10px var(--accent)`
  - Background gradient `from-accent/15 via-accent/8 to-transparent`
  - Ring `1px accent/20` 
  - Iconă scale-105, accent
  - Text font-semibold tracking-tight
- Item hover (inactiv): bg surface-tertiary/60, iconă scale-105
- Badge: pill roșu cu glow dacă urgent

**Footer:**
- Avatar gradient + dot online
- Nume + rol (truncate)
- Logout (icon + text, hover roșu)

**Vizual:**
- bg `surface-secondary`
- right edge: gradient via line/60 (Linear-style)
- transition width `300ms ease-soft`

### 2.4 StatusBar (rebuild)

- h-7 (28px)
- bg `gradient-to-b from-bg-rail to-black`
- top edge highlight `1px white/8`
- Conținut: `[Page · User · Role  |  Time tabular-nums  ·  ●  Conectat]`
- Dot conectare cu glow + pulse când live
- Font mono peste tot

### 2.5 ConnectionBanner

- Slide-up enter
- Gradient sheen orizontal când reconnecting
- Buton "Reîncearcă" cu active:scale

---

## 3. Components — Inventory & Targets

### 3.1 Primitive existente (refresh, nu rebuild)

| Component | Status | Acțiune |
|---|---|---|
| Button | ✓ rafinat | Verifică shine pe `success`, adaugă `loading` prop |
| Input | ✓ rafinat | Adaugă `prefix/suffix` slots, error animation |
| Select | ✓ rafinat | Înlocuiește `<select>` nativ cu Radix-style headless (opțional) |
| Card | ✓ rafinat | Adaugă `density` prop (compact/comfortable) |
| Modal | ✓ rafinat | Două variante: `side` (existent) + `center` (nou pentru confirmări) |
| Tabs | ✓ rafinat | Adaugă variant `segmented` (pill compact) |
| StatusBadge | ✓ rafinat | Adaugă `pulse` prop |
| Badge | ✓ rafinat | OK |
| KpiCard | ✓ rafinat | Adaugă variant `large` cu chart sparkline |
| IconButton | ✓ rafinat | OK |
| Checkbox | ✓ rafinat | Adaugă `indeterminate` |
| PageHeader | ✓ rafinat | Adaugă breadcrumb prop |
| Page / Section | ✓ rafinat | OK |
| Tooltip | existent | Refresh: glass surface + fade-in |

### 3.2 Primitive de rescris

| Component | De ce | Direcție |
|---|---|---|
| **Table** | Folosit ad-hoc cu HTML brut peste tot | Wrapper unic: sticky thead, column resize, sort, virtualizare opțională, sticky col-1, sticky last action col, density toggle |
| **EmptyState** | Inconsistent | Iconă mare (illustrated), titlu, descriere, primary action |
| **FilterBar** | Există dar simplu | Filter chips + saved filters + clear-all + quick-search |
| **BulkActionBar** | Există | Sticky bottom, count + cancel + actions, slide-up |
| **Pagination** | Lipsește | Page X of Y + rows-per-page + Prev/Next |
| **FormField** | Lipsește | Wrapper standard: label + control + help + error + required-mark |

### 3.3 Primitive noi

| Component | Scop | Specificație |
|---|---|---|
| **CommandPalette** | Cmd+K căutare globală + acțiuni | Modal centrat, fuzzy search, sectiuni (Pages, Recent, Actions), keyboard nav, scrolling |
| **Breadcrumb** | Top of TopBar | Auto-generat din rută; max 3 segmente cu "..." pentru rest |
| **NotificationCenter** | Drawer din dreapta | Listă alerte, snooze, mark all read |
| **ResizableSplit** | Detail panes (Projects, Clients) | Drag-handle vertical/orizontal, snap la min/max, persist localStorage |
| **DateRangePicker** | Filtre rapoarte | Presets (Today/Yesterday/Last 7d/MTD/QTD/YTD/Custom) |
| **AvatarStack** | Listă utilizatori asignați | Suprapuse, max 3 vizibile + "+N" |
| **InlineEdit** | Edit-in-place pentru tabele | Click → input → Enter/Escape → autosave |
| **Skeleton** | Loading states | Block, text, table-row variants — există parțial, unify |
| **Spinner** | Loading inline | Sizes xs/sm/md/lg, accent default |
| **Tag** | Pills colorate (clienți, proiecte) | Click-to-filter, removable, color-coded |
| **Stat** (mini-KPI) | În cards mici | Label + value + trend, sub formă compactă |

---

## 4. Page templates — Standardizare

Definește 6 template-uri pe care toate paginile le mapează:

### T1. List + Detail (split-view)
**Folosit de**: Projects, Clients, Contracts, ServiceTickets, Email, Chat
- Stânga: search + listă + create button
- Dreapta: detalii + acțiuni
- Resizable handle între ele
- Empty state când nu e selectat nimic

### T2. Table-centric
**Folosit de**: Inventory, Finance/Invoices, Deplasari, Documents, Quotations
- PageHeader + filter bar + bulk action bar
- Tabel cu: search, multi-sort, bulk-select, sticky header, pagination
- Quick-add modal

### T3. Dashboard (KPI grid)
**Folosit de**: Dashboard, Finance/Overview, ManagerControl, Reports
- KPI strip (6 cards)
- Grid 12-col cu widgets (charts, lists, alerts)
- Customizable (existent în DashboardEnhancements)

### T4. Tabbed workspace
**Folosit de**: Finance, ProcurementWorkspace, Settings
- Tab bar sticky
- Conținut diferit per tab
- Adâncime: 1-2 nivele de tabs max

### T5. Form / Wizard
**Folosit de**: FisaProiectant, FirstRunWizard, Settings forms
- Stepper sus (1/2/3)
- Form fields grupate
- Buton "Înapoi/Continuă" sticky bottom

### T6. Visualization
**Folosit de**: Kanban, PartsTree, EngineeringTree
- Toolbar minimalistă
- Canvas full-width
- Detail-on-select panel (right slide-in)

---

## 5. Páginile — pas cu pas

Pentru fiecare pagină majoră, voi:
1. Identifica template-ul corespunzător
2. Restructura layout-ul fără să schimb logica
3. Aplica primitive noi (Table, EmptyState, FilterBar, etc.)
4. Verifica densitățile (compact + comfortable)
5. QA a11y pe pagină

**Prioritate (toate cele 47 pagini, în ordinea ROI):**

| # | Pagină | Template | Note |
|---|---|---|---|
| 1 | LoginPage | Centered card | Aurora redusă, focus pe formă, glassmorphism subtil |
| 2 | DashboardPage | T3 | Widgets refresh, hero KPI mai mare |
| 3 | ProjectsPage | T1 | Resizable split, parts-tree mini-map |
| 4 | KanbanPage | T6 | Card aging, swimlanes (deja adăugate), refresh visual |
| 5 | InventoryPage | T2 | Table 2.0 cu sticky cols |
| 6 | FinancePage | T4 | Tabs + dashboard în Overview |
| 7 | PartsTreePage | T6 | Right detail panel, mini-map sus |
| 8 | ClientsPage | T1 | Map view nou |
| 9 | ContractPage | T1 | Sign pad inline |
| 10 | AlertsPage | T2/T3 mix | Categorii ca tabs |
| 11 | UsersPage | T1 | |
| 12 | SettingsPage | T4 | Sidebar de setări (sub-nav stânga) |
| 13 | ManagerControlPage | T3 | |
| 14 | CalendarPage | Custom | Month/week + side-panel detail |
| 15 | SalesHubPage | T1 + Kanban | Pipeline view |
| ... | rest | per categorie | |

---

## 6. Sprint plan — execuție

**Fiecare fază are ~1-2h de muncă concentrată; le pot face secvențial sau le pot
sări dacă vrei să prioritizezi altceva.**

### Sprint 1 — Foundation (2-3h)
1. Refactor `index.css` cu noul ladder de greyscale (cool undertone)
2. Adaugă noul scale tipografic (`text-pm-3xl`)
3. Mapează `boxShadow` la CSS vars în `tailwind.config.js`
4. Adaugă keyframes lipsă
5. Verifică dark + light + reduced-motion + forced-colors

**Acceptance**: typecheck OK, render vizual cel puțin la fel de bun ca acum, plus accent turcoaz vizibil.

### Sprint 2 — Shell rebuild (3-4h)
1. TopBar nou: brand + breadcrumb + search pill + actions cluster
2. Sidebar refactor: hairline dividers, header workspace, footer profile
3. StatusBar minor refresh
4. ConnectionBanner motion
5. RouteProgress glow

**Acceptance**: navigarea între pagini fluidă, breadcrumb funcțional, search pill arată Cmd+K.

### Sprint 3 — Layout primitives (2-3h)
1. Page + PageHeader rafinate (deja făcut, mai adăugăm breadcrumb prop)
2. Card + Section
3. Tabs + variant `segmented` nou
4. EmptyState rebuild

**Acceptance**: toate paginile încărcate au scroll OK, headers consistente.

### Sprint 4 — Form primitives (2-3h)
1. FormField wrapper (label + control + error + help)
2. Input + Textarea + Select + Checkbox + Radio + Switch (nou)
3. FormModal — refactor pe FormField
4. SaveButton — animație feedback

**Acceptance**: formulare arată identice peste tot, cu error animation, focus ring turcoaz.

### Sprint 5 — Data primitives (3-4h)
1. **Table 2.0** — singurul wrapper folosit pentru toate tabelele:
   - sticky thead, column-resize handle, sort (multi), bulk-select, density, sticky-col, virtualization opțională
2. Pagination
3. FilterBar + saved filters (există în enhancements/QuickFilterChips, integrate în FilterBar)
4. BulkActionBar refresh

**Acceptance**: 5 pagini-test (Inventory, Invoices, Deplasari, Documents, Quotations) folosesc noua Table.

### Sprint 6 — Floating / feedback (3h)
1. **CommandPalette** (Cmd+K) — nou
2. Modal: variant `center` nou + side existent
3. Toast: redesign vizual (glass surface, swipeable)
4. Popover (există în enhancements, integrate în /ui)
5. Tooltip refresh
6. NotificationCenter drawer

**Acceptance**: Cmd+K funcțional cu fuzzy search peste pagini + acțiuni.

### Sprint 7 — Display primitives (1-2h)
1. Avatar + AvatarStack
2. Tag (pill colorat cu remove button)
3. Skeleton variants
4. Spinner

### Sprint 8 — Page-by-page polish (variabil, ~1-2h/pagină majoră)
1. Aplică template-ul corect
2. Înlocuiește HTML brut cu primitivele noi
3. Adaugă empty states peste tot
4. Adaugă breadcrumb-uri
5. Verifică densitățile

**Pages prioritizate** (vezi §5).

### Sprint 9 — QA & A11y sweep (2h)
1. Tab order pe fiecare pagină
2. Focus rings vizibile peste tot
3. Aria-labels pe iconuri non-text
4. Reduced-motion test
5. High-contrast test
6. Screen reader smoke (NVDA/VoiceOver)
7. Test responsive 1280/1440/1920/3440

### Sprint 10 — Performance pass (1h)
1. Bundle analysis — `npm run build && du -sh dist/`
2. Lazy-load remaining pages
3. Memoize heavy table renders
4. Image preload `<link rel="preload">` pentru fonts

---

## 7. Acceptance criteria (criterii ready-to-deploy)

- [ ] **Typecheck**: `npx tsc --noEmit` → 0 erori
- [ ] **Build**: `npm run build` produce dist < 5MB gzip
- [ ] **Smoke E2E**: `npm run test:e2e` toate verzi
- [ ] **Theme switch**: light ↔ dark trecere instantanee, fără flicker
- [ ] **Density switch**: compact ↔ comfortable trecere instant
- [ ] **A11y**: focus ring vizibil pe tot, ESC închide modale, Tab logic
- [ ] **Reduced motion**: animațiile sunt 0.01ms (efectiv off)
- [ ] **Forced-colors (Win HC)**: butoanele rămân vizibile
- [ ] **Performance**: Lighthouse Performance > 85 în Electron
- [ ] **Vizual**: 0 hex hardcoded în componente (toate prin tokens)
- [ ] **Vizual**: 0 borderuri "ad-hoc" (peste 3 stiluri diferite de border)
- [ ] **Vizual**: 0 padding-uri arbitrare (`p-[13px]`)
- [ ] **Vizual**: toate liniile (chrome) au top-edge highlight 1px
- [ ] **Vizual**: niciun element nu are box-shadow > e4
- [ ] **Vizual**: toate iconurile vin din Lucide (no mix)

---

## 8. Out of scope (NU în acest plan)

- Schimbarea logicii de business
- Modificarea API-urilor (IPC sau HTTP)
- Re-arhitectura store-urilor Zustand
- Migrarea la altă librărie UI (rămânem Tailwind + componente proprii)
- Re-engineering router (rămâne Wouter + hash)
- Schimbarea modelului de date

---

## 9. Riscuri & mitigare

| Risc | Probabilitate | Impact | Mitigare |
|---|---|---|---|
| HMR rupe state pe redeschideri repetate | M | M | Cleanup teste manual la final, restart dev server |
| Pagini cu logică complexă greu de mutat la template | H | M | Lăsăm logica neatinsă; doar wrapping vizual |
| Component nou (CommandPalette) introduce bug-uri | L | H | Build incremental, test smoke după fiecare adăugare |
| Schimbarea radius/spacing strică densitatea pe tablete | M | L | Test pe 3 viewport-uri |
| User feedback "îmi place mai mult cum era" | L | H | Toate schimbările sunt commit-uri separate, revert facil |

---

## 10. Cum continuăm

Spune **un** lucru:

- `START` — încep cu Sprint 1 imediat
- `SPRINT N` — sari direct la sprintul N (ex: `SPRINT 5` pentru Table 2.0)
- `PAGE <nume>` — focus pe o singură pagină (ex: `PAGE Dashboard`)
- `SHOW WIREFRAME <pagina>` — îți schițez ASCII layout-ul înainte să implementez
- `MODIFY PLAN` — discut amendamente la plan

Toată munca e reversibilă (commit-uri pe `master`, rollback la HEAD~N
oricând). Niciun sprint nu îți dă o aplicație "stricată" — fiecare se
oprește într-un punct stabil.
