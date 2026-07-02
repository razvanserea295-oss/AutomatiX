# Raport QA vizual — UI SaaS Automatix

**Data:** 23 iunie 2026  
**Mediu testat:** `https://app.automatix.online` (sesiune autentificată)  
**Fallback:** `http://localhost:3500` — aplicația rulează, dar necesită login manual (nu a putut fi testată autentificat)  
**Viewport desktop:** 1920×1080  
**Viewport mobil:** 390×844 (emulat CDP)

> **Notă importantă:** aplicația folosește **hash routing** (`#/dashboard`, `#/sales-hub`). Navigarea la `/sales-hub` fără hash afișează greșit Dashboard-ul — rutele corecte sunt sub `#/…`.

---

## Shell — desktop (≥1280px)

| Criteriu | Rezultat | Observații |
|----------|----------|------------|
| Sidebar / rail vizibil (≠ 0px) | ✅ PASS | Lățime rail ~288px |
| Etichete workspace pe rail (Comunicare, Vânzări, etc.) | ✅ PASS | Vizibile în sidebar extins: Dashboard, Personal, Vânzări, Financiar, Comunicare… |
| Titlebar: search, user, fără titlu triplu | ✅ PASS | Search „Caută aplicații…”, notificări, cont; breadcrumb „Automatix / {workspace}”; un singur `<h1>` per pagină |
| Zona principală nu e goală | ✅ PASS* | *Exceptând rutele eșuate mai jos |

**Screenshot (desktop dashboard):** shell complet, KPI-uri, grafic venituri, carduri proiecte — layout întreg, fără overflow evident.

---

## Shell — mobil (~390px)

| Criteriu | Rezultat | Observații |
|----------|----------|------------|
| Hamburger deschide drawer cu workspace-uri | ✅ PASS | Drawer cu: Dashboard, Personal, Vânzări, Proiecte & Contracte, Proiectare, Producție, Aprovizionare, Financiar, Comunicare, Instrumente, Setări |
| Conținut pagină vizibil | ✅ PASS | Dashboard se afișează; search compact „Caută” |

**Screenshot:** `visual-qa-mobile-drawer.png` — drawer deschis din butonul „Arată bara laterală”.

---

## Rute — desktop

| Rută (hash) | Titlu așteptat | Rezultat | Conținut / screenshot |
|-------------|----------------|----------|------------------------|
| `#/` / `#/dashboard` | Dashboard | ✅ PASS | PageChrome + KPI (profit, venituri, proiecte, alerte), grafic, listă proiecte |
| `#/sales-hub` | Vânzări | ✅ PASS | Titlu „Vânzări”, pipeline kanban, KPI lead-uri, butoane Pipeline/În execuție |
| `#/reports` | Rapoarte | ✅ PASS | Titlu „Rapoarte”, conținut rapoarte (~745 caractere text) |
| `#/raports` (alias) | Rapoarte | ✅ PASS | Redirecționare corectă către Rapoarte |
| `#/finance` | Financiar | ✅ PASS | Subnav workspace: Prezentare / Facturi / Cheltuieli; tabel profitabilitate proiecte |
| `#/chat` | Mesaje (workspace Comunicare) | ❌ FAIL | ErrorBoundary: `Failed to fetch dynamically imported module: …/ComunicareWorkspace-VgHXGv.js` |
| `#/email` | Email | ❌ FAIL | Aceeași eroare chunk ComunicareWorkspace |
| `#/alerts` | Alerte | ❌ FAIL | Aceeași eroare chunk ComunicareWorkspace (după navigări repetate) |
| `#/service-tickets` | Tichete | ✅ PASS | Titlu „Tichete service”, listă tichete |
| `#/quotations` | Oferte | ✅ PASS | Titlu „Oferte”, conținut oferte |
| `#/pieces-ordering` | De comandat | ❌ FAIL | Pagină goală — ruta canonică este `#/parts-ordering` |
| `#/parts-ordering` | Comenzi piese | ✅ PASS | Titlu „Comenzi piese”, filtre proiect, listă comenzi |
| `#/manager-control` | Birou de control | ✅ PASS | Conținut extins (~4800 caractere) |
| `#/settings` | Setări | ✅ PASS | Formulare setări, tab-uri |
| `#/tutorial` | Tutorial | ✅ PASS | Workspace Instrumente, ghid interactiv |

---

## Probleme identificate

### Critice (producție)

1. **Workspace Comunicare — chunk JS lipsă**  
   - Rute: `#/chat`, `#/email`, `#/alerts`  
   - Eroare: `TypeError: Failed to fetch dynamically imported module: https://app.automatix.online/assets/ComunicareWorkspace-VgHXGv.js`  
   - **Cauză probabilă:** deploy incomplet sau cache CDN/browser cu `index.html` vechi care referă hash-uri de chunk depășite.  
   - **Remediere:** redeploy complet + invalidare cache; verificare că asset-ul există pe server.

2. **`#/pieces-ordering` — pagină goală**  
   - Ruta canonică în cod este `#/parts-ordering`.  
   - **Remediere aplicată în cod:** alias `pieces-ordering → parts-ordering` în `TAB_PATH_ALIASES` + rută explicită în `App.tsx`.

### Minore

3. **Titlu chat:** pagina afișează „Chat” în loc de „Mesaje” (eticheta din sidebar) — inconsistență de copy, nu blocant.  
4. **Hash vs path:** bookmark-uri / linkuri directe fără `#` nu funcționează — documentare sau redirect server-side recomandat.

---

## Fix-uri aplicate local (necomitate)

```ts
// src/App.tsx — TAB_PATH_ALIASES
'pieces-ordering': 'parts-ordering',

// + Route path="/pieces-ordering" → EngineeringWorkspace initialTab="parts-ordering"
```

---

## Rezumat

| Categorie | Pass | Fail |
|-----------|------|------|
| Shell desktop | 4/4 | 0 |
| Shell mobil | 2/2 | 0 |
| Rute | 11/15 | 4 |

**Recomandări:**
1. Redeploy producție pentru a repara chunk-ul `ComunicareWorkspace-*.js`.
2. După deploy, retest `#/chat`, `#/email`, `#/alerts`.
3. Păstrați aliasul `pieces-ordering` sau actualizați linkurile/documentația către `parts-ordering`.
4. Pentru QA local: autentificare manuală pe `:3500`, apoi navigare cu `#/…`.
