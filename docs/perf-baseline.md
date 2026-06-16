# Perf baseline — Smoothness pass (2026-06-11)

Țintă: 60fps la scroll/hover/animații + navigare percepută sub 100ms pe device-uri mid-range (Tab S10 Ultra, Lenovo M10, laptop mid-range). Zero schimbări funcționale; experiența completă pe high-end e neatinsă (toate reducerile sunt gated pe `data-perf-tier`).

## Ce s-a schimbat (per optimizare)

| # | Optimizare | Fișiere | Impact estimat |
|---|---|---|---|
| 1 | **Memoizare componente repetate**: `React.memo` pe `KpiCard`, `StatusBadge`, `Sparkline` (toate cu props scalare → memo efectiv) | `components/ui/{KpiCard,StatusBadge,Sparkline}.tsx` | StatusBadge apare în sute de instanțe pe paginile-tabel; la fiecare tastă în search / tick de polling, re-render-ul lor devine gratuit. Estimat −30-60% timp de commit React pe paginile cu liste în timpul tastării. |
| 2 | **Virtualizare**: PartsTree era deja virtualizat (react-window v2). Tabelele `<table>` NU au fost convertite (ar fi rewrite, nu upgrade — vezi „Decizii"). În schimb: `content-visibility: auto` (`.cv-auto`) pe rândurile div-list din Alerts | `pages/alerts/AlertsPage.tsx`, utilitar în `styles/theme.css` | Browserul sare peste layout+paint pentru rândurile off-screen; la 500+ alerte, scroll-ul rămâne la cost ~constant. |
| 3 | **CSS containment**: `.perf-contain` (`contain: layout style`) pe KpiCard | `components/ui/KpiCard.tsx`, `theme.css` | Invalidările de layout nu mai traversează granița cardului. Fără `paint` — ar fi tăiat glow-urile de hover de la marginea cardului (vezi „Decizii"). |
| 4 | **GPU hints**: `will-change: transform` adăugat pe `.boot-loader-orb` și `.aurora-backdrop-orb` (orb-urile din `app-bg` și login îl aveau deja); pe tier low, orb 2 din login și orb 2 din app-bg opresc animația | `index.css`, `theme.css` | Orb-urile blur(90-120px) animate compun pe GPU în loc să repicteze; pe low se animă un singur orb. |
| 5 | **Lazy load agresiv**: `CommandPalette` (montat la primul Ctrl+K, apoi latch), `RevenueChartWidget` (singurul consumator recharts!), `DxfViewer` (ProjectsPage + PieceDetailView) | `shell/AppShell.tsx`, `pages/DashboardPage.tsx`, `pages/ProjectsPage.tsx`, `components/PieceDetailView.tsx` | Cea mai mare mutare: **vendor-charts (545 kB / 155 kB gzip) nu se mai încarcă cu Dashboard-ul** (pagina de aterizare) — intră în stream după primul paint, cu skeleton. vendor-cad (75 kB) doar când chiar se deschide un DXF. |
| 6 | **Reduce blur cost — perf tiers**: `data-perf-tier` pe `<html>` (nou: `lib/perfTier.ts` — heuristică deviceMemory/cores + probă fps 1s care doar retrogradează + override `localStorage promix_perf_tier`); CSS: high = blur 16-20px (neschimbat), medium = 8-10px fără particule, low = 4px, fără grid/particule/orb-3, VT instant | `lib/perfTier.ts`, `main.tsx`, `theme.css` | backdrop-filter e cel mai scump efect per-frame din app; la 4px vs 16px costul de compositing scade de ~4x pe tabletele mid-range. |
| 7 | **Throttle/debounce**: search în `FilterBar` debounce 200ms (input instant, filtrarea amânată; clear/reset flush imediat); scroll/resize measure în `NotificationsBell` + `Navbar` rAF-gated (1/frame); breakpoint resize în `layoutStore` debounce 100ms (refolosește `lib/debounce.ts` — până azi cod mort) | `ui/FilterBar.tsx`, `shell/{NotificationsBell,Navbar}.tsx`, `store/layoutStore.ts` | Tastarea în search nu mai filtrează N rânduri la fiecare keystroke; scroll-ul cu popover deschis nu mai face layout thrashing (getBoundingClientRect per eveniment). |
| 8 | **Image optimization**: `loading="lazy" decoding="async"` pe imaginile randate în liste (chat: avatare + atașamente; mentenanță: before/after; recepții: foto colete; lead: atașamente; semnături); dimensiuni explicite pe avatarul de chat | 6 fișiere | Atașamentele base64 din chat nu mai decodează sincron la mount; decodarea iese de pe main thread (`decoding=async`). |
| 9 | **Tranziție pagină**: View Transitions 360ms → **240ms** (toate cele 5 reguli + group); pe tier low → instant (0.01ms); reduced-motion era deja crossfade 200ms — neatins | `theme.css` | Navigarea percepută ~120ms mai rapidă; sub pragul la care swap-ul se citește ca „animație". |
| 10 | **Measure** | acest fișier | vezi tabelele de mai jos |

## Bundle before/after (vite build, gzip)

| Chunk | Before | After | Δ |
|---|---|---|---|
| `index` (bundle inițial JS) | 188.81 kB / **54.39** | 179.60 kB / **51.69** | −9.2 kB (CommandPalette extras) |
| `CommandPalette` | — (în index) | 10.71 / 4.04 | încărcat la primul Ctrl+K |
| `DashboardPage` | 34.87 / 10.47 **+ vendor-charts 545.25 / 154.96 la prima afișare** | 31.03 / 9.16, chart-ul în chunk separat 4.69 / 2.08 | **−155 kB gzip din calea critică a paginii de aterizare** |
| `vendor-charts` (recharts) | se încărca cu Dashboard | la idle, după primul paint al dashboard-ului | amânat |
| `vendor-cad` (dxf) + `DxfViewer` | se încărcau cu ProjectsPage / PieceDetailView | doar la expandarea unei piese cu fișier CAD | 19.77 + 12.70 gzip amânate |
| CSS | 109.0 / ~20.6 | 109.39 / 20.66 | +0.4 kB (secțiunea de tiers) |

**JS pe calea critică login→dashboard (gzip):** înainte ≈ 54.4 (index) + 12.5 (utils) + 15.7 (icons) + 10.5 (dashboard) + **155 (charts)** ≈ **248 kB**; după ≈ 51.7 + 12.5 + 15.7 + 9.2 ≈ **89 kB** + chart-ul în fundal. Bundle-ul inițial pur (index+utils+icons) = **~80 kB gzip**, sub ținta de 250 kB.

## Estimare before/after pe pagini (mid-range, CPU 4x throttle — metodologie mai jos)

| Pagină | Metrica | Before (estimat) | After (estimat) | De ce |
|---|---|---|---|---|
| Dashboard (aterizare) | JS de parcurs până la interactiv | ~248 kB gzip | ~89 kB | recharts scos din calea critică (#5) |
| Dashboard | fps la idle (orbs+glass) | 35-45 pe tier low-hw | 55-60 | blur 4px, 1 orb animat, fără particule (#6) |
| Clients / Inventory (tabele) | jank la tastare în search | filtrare la fiecare keystroke | 1 filtrare / 200ms; badge-urile memo | #1 + #7 |
| Alerts (500 rânduri) | cost scroll | layout+paint pe tot | doar viewport (cv-auto) | #2 |
| Projects | încărcare pagină | + vendor-cad 20 kB gzip | fără CAD până la expand | #5 |
| Navigare oriunde | durată tranziție | 360ms | 240ms (high/medium), instant (low) | #9 |

> Cifrele de bundle sunt măsurate (output vite). Cifrele de fps/TTI sunt estimări raționate — nu am un device mid-range în harness; pașii de re-măsurare pe device real sunt mai jos.

## Verificare efectuată

- `npx tsc --noEmit` → **exit 0** · `npx vite build` → **OK, 5.06s** · `npm test` → **73/73 passed**
- Live în `vite preview` (port 4188): `data-perf-tier="high"` setat la boot; blur computed per tier — high `blur(16px) saturate(1.85)`, medium `blur(8px)`, low `blur(4px)`; `--mesh-blur` 120px→64px pe low; `will-change: transform` pe orb; **zero erori în consolă**.

## Cum se re-măsoară pe device real

1. DevTools → Performance → CPU 4x slowdown, Network Fast 3G.
2. Forțează tier-ul: `localStorage.setItem('promix_perf_tier', 'low')` (sau `medium`/`high`) + reload; șterge cheia pentru auto-detect.
3. Paginile de referință: Dashboard, Clients (tastare în search), Alerts (scroll), Projects (expand piesă cu DXF).
4. Metrici: Lighthouse TTI/LCP/CLS pe `http://IP:3500`, plus FPS meter (Rendering tab) la scroll.

## Decizii (de ce NU s-a făcut ce scria în brief)

- **Tabelele nu au fost virtualizate cu react-window** (Inventory/Clients/Finance/AuditLog): sunt `<table>` semantice; react-window cere rânduri div cu înălțime fixă → conversia e un rewrite cu risc de regresie vizuală/funcțională, interzis de regula „UPGRADE NU REWRITE". Mitigat cu memo (#1) + cv-auto unde DOM-ul e div-based (#2). `content-visibility` NU funcționează pe `display: table-row` — de aceea AuditLogPanel (tr) nu l-a primit.
- **`contain` fără `paint` pe carduri**: paint containment taie glow-urile de hover de la margine și orice popover care iese din card → schimbare vizuală pe high-end (interzisă). `layout style` păstrează câștigul de izolare a layout-ului fără clipping.
- **`will-change` permanent doar pe elemente permanent animate** (orb-uri); nu am pus `will-change` pe `.hover-lift` (sute de carduri ar reține layere GPU degeaba — anti-pattern).
- **perfTier e idempotent**: dacă altă sesiune („Fix navigație") aterizează propriul setter pe `data-perf-tier`, `initPerfTier()` respectă atributul existent și nu-l suprascrie; override-ul utilizatorului din `localStorage` are prioritate absolută.
