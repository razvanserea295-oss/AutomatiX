# Audit de îmbunătățiri — Promix Automatix
**Data:** 2026-06-11 · v1.1.4 · Acoperire: funcții/feature-uri existente per modul ERP + denumiri fișiere + structură fișiere

> **Relația cu auditurile anterioare:**
> - [`IMPROVEMENTS-AUDIT.md`](../IMPROVEMENTS-AUDIT.md) (2026-06-01, 95 constatări pe 9 dimensiuni) — acest raport include un **tabel delta** (§A.0) cu ce s-a remediat între timp; constatările încă deschise sunt preluate, nu re-detaliate.
> - [`docs/ipc-audit-2026-06-10.md`](ipc-audit-2026-06-10.md) — cross-check-ul comenzilor IPC (287 apelate / toate înregistrate / 117 înregistrate dar fără apelant) — referit la dead code, nu repetat.
>
> **Metodă:** scanare paralelă pe 7 axe (4 grupuri de module + delta + denumiri + structură), cu verificare manuală a constatărilor structurale cheie (migrații, hook-uri moarte, duplicate, importuri). Constatările marcate ✔ au fost verificate direct; restul provin din citirea fișierelor indicate.

---

## Sumar executiv — Top 10 probleme prioritare

| # | Problemă | Locație | Sev. | Efort |
|---|---|---|---|---|
| 1 | **Operații multi-tabel fără tranzacții** — recepția de marfă scrie în 4 tabele (goods_receipts, goods_receipt_lines, purchase_order_lines, materials) fără BEGIN/COMMIT; un eșec la mijloc lasă stocul inconsistent | `electron/services/goodsReceiptService.ts:191` | 🔴 | L |
| 2 | **Recepție dublă pe aceeași linie de PO** — la status `partial` se poate incrementa `qty_received` + stoc de două ori, fără gardă | `electron/services/goodsReceiptService.ts:191-200` | 🔴 | L |
| 3 | **Race condition pe `time_start`** — două porniri simultane de cronometru pot lăsa 2 time-entries deschise pentru același user (SELECT+UPDATE fără tranzacție/lock) | `electron/services/timeTrackingService.ts:104-109` | 🔴 | M |
| 4 | **Sesiunile NU se rotesc la schimbarea parolei din profil** — `change_password` curăță lockout-ul dar lasă valide sesiunile existente (nota: fluxul *force-password-change* le rotește; cel obișnuit nu) | `electron/services/authService.ts:227` | 🔴 | S |
| 5 | **Criptarea DB rămâne sincronă** — debounce 500ms + atomicWrite există acum, dar `encryptDb()` tot blochează event-loop-ul la DB mare (PARTIAL fixat față de 1 iunie) | `server/db.ts:74`, `server/dbCrypto.ts` | 🔴 | L |
| 6 | **Validare zod doar pe 5 comenzi din ~404** — gate-ul `server/inputValidation.ts` e construit corect dar acoperă numai login/2FA/change_password/logout/delete_user; 282 handlere `args: any` rămân nevalidate ✔ | `server/inputValidation.ts:36`, `electron/ipc/*` | 🟠 | XL (incremental) |
| 7 | **Comparații financiare în virgulă mobilă** — plăți validate cu toleranță `+0.01` (acceptă supraplăți), toleranțele three-way-match comparate nerotunjit (2.0000001% nu declanșează flag) | `src/pages/FinancePage.tsx:389`, `electron/services/threeWayMatchService.ts:346` | 🟠 | S |
| 8 | **Totaluri multi-monedă însumate fără conversie** — portalul de client adună facturi EUR+RON ca un singur număr | `src/pages/portal/CustomerPortalPage.tsx:87-92` | 🟠 | M |
| 9 | **Migrații: numărul 110 duplicat** (`110_briefing_attachment_disk.sql` + `110_initial_setup.sql`) + găuri la 015 și 082 ✔ | `migrations/` | 🟠 | S |
| 10 | **Dead code confirmat**: `useCrudData`/`useRadialZoomPan`/`useUnsavedChanges` (0 importuri, dar exportate din `hooks/index.ts`), `src/services/` gol, 117 comenzi IPC fără apelant, artefacte Electron (`tsconfig.electron.json`, `electron-builder.json`, `scripts/dev-electron.mjs`) ✔ | vezi §C.4 | 🟡 | M |

**Evaluare onestă de ansamblu:** fundația e solidă și s-a îmbunătățit vizibil în ultimele 10 zile — build TS verde, CI pe PR-uri, rate limiting, TLS strict, CORS strict, SSE heartbeat, e2e rescrise pe browser, heuristici de securitate bune (argon2id, decoy hash, lockout, 2FA). Riscul rezidual real e concentrat în **consistența datelor sub concurență** (tranzacții, race conditions) și în **validarea inputului la graniță** (282 handlere `any`). Denumirile și structura sunt în mare parte sănătoase; problemele sunt punctuale și remediabile incremental.

---

# Secțiunea A — Funcții & feature-uri existente

## A.0 Delta față de auditul din 2026-06-01 (verificat pe cod azi)

| Constatare 1 iunie | Status azi | Dovadă |
|---|---|---|
| `tsc --noEmit` pică (4× TS6133) | ✅ FIXED | exit 0 |
| CI rupt (build:electron, doar tag-uri) | ✅ FIXED | `.github/workflows/ci.yml` pe PR/push; release.yml rescris |
| Body limit 10GB | ✅ FIXED | `server/index.ts:58` → 500mb |
| CORS permisiv | ✅ FIXED | `server/index.ts:119-143` strict + loopback |
| TLS off pe SMTP/IMAP | ✅ FIXED | `rejectUnauthorized: !tlsInsecure`, opt-out logat |
| SSE heartbeat lipsă | ✅ FIXED | `server/index.ts:210` — ping la 25s |
| Rate limiting | ✅ FIXED | authLimiter 20/5min, tokenLimiter 30/60s, global 600/min |
| `delete_project_piece` fără handler | ✅ FIXED | `electron/ipc/pieces.ts` |
| JSON.parse neprotejat pe `promix_user` | ✅ FIXED | `src/App.tsx:763-778` try/catch + clear |
| Playwright e2e moarte (`_electron`) | ✅ FIXED | rescrise pe `webServer` HTTP |
| Parolă AI `CHANGE_ME` | ✅ FIXED | parolă reală în config |
| PageHeader cu props ignorate | ✅ FIXED | 0 call-sites cu `title=` |
| Criptare DB sincronă | 🟡 PARTIAL | debounce 500ms + atomicWrite, dar encrypt tot pe main thread |
| Adopție Modal partajat | 🟡 PARTIAL | FormModal în 15+ pagini; mai rămân 6 fișiere cu `fixed inset-0 bg-black` hand-rolled |
| zod nefolosit / handlere `args: any` | 🟡 PARTIAL | gate zod pe 5 comenzi (`server/inputValidation.ts`); 282 `args: any` rămase ✔ |
| N+1 în `salesService.getAll()` (notes per lead) | ❌ OPEN | `electron/services/salesService.ts:206` |
| Atașamente BLOB base64 în DB | 🟡 PARTIAL | briefing-urile au disk-threshold (migrația 110 + `data/briefing-files/`); lead/contract/quotation attachments rămân în DB |
| Hook-uri/utils moarte | ❌ OPEN | `useCrudData`, `useRadialZoomPan`, `useUnsavedChanges` — 0 importuri ✔ |
| ESLint/Prettier absent | ❌ OPEN | niciun config în rădăcină |

## A.1 Vânzări (leads, oferte, clienți, contract, portal)

| Sev. | Locație | Problemă | Recomandare | Efort |
|---|---|---|---|---|
| 🔴 | `electron/services/quotationPdf.ts:60-65` | Bug cunoscut pdfmake „Roboto/bold font not defined" la `send_quotation` — fallback-ul de font nu se propagă în `defaultStyle`/`styles` din document definition | `ensureFonts()` să returneze numele fontului efectiv; folosește-l în `defaultStyle.font` și în toate `styles`; try/catch la call-site cu mesaj clar către utilizator | M |
| 🔴 | `src/pages/portal/CustomerPortalPage.tsx:87-92` | `totalInvoiced/totalPaid/totalRemaining` adună facturi EUR și RON ca un singur număr, afișat ca RON | Subtotaluri per monedă sau conversie la cursul curent înainte de sumare (atenție: portalul nu are context `useEurRate` — trimite cursul în payload-ul portalului) | M |
| 🟠 | `electron/services/quotationService.ts:158-165` | `calcTotals`: de verificat cu test că discountul global nu se aplică cumulativ peste discounturile de linie (ordinea operațiilor nu e acoperită de niciun test) | Test de integrare: linie cu discount 10% + global 5% → totalul așteptat; fixează ordinea documentat în cod | M |
| 🟠 | `electron/services/quotationService.ts:275-284` | `list()` fără LIMIT/paginare | `limit` opțional (default 500) + buton „Încarcă mai multe" în QuotationsPage | M |
| 🟠 | `electron/services/salesService.ts:206` | N+1: `getNotes(db, lead.id)` în buclă per lead (încă deschis din auditul trecut) | O singură interogare `WHERE lead_id IN (...)` grupată în memorie, sau lazy-load doar pe pagina de detaliu | M |
| 🟠 | `src/pages/sales/QuotationsPage.tsx:569` | Builder-ul de oferte acceptă preț unitar negativ fără validare; zero trece fără confirmare | Respinge `unit_price < 0`; confirmare explicită pentru 0 („linie gratuită?") | S |
| 🟡 | `src/pages/sales/QuotationsPage.tsx:228` | KPI „pipeline value" numără și ofertele expirate/respinse | Exclude `status IN ('rejected','expired','converted')` din pipeline | M |
| 🟡 | `src/pages/portal/RfqResponsePage.tsx:103` | Totalul răspunsului RFQ adună linii indiferent de monedă | Subtotal per monedă sau avertizare la schimbarea monedei în timpul completării | S |
| 🟡 | `src/pages/sales/SalesHubPage.tsx:85` | `sessionStorage.setItem` în catch gol — în private mode flag-ul de editare dispare silențios | `console.debug` în catch | S |

## A.2 Financiar

| Sev. | Locație | Problemă | Recomandare | Efort |
|---|---|---|---|---|
| 🔴 | `src/pages/FinancePage.tsx:389-392` | Validarea plății folosește toleranță float `amount > remaining + 0.01` — poate accepta supraplăți mici; la EUR cu conversie deriva crește | Compară în bani (cenți): `Math.round(a*100) > Math.round(r*100)` | S |
| 🔴 | `src/pages/FinancePage.tsx:175, 338` | Catch-uri goale pe `get_finance_insights`/`get_finance_compliance` și pe fetch-ul de facturi — date financiare care eșuează silențios, dashboardul arată parțial fără avertizare | Stare de eroare + toast; nu lăsa KPI-uri financiare să pară „zero" când de fapt fetch-ul a picat | S |
| 🟠 | `electron/services/financeService.ts:406-408` | Cost manoperă estimat = hardcodat 35% din materiale; override-ul manual există doar pe actual, nu pe estimat | Respectă `manual_labor_cost` și în estimat; expune procentul în Settings | M |
| 🟠 | `electron/services/financeService.ts:414-415` | `margin_percent` din actual_revenue → proiect fără venit facturat = 0% marjă (ascunde pierderi/forecast) | Adaugă `estimated_margin_percent` separat; `actual_revenue=0` → „N/A", nu 0% | M |
| 🟠 | `src/pages/FinancePage.tsx:531-535` | Cheltuielile EUR sunt convertite la RON la fetch; totalurile pe categorii pierd moneda originală | Totaluri per monedă `{RON: …, EUR: …}` sau conversie dinamică prin `useMoney()` la render | M |
| 🟡 | `src/store/settingsStore.ts:17` | Curs EUR fallback hardcodat 4.97, fără dată; dacă BNR pică la pornire, conversiile sunt silențios vechi | Stochează data fallback-ului; avertizează în UI dacă cursul cache-uit e mai vechi de 7 zile | S |
| 🟡 | `electron/services/exchangeRateService.ts:39` | Banda de sanity 3–10 RON/EUR e prea largă (o eroare de parsare BNR ar trece) | Strânge la 4.5–6.0 + log de alertă în afara benzii | S |

## A.3 Proiecte (proiecte, briefing-uri, kanban)

| Sev. | Locație | Problemă | Recomandare | Efort |
|---|---|---|---|---|
| 🟠 | `src/pages/ProjectsPage.tsx:189` | `JSON.parse` direct pe localStorage (stageRevisions) fără try/catch — există deja helper-ul sigur `getStorageJson()` în `src/config/localStorage.ts:55` dar pagina nu-l folosește | Folosește `getStorageJson()` (regresie față de propriul pattern) | S |
| 🟠 | `src/pages/KanbanPage.tsx:194-237` | Drag-drop fără debounce și fără folosirea optimistic-lock-ului `expected_version` (deja existent în UpdateProjectRequest) — două taburi pot suprascrie reciproc | Trimite `expected_version` la move; tratează conflictul 409 cu refetch | M |
| 🟡 | `src/pages/ProjectsPage.tsx:224-234` | Refetch `get_project_parts_tree` la fiecare selectare de proiect, inclusiv același | Cache pe `projectId` invalidat la mutații de piese | M |
| ✅ | `server/briefingUpload.ts` | Upload chunked cu `safeName()` (anti path-traversal), cap 500MB dublu-verificat, threshold 5MB inline-vs-disk — solid | Singura completare: whitelist MIME (acum acceptă orice tip) | M |

## A.4 Proiectare / Engineering (parts-tree, fișe, piese)

| Sev. | Locație | Problemă | Recomandare | Efort |
|---|---|---|---|---|
| 🟠 | `electron/services/partsTreeService.ts:200-204` | N+1 algoritmic în `buildNode()`: `pieces.filter(p => p.parent_piece_id === piece.id)` per nod → O(n²); la 1.000+ piese arborele radial devine lent | Pre-indexează `Map<parent_id, copii[]>` o singură dată, apoi lookup O(1) per nod | M |
| 🟠 | `electron/services/partsTreeService.ts:292-300` | `require()` neprotejat în `importScanned()` pentru SupplierCodesService/PiecesOrderingService — un eșec de load omoară tot importul fără mesaj util | try/catch + `CommandError.internalError` cu context | S |
| 🟠 | `src/pages/checklist/FisaProiectantPage.tsx:90-97` | `JSON.parse` pe `specs_json` fără try/catch (tracking_json e protejat, specs nu) — un rând corupt în DB crapă pagina | Același fallback ca la tracking | S |
| 🟡 | `src/pages/checklist/FisaProiectantPage.tsx:58-61` | Dirty-detection prin `JSON.stringify` pe tot obiectul la fiecare render — se degradează pe fișe mari | Hash/timestamp la save sau shallow-compare | S |
| 🟡 | `src/pages/PartsTreePage.tsx:162-173` | `pruneToAssemblies()` clonează recursiv tot arborele la fiecare render | Memoizare pe `showAssemblies` | S |
| ✅ | `src/components/DxfViewer.tsx:14` | SVG din DXF sanitizat cu DOMPurify înainte de render — protecție XSS corectă | — | — |

## A.5 Producție (tabletă, stații, time tracking)

| Sev. | Locație | Problemă | Recomandare | Efort |
|---|---|---|---|---|
| 🔴 | `electron/services/timeTrackingService.ts:104-109` | Race: `time_start` face SELECT (timer deschis?) apoi UPDATE+INSERT fără tranzacție — două apeluri simultane lasă 2 timere deschise pe același user | `BEGIN IMMEDIATE` … `COMMIT` în jurul secvenței; alternativ index unic parțial pe `(user_id) WHERE ended_at IS NULL` | M |
| 🟠 | `electron/services/pieceService.ts` (+ `electron/ipc/pieces.ts`) | `update_project_piece` acceptă orice tranziție de status (ex. planificat → testat direct); tableta doar filtrează la afișare | Hartă de tranziții valide server-side + `CommandError.badRequest` la tranziție invalidă | M |
| 🟠 | `src/pages/tablet/TabletProductionPage.tsx:68` | Interval de tick (1s) recreat la schimbarea timer-ului fără cleanup robust — pot rămâne intervale orfane | `useRef` pentru interval + cleanup în efect dependent doar de `activeTimer?.entry_id` | S |
| 🟠 | `src/pages/tablet/TabletProductionPage.tsx:74` | `time_start` cu `piece.id` fără gardă null — click în timpul unui refetch trimite `piece_id: undefined` | Guard `if (!piece?.id) return` | S |
| 🟠 | `src/pages/tablet/TabletProductionPage.tsx` | Tableta nu are refresh (nici buton, nici interval, nici `visibilitychange`) — datele rămân vechi între schimbările de proiect | Listener `visibilitychange` + refetch periodic 15s când tab-ul e vizibil | S |
| 🟡 | `src/pages/tablet/TabletProductionPage.tsx:51-62` | `.filter((pp: any) => …)` — tipurile `ProjectPiece` există dar nu se folosesc | Tipare corectă, scoate `any` | S |
| 🟡 | `src/pages/tablet/TabletProductionPage.tsx:136` | Header sticky (`top: 152/72`) se suprapune peste dropdown-ul de select | z-index pe select sau portal pentru dropdown | S |

## A.6 Aprovizionare / Procurement

| Sev. | Locație | Problemă | Recomandare | Efort |
|---|---|---|---|---|
| 🔴 | `electron/services/goodsReceiptService.ts:191-200` | (1) Recepția scrie în 4 tabele fără tranzacție; (2) la recepție `partial` nu există gardă anti-dublare — a doua recepție pe aceeași linie incrementă din nou stocul | Tranzacție pe toată operația + validare `qty_received + qty_nou ≤ qty_ordered` per linie (cu toleranță configurabilă pentru over-delivery) | L |
| 🟠 | `electron/services/threeWayMatchService.ts:346-366` | Toleranțele (qty/price diff %) comparate pe valori nerotunjite; `.toFixed()` doar la afișare — 2.0000001% vs toleranță 2% nu declanșează flag | Rotunjește la 2 zecimale imediat după calcul, înainte de comparație | S |
| 🟠 | `electron/services/threeWayMatchService.ts:196` | `listSupplierInvoices` (LIMIT 500) încarcă liniile per factură în map → sute de query-uri | Batch-load linii cu `WHERE invoice_id IN (...)` | M |
| 🟠 | `electron/services/procurementService.ts:127-130` | `canWrite()` = `manage_costs` SAU `manage_projects` pentru orice operație (creare furnizor, aprobare factură, recepție) — granularitate insuficientă pe operații cu risc de fraudă | Permisiuni distincte măcar pentru aprobare facturi furnizor vs. restul | M |
| 🟡 | `src/pages/procurement/ProcurementWorkspacePage.tsx` | Fără căutare/paginare pe liste de comenzi/recepții | FilterBar + paginare incrementală | M |

## A.7 Service & Mentenanță

| Sev. | Locație | Problemă | Recomandare | Efort |
|---|---|---|---|---|
| 🟠 | `electron/services/serviceTicketService.ts:121-125` | `computeSlaDue()` calculează SLA cu `setHours()` pe Date local — rezultat dependent de timezone-ul serverului | Aritmetică pe epoch: `new Date(start.getTime() + SLA_HOURS[sev]*3600000).toISOString()` | S |
| 🟠 | `src/pages/service/ServiceTicketsPage.tsx:78-86` | `Promise.all` cu catch global — dacă pică doar stats, și lista de tichete se golește; utilizatorul nu află care endpoint a eșuat | `Promise.allSettled` + mesaj per-sursă | S |
| 🟡 | `src/pages/service/ServiceTicketsPage.tsx` | Fără optimistic update pe accept/resolve — percepție de lentoare la latență >500ms | Update local imediat + rollback pe eroare | S |

## A.8 Personal (task-uri, deplasări, chat, email, calendar)

| Sev. | Locație | Problemă | Recomandare | Efort |
|---|---|---|---|---|
| 🟠 | `electron/services/deplasariService.ts:239-249` | Auto-finalizare deplasare (status → `finalizat` când ambele costuri completate) fără protecție la concurență — două taburi pot finaliza/recalcula simultan | Cel mai simplu: `UPDATE … SET costs_completed_at = ? WHERE id = ? AND costs_completed_at IS NULL`; alternativ optimistic locking (coloana `version` există deja în alte tabele — migrația 053) | M |
| 🟠 | `src/pages/chat/ChatPage.tsx:151-165` | Polling fix 3–5s fără backoff — sub latență mare, cererile se acumulează | Backoff exponențial cu plafon 30s; oprire completă pe `document.hidden` (parțial există) | M |
| 🟡 | `src/pages/deplasari/DeplasariPage.tsx:44-50` | `tripDays()` corect matematic, dar diurna nu are opțiune de calcul „doar zile lucrătoare" — de confirmat cu business dacă weekendul se plătește | Dacă e nevoie: `tripWorkdays()` + setare în Settings; altfel documentează explicit că se plătesc toate zilele | L |
| 🟡 | `src/store/handoffStore.ts:120-130` | `startPolling()` la 5s replicat în mai multe componente în paralel | Centralizează polling-ul (dashboardStore are deja patternul) | S |

## A.9 Sistem (utilizatori, sesiuni, setări, audit, alerte)

| Sev. | Locație | Problemă | Recomandare | Efort |
|---|---|---|---|---|
| 🔴 | `electron/services/authService.ts:227` | `change_password` (flux normal, din profil) NU șterge celelalte sesiuni ale userului — o sesiune furată supraviețuiește schimbării parolei. (Nota din CLAUDE.md — „change_password rotează sesiunile" — se referă la fluxul force-change; de unificat comportamentul.) | După update hash: `DELETE FROM sessions WHERE user_id = ? AND id != ?` (păstrează sesiunea curentă) | S |
| 🟠 | `electron/services/userService.ts:148-152` | Gating-ul anti-escaladare (post-migrația 097) e corect dar fragil — zero teste pe path-ul exploatabil (user obișnuit → `role_id: 1`) | Teste unitare pe `UserService.update()` cu cazuri de atac; assert defensiv la începutul metodei | S |
| 🟠 | `electron/db/auditLogs.ts` | `details` (JSON) se inserează fără limită de mărime — o intrare de mai mulți MB umflă DB-ul criptat | Trunchiere la ~5KB la insert | S |
| 🟡 | `src/pages/manager/UserActivityLog.tsx:122-125` | Limit fix 1000 fără paginare la offset | Paginare offset-based „următoarele 1000" | M |
| 🟡 | `electron/middleware/auth.ts` | La expirarea sesiunii (24h) clientul primește doar „token invalid" generic | Cod de eroare distinct `SESSION_EXPIRED` + redirect login cu mesaj clar | S |
| 🟡 | `src/pages/auth/UsersPage.tsx` | Lipsește acțiunea admin „forțează schimbarea parolei la următorul login" (flag-ul `must_change_password` există deja în schemă) | Buton + comandă `admin_force_password_change` | M |

## A.10 Instrumente (documente, rapoarte, export, AI)

| Sev. | Locație | Problemă | Recomandare | Efort |
|---|---|---|---|---|
| 🟠 | `src/pages/ai/AIAssistantPage.tsx:250-260` | Promptul AI se trimite fără limită de lungime client sau server | Cap client 5.000 caractere + cap server (413) | S |
| 🟡 | export PDF (`export_document_pdf`) | Fișiere temporare de export fără identificator de sesiune — exporturi simultane pot coliziona | UUID/sessionId în numele fișierului temp | S |
| 🟡 | `src/pages/alerts/` | Fără agregare/throttling pe alerte duplicate — o sursă defectă poate spama | Agregare „N alerte similare" + plafon pe minut | M |

## A.11 Dashboard

| Sev. | Locație | Problemă | Recomandare | Efort |
|---|---|---|---|---|
| 🟠 | `src/pages/DashboardPage.tsx:80-99` | `refreshDashboard()` apelează `list_personal_tasks` fără limită — agregarea crește liniar cu datele | Limit explicit (ex. 100, ultima lună) pe toate sursele dashboard-ului | M |

## A.12 Ce e OK (evaluare onestă, per dimensiune)

- **Autentificare:** argon2id parametrizat corect, decoy-hash anti-timing, lockout pe încercări, 2FA TOTP, politică de parolă ≥12 + complexitate, force-password-change hard-gate în App.tsx.
- **RBAC:** `withAuthenticatedUser`/`withAdminUser` aplicate consecvent; vizibilitatea leadurilor scoped per user; migrația 097 a închis over-grant-ul; client gating în `lib/access.ts`.
- **SQL:** interogări parametrizate peste tot — niciun vector de SQL injection găsit în sondaj.
- **Upload-uri:** chunked, anti path-traversal (`safeName`), limite duble client+server, threshold disk pentru briefing-uri.
- **Tranziții de stare vânzări:** lead → ofertă → contract → factură bine validate (nu se editează oferte acceptate etc.).
- **Status system:** `StatusBadge` + resolvers `statusTokens.ts` centralizate (excepție: tabletă — încă inline).
- **Server hardening (nou, din 1→11 iunie):** rate limiting pe 3 niveluri, CORS strict, Helmet CSP, bind loopback default, heartbeat SSE, body limit 500MB.
- **Teste:** 73 unit tests verzi + e2e funcționale pe browser — de la „suită moartă" la „suită care rulează" în 10 zile.

---

# Secțiunea B — Denumiri fișiere

## B.1 Constatări

| # | Neconcordanță | Fișiere afectate | Recomandare | Efort |
|---|---|---|---|---|
| B1 | **Migrația 110 duplicată** ✔ + găuri la 015 și 082 | `110_briefing_attachment_disk.sql`, `110_initial_setup.sql`; lipsesc 015, 082 | Redenumește `110_initial_setup.sql` → `112_initial_setup.sql` (111 e ocupat) **doar dacă runner-ul nu a aplicat-o încă pe instalări existente** — altfel documentează duplicatul și impune verificare de unicitate în runner (fail la boot pe NNN duplicat). Găurile sunt inofensive — documentează-le | S |
| B2 | **Pattern „*Enhancements.tsx"** — 18 fișiere în `src/pages/**` care NU sunt pagini, ci bundle-uri de sub-componente injectate în pagina principală; numele și locația sugerează greșit „pagină" | `LoginEnhancements.tsx` (în rădăcina pages!), `alerts/AlertsEnhancements.tsx`, `clients/ClientsEnhancements.tsx`, `contract/ContractEnhancements.tsx`, `calendar/`, `email/`, `kanban/`, `libraries/`, `manager/`, `procurement/` (×4), `projects/`, `documents/`, `engineering/`, `parts-tree/`, `auth/PasswordChangeEnhancements.tsx` | Două opțiuni: (a) acceptă convenția dar mut-o sub `src/components/enhancements/<domeniu>/`; (b) minim: mută `LoginEnhancements.tsx` din rădăcina `pages/` lângă `auth/`. Recomand (b) acum, (a) când se atinge oricum fiecare fișier | b: S · a: L |
| B3 | **Singular vs plural în `pages/`** — `service/` și `contract/` singular vs. restul plural (`clients/`, `documents/`, `tasks/`, `alerts/`…) | `src/pages/service/`, `src/pages/contract/` | Convenție unică: plural. Redenumire `service/` → `services/` e însă risc/beneficiu slab (5-8 importuri) — fă-o doar la o atingere naturală a zonei | S |
| B4 | **Fișiere non-Service în `electron/services/`** — numele folderului minte pentru 6 fișiere | `escalationCron.ts`, `aiToken.ts`, `logger.ts`, `quotationPdf.ts`, `pdfShared.ts`, `exportArchive.ts` | Creează `electron/lib/` (sau `electron/utils/`) și mută-le; ~15-20 importuri de actualizat | M |
| B5 | **Workspace-uri cu nume mixte RO/EN** | `InstrumenteWorkspace.tsx`, `SistemWorkspace.tsx` vs `SalesWorkspace.tsx`, `FinanceWorkspace.tsx`… | Acceptabil ca terminologie de domeniu (modulele se NUMESC „Instrumente"/„Sistem" în UI). Recomand: păstrează — redenumirea ar rupe maparea mentală modul↔fișier. Documentează decizia în CLAUDE.md | 0 |
| B6 | **`src/pages/` rădăcină vs subfoldere** — 15 pagini „mari" stau în rădăcină (`ProjectsPage`, `FinancePage`, `PartsTreePage`, `KanbanPage`…) deși există subfoldere tematice pentru aceleași domenii (`projects/`, `parts-tree/`, `kanban/`) | 15 fișiere root | La prima atingere a fiecărei pagini, mut-o în folderul tematic. Nu face un big-bang rename — riscă conflicte cu sesiunile paralele care lucrează pe layouts | M (incremental) |

## B.2 Convenții deja sănătoase (nu atinge)

- **Hooks:** 25 fișiere, toate `use*` camelCase — 100% consecvent.
- **Stores:** 23 fișiere `*Store.ts` — consecvent.
- **Componente:** PascalCase peste tot; acronime consistent `Kpi` (nu `KPI`) — `KpiCard.tsx` unic.
- **IPC:** `electron/ipc/*.ts` camelCase pe domeniu — consecvent.
- **Teste:** `.test.ts` pentru unit (Vitest) / `.spec.ts` pentru e2e (Playwright) — distincție standard, păstreaz-o.
- **`parts-tree/`** folder kebab + fișiere PascalCase — intenționat și coerent.
- **Terminologie RO de domeniu** (`Fisa*`, `Deplasari*`) — corectă într-un ERP românesc; nu tradu.
- **Migrații:** în afara duplicatului 110, toate 111 au descrieri clare `NNN_descriere.sql`.
- **Scripts:** kebab-case pentru `.mjs`, convenții Windows pentru `.cmd`/`.ps1` — acceptabil.

---

# Secțiunea C — Structura fișierelor

## C.1 `src/` — separare pe foldere

**Verdict general: bun, cu 5 anomalii.**

| Problemă | Detalii | Recomandare | Efort |
|---|---|---|---|
| `src/services/` **gol** ✔ | 0 fișiere; logica e corect în `electron/services/` | Șterge folderul | S |
| `src/test/` cu 1 fișier vs `tests/` (e2e) vs teste inline în `features/bom-wizard/` | 3 locuri pentru teste | Păstrează: unit inline lângă cod (`*.test.ts`) + `tests/e2e/`; mută/șterge conținutul `src/test/` (probabil setup vitest — dacă da, redenumește-l `src/test/setup.ts` și documentează în vitest config) | S |
| `src/mobile/` (9 fișiere, tab-nav mobil) vs `src/pages/tablet/` (1 fișier) | Două locuri pentru UI de dispozitiv | Mută `TabletProductionPage.tsx` în `mobile/` SAU redenumește `mobile/` → `device/` cu subfoldere; minim: comentariu în ambele care explică relația | S |
| `src/core/` (2 fișiere: logger, types) vs `src/config/` vs `src/constants/` | Trei foldere mici cu graniță neclară; `core/types.ts` se suprapune conceptual cu `src/types/` | Consolidare la o atingere naturală: `core/types.ts` → `types/`; `core/logger.ts` → `lib/`; apoi șterge `core/` | S |
| `src/features/` doar `bom-wizard` — pattern feature-folder abandonat; **bom-wizard nu e referențiat din UI** ✔ (dar are singurele 65 de teste unit + property) | 6 fișiere | Decizie de produs: ori montezi wizard-ul în UI (a fost construit cu teste — păcat de el), ori îl marchezi explicit dormant în README-ul folderului. NU-l șterge fără decizie — e singura zonă testată | decizie |

**Distincția `lib/` vs `utils/` vs `hooks/`:** funcțională dar subțire — `utils/` are doar 3 fișiere (dxfResolver, errors, excelImport). Consolidează `utils/` → `lib/` când se ating fișierele. Nu există `utils.ts`/`helpers.ts`/`common.ts` amestecate — **curat**. ✔

## C.2 `electron/` vs `server/` — separare backend

**Verdict: arhitectura „registry partajat" e intactă și corectă** (confirmat și de ipc-audit-2026-06-10: un singur registry, `server/commandRouter.ts` îl refolosește). `server/` conține aproape exclusiv HTTP/routing/infra (upload chunked, SSE, backup, criptare DB) — fără logică business semnificativă. Excepții/note:

| Problemă | Detalii | Recomandare | Efort |
|---|---|---|---|
| `server/releaseUpload.ts` — feature dormant post-Electron | E **înregistrat** în `server/index.ts:42` ✔ (nu e dead-unreferenced), dar servește publicarea de installere `.exe/.msi` prin AboutPanel pentru un updater care nu mai există | Decizie: dacă desktop-ul nu revine, scoate ruta + widget-ul ReleasePublisher din AboutPanel + plumbing `PROMIX_UPDATES_DIR`; dacă poate reveni, marchează dormant cu flag | M |
| `server/mobileWeb.ts` (479 linii) | HTML inline servit pentru mobil — funcțional, dar 479 linii de HTML într-un .ts e fragil | Nice-to-have: extrage template-ul în fișier static | M |
| `server/inputValidation.ts` | **VIU și bine proiectat** ✔ (gate zod pe 5 comenzi, importat în commandRouter) — auditul automat l-a marcat greșit ca mort | Extinde acoperirea (vezi Top 10 #6): următoarele candidate documentate chiar în header-ul fișierului — create_user/update_user/role + mutații financiare | XL (incremental) |
| Fără cross-dependencies vicioase ✔ | `src/` nu importă din `electron/`/`server/` (în afara lazy-require intenționat din `api/commands.ts`); paginile nu se importă între ele; zero cicluri detectate | — | — |

## C.3 God files (>500 linii — top, cu verdict)

| Fișier | Linii | Verdict |
|---|---|---|
| `src/pages/deplasari/DeplasariPage.tsx` | ~1542 | Master-detail complex — tolerabil, dar candidat la extragerea modalurilor |
| `electron/services/financeService.ts` | ~1424 | **De split**: invoice/budget/journal/raportare — 4 responsabilități distincte |
| `src/pages/settings/SettingsPage.tsx` | ~1413 | **De split**: 6+ secțiuni independente → `components/settings/` (folderul există deja!) |
| `src/pages/PartsTreePage.tsx` | ~1405 | Tolerabil (virtualizat, sub-componente extrase deja) |
| `src/pages/tasks/PersonalTasksPage.tsx` | ~1277 | De split: TaskModal + CalendarGrid extras |
| `src/pages/ProjectsPage.tsx` | ~1222 | Tolerabil (master-detail virtualizat) |
| `electron/services/projectService.ts` | ~1054 | Candidat split la următoarea extindere |
| `src/App.tsx` | ~973 | Root cu prea multe roluri (routing+auth gate+notifications+shell) — extrage NotificationLayer |

Regulă pragmatică propusă: nu sparge nimic „la rece"; la prima modificare funcțională într-un god file, extrage întâi componenta/serviciul atins.

## C.4 Dead code (verificat ✔ unde e marcat)

**Sigur de șters (după un grep final de confirmare):**
- `src/services/` — folder gol ✔
- `src/hooks/useCrudData.ts`, `useRadialZoomPan.ts`, `useUnsavedChanges.ts` + exporturile lor din `hooks/index.ts` — 0 importuri ✔ (decizie alternativă pentru useCrudData: adoptă-l în paginile cu fetch hand-rolled — dar alege o singură direcție)
- `memoizeAsync`/`throttle`/`deepEqual` din `src/lib/debounce.ts`/`memoization.ts` — 0 utilizări
- `tsconfig.electron.json`, `electron-builder.json`, `scripts/dev-electron.mjs` (+ scriptul `dev:electron` din package.json) — artefacte Electron
- `jsdom` din devDependencies (duplicat al happy-dom, conform auditului anterior)

**Necesită decizie de produs (nu șterge mecanic):**
- cele **117 comenzi înregistrate fără apelant FE** (lista completă în `docs/ipc-audit-2026-06-10.md` §4) — unele pot fi API-uri intenționate pentru integrare
- `server/releaseUpload.ts` + ReleasePublisher (vezi C.2)
- `src/features/bom-wizard/` (vezi C.1)
- folderele build: `dist-electron/`, `dist-installer/`, `dist-server/`, `build/`, `deploy/`, `docker/` — verifică ce mai folosește pipeline-ul Docker din release.yml înainte de curățare

## C.5 Duplicate

| Duplicat | Detalii ✔ | Recomandare | Efort |
|---|---|---|---|
| **EmptyState ×3** | `components/EmptyState.tsx` (folosit de 11 pagini ✔), `components/ui/EmptyState.tsx` (exportat din barrel `ui/index.ts` ✔), versiune inline în `mobile/kit.tsx` | Alege varianta `ui/` ca standard (e în design-system); migrează cele 11 importuri; păstrează varianta mobile doar dacă diferă vizual intenționat | M |
| Status pills inline pe tabletă | `TabletProductionPage.tsx` + `mobile/kit.tsx` au STATUS_TONE maps proprii în loc de `StatusBadge`/`statusTokens` | Migrare la resolvers — aliniat cu constatarea din auditul UI anterior | M |
| Formatare monedă/dată | **NU e duplicată** — centralizată corect în `src/lib/format.ts` ✔ | — | — |
| `cn`/classNames | Unic în `lib/cn.ts` ✔ | — | — |

## C.6 `migrations/` și `docs/`

- **Migrații:** 111 fișiere, descrieri bune; problema unică = duplicatul 110 (vezi B1) + recomandare: runner-ul să **eșueze la boot** dacă detectează două migrații cu același NNN (gardă de 5 linii care previne recidiva).
- **docs/:** 8 fișiere + `archive/`, `deployment/`. Probleme: (1) `IMPROVEMENTS-AUDIT.md` (118KB) stă în rădăcină — mută-l în `docs/audits/` împreună cu raportul de față și `ipc-audit-2026-06-10.md`; (2) `REDESIGN_PLAN.md`/`UI_ULTRA_PREMIUM_PROMPT.md` sunt artefacte de sesiune, nu documentație — mută în `docs/archive/`; (3) lipsește un `docs/README.md` index. `CLAUDE.md`, `CHANGELOG.md`, `DEPLOY.md` rămân în rădăcină (convenție standard).

## C.7 Ce e deja bine structurat (nu atinge)

1. **Registry unic de comenzi** + `commandRouter` — exemplar, documentat în CLAUDE.md.
2. **`src/store/`** — 23 store-uri Zustand cu pattern fetch/mutate/optimistic consecvent.
3. **Tokens CSS centralizate** în `index.css :root` — politica „no hardcoded hex" funcționează.
4. **Path alias `@/*`** consecvent — fără `../../../`.
5. **Separarea client-upload (`src/lib/briefingUpload.ts`) vs server-assembly (`server/briefingUpload.ts`)** — verticală pe feature, nu duplicare.
6. **`electron/ipc/` pe domenii** — 60 fișiere, mapare clară domeniu→fișier.

---

# Plan de acțiune recomandat

## Faza 1 — Corectitudine date & securitate (≈ 3-4 zile) — întâi astea
1. Tranzacții pe operațiile multi-tabel: goodsReceipt (Top#1+2), time_start (Top#3), deplasari auto-finalize (A.8) — **L+M+M**
2. Rotirea sesiunilor la `change_password` (Top#4) — **S**
3. Comparații financiare în cenți + rotunjire toleranțe 3-way-match (Top#7) — **S+S**
4. Catch-uri goale pe date financiare (A.2) + Promise.allSettled în Service (A.7) — **S**
5. Fix font PDF `send_quotation` (A.1 — bug cunoscut, vizibil la utilizator) — **M**

## Faza 2 — Validare & robustețe (≈ 3-5 zile, incremental)
6. Extinderea `COMMAND_SCHEMAS` (zod gate existent) la create/update_user, mutații finance, procurement, pieces — câte 5-10 comenzi pe iterație (Top#6)
7. Validare tranziții status piese server-side (A.5) — **M**
8. Limite: prompt AI, audit details, dashboard list limits (A.9/A.10/A.11) — **S×3**
9. Subtotaluri per monedă în portal + expenses (Top#8, A.2) — **M+M**

## Faza 3 — Igienă structură & denumiri (≈ 2-3 zile; coordonat cu sesiunile paralele de layout)
10. Gardă anti-duplicat NNN în migration runner + rezolvare 110 (B1) — **S**
11. Ștergere dead code sigur (C.4: services/ gol, hooks moarte, artefacte Electron, jsdom) — **S-M**
12. Unificare EmptyState + StatusBadge pe tabletă (C.5) — **M+M**
13. Mutare docs de audit în `docs/audits/` + index (C.6) — **S**
14. ESLint + Prettier config minimal (singura unealtă lipsă major) — **M**

## Faza 4 — Performanță & refactor oportunist (continuu)
15. N+1: salesService notes, threeWayMatch lines, partsTree buildNode (A.1/A.6/A.4) — **M×3**
16. Paginare: quotations, procurement, activity log (A.1/A.6/A.9) — **M×3**
17. Criptare DB pe worker thread (Top#5 — singura componentă L rămasă din auditul vechi) — **L**
18. Split-uri god files la prima atingere (C.3): SettingsPage, financeService — **M-L fiecare**
19. Decizii de produs: bom-wizard (montezi sau arhivezi), releaseUpload (ștergi sau flag), cele 117 comenzi fără apelant — **discuție, apoi S-M**

**Efort total estimat:** Faza 1+2 ≈ **6-9 zile** (riscul real); Faza 3 ≈ **2-3 zile**; Faza 4 ≈ **5-8 zile** spread. Total ≈ **3-4 săptămâni** de lucru incremental, fără big-bang.

**Dependențe/coordonare:** Faza 3 pct. 12 și orice mutare din `src/pages/` trebuie sincronizate cu sesiunile paralele care lucrează pe layouts/features (risc de conflict pe aceleași fișiere). Redenumirile B3/B6 — DOAR la atingeri naturale, nu ca operație separată.

---

# Anexă — liste complete

## Anexa 1 — Cele 18 fișiere `*Enhancements.tsx`
`src/pages/LoginEnhancements.tsx`, `alerts/AlertsEnhancements.tsx`, `auth/PasswordChangeEnhancements.tsx`, `calendar/CalendarEnhancements.tsx`, `clients/ClientsEnhancements.tsx`, `contract/ContractEnhancements.tsx`, `documents/DocumentsEnhancements.tsx`, `email/EmailEnhancements.tsx`, `engineering/EngineeringEnhancements.tsx`, `kanban/KanbanEnhancements.tsx`, `libraries/LibrariesEnhancements.tsx`, `manager/ManagerEnhancements.tsx`, `parts-tree/PartsTreeEnhancements.tsx`, `procurement/GoodsReceiptEnhancements.tsx`, `procurement/ProcurementEnhancements.tsx`, `procurement/RfqsEnhancements.tsx`, `procurement/ThreeWayMatchEnhancements.tsx`, `projects/ProjectsEnhancements.tsx`

## Anexa 2 — Cele 11 pagini care importă EmptyState din root (de migrat la `ui/`)
AlertsPage, ManagerControlPage, ContractPage, EmailPage, ClientsPage, DocumentsPage, SalesHubPage, ProcurementWorkspacePage, QuotationsPage, ServiceTicketsPage, WarehousePage

## Anexa 3 — Dead code candidat la ștergere (după grep final)
`src/services/` (gol), `src/hooks/useCrudData.ts`, `src/hooks/useRadialZoomPan.ts`, `src/hooks/useUnsavedChanges.ts` (+ exporturi din `hooks/index.ts`), `memoizeAsync`/`throttle` (`src/lib/debounce.ts`), `deepEqual` (`src/lib/memoization.ts`), `tsconfig.electron.json`, `electron-builder.json`, `scripts/dev-electron.mjs` + script `dev:electron` din package.json, `jsdom` (devDependency duplicat)

## Anexa 4 — Migrații cu anomalii de numerotare
- Duplicat: `110_briefing_attachment_disk.sql` + `110_initial_setup.sql`
- Găuri (inofensive, doar de documentat): 015, 082

## Anexa 5 — Fișiere non-Service din `electron/services/` (de mutat în `electron/lib/`)
`escalationCron.ts`, `aiToken.ts`, `logger.ts`, `quotationPdf.ts`, `pdfShared.ts`, `exportArchive.ts`

## Anexa 6 — God files >900 linii
Vezi tabelul C.3 — DeplasariPage (1542), financeService (1424), SettingsPage (1413), PartsTreePage (1405), PersonalTasksPage (1277), ProjectsPage (1222), projectService (1054), App.tsx (973), ChatPage (961), ProjectBriefingsPage (971)

## Anexa 7 — Comenzi IPC fără apelant FE
117 comenzi — lista completă în [`docs/ipc-audit-2026-06-10.md`](ipc-audit-2026-06-10.md) §4 (nu e duplicată aici)
