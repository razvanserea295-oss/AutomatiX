# Automatix ERP — Enterprise UI Migration Plan

> Generat 2026-07-01 dintr-un audit multi-agent (5 diagnostice de cod + benchmark pe SAP Fiori / IBM Carbon / Salesforce Lightning / Ant Design Pro / Fluent 2). Căile de fișiere sunt orientative — se re-verifică la implementare.

## 1. North Star

Automatix trebuie să arate ca un **sistem de control industrial, nu ca un dashboard de consumator**: o pânză neutră, low-chroma, unde ≥90% din suprafață e gri/alb și un singur albastru disciplinat duce toată interacțiunea. Separarea vine din **linii de 1px și spațiu, nu din umbre sau glass**; colțurile sunt „inginerești" (3–4px), densitatea e compactă implicit, iar numerele apar instant. Motion funcțional și sub-200ms — fără spring, fără bounce, fără glow ambiental. Reperul: SAP Fiori Horizon / IBM Carbon — liniștit, dens, lizibil și de încredere pe o zi întreagă de lucru.

## 2. Decizia strategică

**Recomandare: (A) Convergem shell-ul `saas` existent (v2/redesign) spre enterprise — NU adoptăm Fiori/classic ca bază.**

- **`saas` e singura suprafață live, întreținută, completă** (70+ pagini, token system coerent) și **are deja primitivele de shell enterprise**: nav stânga persistent colapsabil, `PageChrome`, `MasterDetailLayout`, command-palette. Golurile enterprise (breadcrumbs desktop, object-page, limbaj vizual) sunt **aditive, nu structurale**.
- **Fiori e ~40% complet și blocat** — 6–9 săptămâni doar pentru paritate de pagini + ~600KB UI5 + fragmentare de cod. Adoptarea lui = schimbi o suprafață aproape gata pe una la două treimi.
- **Feel-ul „consumer" e o piele, nu un os.** Toate găsirile pică pe **tokens și CSS** (accent, radii, umbre, blur, spring, mesh-blobs) — ieftin de schimbat, reversibil. Obții 80% din look-ul enterprise editând fișiere de token pe care `saas` deja le consumă.
- **Mineritul din assets-urile enterprise existente:** `classic/classic-tokens.css` + configul de nav Fiori = material de referință pentru rampa neutră și nav pe 2 niveluri. Le folosim ca valori, nu le pornim shell-urile.

## 3. Quick Wins (Stage 0) — ~1 zi, la nivel de token, reversibile

Totul în spatele unui atribut root (`html[data-ui-enterprise]`) → orice item = revert de o linie. Fără a atinge call-site-urile.

1. **Omoară „wallpaper"-ul accent → pânză neutră.** `mesh-blob-*` → `display:none`; scoate overlay-urile radial-gradient din `.app-bg`, lasă `background-color` plat.
2. **Radii enterprise.** `--radius-sm/md → 3px`, `lg → 6px`, `xl → 8px`, `2xl → 12px`.
3. **Scoate glow/glass.** `.surface-glass-strong`/`.surface-frost`/inputs → `backdrop-filter:none` + fundal opac; drop `.hover-glow` + glow-ul din `.page-chrome::before`.
4. **Un singur accent disciplinat.** `--accent-500: #0A6ED1` (albastru Fiori) în loc de albastru-violet; desaturează status-urile (green `#2D7D5A`, red `#CC3333`).
5. **Numere instant.** `useCountUp` returnează ținta din primul render; `.animate-count-up` → `animation:none`.
6. **Densitate compactă implicită.** `--density-row-h → 36px`, `--density-table-header-h → 32px`, `--density-kpi-h → 80px`.

## 4. Etape

| # | Etapă | Goal | Efort | Risc |
|---|---|---|---|---|
| **0** | Quick wins (flag-gated) | look enterprise instant, reversibil | S | Low |
| **1** | Foundation tokens | rampă neutră 10 pași, umbre→linii 1px, type 14px, fără spring; promovează flag-ul la default | M | Med (cascadă CSS) |
| **2** | Motion & visual cleanup | `professional-profile.css`: fade ≤200ms, fără bounce/stagger/hover-lift | S | Low |
| **3** | Componente core | `DataGrid`/`DataGridCard` (dens, sortabil, sticky, tabular), dialog sizes semantice, buton tertiary, `badgeTones` unificat; Licenses ca referință | M | Low |
| **4** | Unificare formulare | `FormLayout`/`FormSection`/`FormField`, retrage fork-ul legacy `FormModal` (~19 pagini) | M | Med |
| **5** | Shell / IA / templates | breadcrumbs desktop + 3 floorplans (List / Object / Edit) peste primitivele existente | L | Med |
| **6** | Rollout pagină-cu-pagină | tabele bespoke → `DataGrid`; object-page pe detail views, în ordine de dependență | L | Med |
| **7** | QA / a11y / densitate | focus 2px, WCAG 2.2 AA, stări loading/empty/error/permission, toggle densitate în Setări | M | Low |

**Verificare per etapă:** build + restart server + hard-reload (nu doar HMR); parcurge cele 5 pagini gold-standard (Sessions, Dashboard, Clients, Projects, Licenses); contrast ≥4.5:1.

## 5. Riscuri & guardrails

- **App de producție** → totul gated pe `html[data-ui-enterprise]` sau flag de componentă; regresie = rollback de un atribut.
- **Blast radius CSS (Stage 1)** → verifică întâi cele 5 pagini gold-standard, apoi sweep larg; nu edita clase de call-site în același PR cu tokenii.
- **Build/SW** → build + restart + hard-reload (SW kill-switch neutralizează chunk-uri moarte, dar verifică real).
- **DB multi-instanță** → verifică pe **un singur** proces server (Preview MCP pornește al 2-lea → clobber sql.js).
- **Fără churn Fiori/classic** → shell-urile dormante rămân doar referință; nu debloca `uiModeStore`.

## 6. Rezumat secvențiere

0. Quick wins (mesh off, radii 3px, fără glass/glow, un albastru, numere instant, densitate compactă) — flag-gated.
1. Foundation tokens: rampă neutră, umbre→linii, 14px, fără spring → promovează la default.
2. Motion profile profesional (`professional-profile.css`).
3. Componente core: `DataGrid`, dialog sizes, buton tertiary, badge tones; Licenses referință.
4. Formulare unificate.
5. Shell/IA: breadcrumbs + 3 floorplans.
6. Rollout pagină-cu-pagină pe DataGrid + object-page.
7. QA/a11y/densitate.
