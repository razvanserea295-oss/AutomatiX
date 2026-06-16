# Automatix - Idei Funcții/Metode per Pagină

Listă completă cu minim 5 idei de funcționalități noi pentru fiecare pagină din proiect.
Total: ~250 idei pe 40+ pagini.

---

## Pagini Standalone

### DashboardPage
1. **Layout customizabil** — drag-drop widgets, hide/show, salvare per utilizator
2. **Comparație temporală** — toggle "luna curentă vs luna trecută" pe fiecare KPI cu delta %
3. **Drill-down pe KPI** — click pe orice metric → filtru aplicat în pagina sursă
4. **Export snapshot zilnic** — PDF/email automat la 8:00 către management
5. **Threshold-uri configurabile** — alertă vizuală când KPI iese din interval (ex. profit < 10%)
6. **Quick actions per rol** — 4 butoane scurte personalizate (production manager vs sales vs CFO)
7. **Predicție AI** — "luna asta vei termina cu profit estimat X RON" bazat pe trend

### LoginPage
1. **2FA TOTP** — Google Authenticator pentru roluri admin/manager
2. **SSO Microsoft/Google** — pentru clienți enterprise
3. **Auto-discovery server LAN** — mDNS/zeroconf, fără URL manual
4. **Lockout după N failed attempts** + notificare admin
5. **Login biometric** — Windows Hello / Touch ID via Electron API
6. **Sesiuni active vizibile** — listă device-uri logate, kill remote
7. **Reset parolă prin email** — flow self-service

### FinancePage
1. **Facturi recurente** — template + auto-emitere lunară
2. **Cashflow forecast 30/60/90 zile** — pe baza receivables + payables + scadențe
3. **Memento auto plată** — email la clienți cu facturi >15 zile overdue
4. **Reconciliere bancară** — import OFX/CSV/MT940, auto-match
5. **Notă credit / Storno** — flow complet cu link la factura originală
6. **Multi-valută** — EUR/USD cu rate BNR auto + diferențe de curs
7. **Drill profit per piesă** — explică de ce un proiect a ieșit pe pierdere

### InventoryPage
1. **Barcode/QR scan** — mișcări rapide pe tabletă
2. **Loturi cu expirare** — pentru consumabile (vopsele, electrozi)
3. **Analiză ABC automată** — clasificare după rotație
4. **PO sugerat din low-stock** — un click → draft comandă către furnizorul preferat
5. **Cycle count** — flow audit parțial cu varianță vs sistem
6. **Foto + fișă tehnică** atașate la material
7. **Materiale alternative** — listă substituenți când stoc 0

### KanbanPage
1. **WIP limits per coloană** — blocare drag dacă coloana e plină (lean manufacturing)
2. **Swimlanes** — grupare orizontală pe user/client/prioritate
3. **Card aging** — gradient de culoare după zile petrecute în coloană
4. **Multi-select + bulk move** — Ctrl+click pe mai multe carduri
5. **Filtre salvate** — "doar ale mele", "doar urgent săptămâna asta"
6. **Capacity heatmap** — câte ore au alocate pe fiecare stație/zi
7. **Auto-archive** — completate >30 zile dispar din view dar rămân în DB

### ProjectsPage
1. **Gantt view** — cu dependențe între faze și critical path
2. **Template-uri proiecte** — clonare cu părți, etape, documente
3. **Milestones cu alerte** — auto-notification cu X zile înainte
4. **Health score** — calcul automat: budget burn + delay + open issues
5. **Risk register** — mini tabel cu probabilitate × impact
6. **Burndown chart** — ore rămase vs estimate
7. **Versiune contract atașată** — sincronizare automată

### ForcePasswordChangePage
1. **Strength meter live** — bar colorat în timp real (zxcvbn)
2. **Verificare istoric** — refuză ultimele 5 parole
3. **Generator parolă strong** — buton "Sugerează" cu copy
4. **Verificare HIBP** — hash check k-anonimitate vs Have I Been Pwned
5. **Help text contextual** — explică ce reguli a încălcat live
6. **Skip cu aprobare admin** — token temporar emis de manager

### ManagerControlPage
1. **Reguli auto-escalation** — "după X ore → email manager → SMS director"
2. **Bulk acknowledge** — selecție multiplă anomalii cu motiv comun
3. **Trend anomalii** — chart 30 zile pentru pattern detection
4. **Reasignare handoff** — drag pe alt utilizator
5. **Custom SLA per tip handoff** — design vs producție vs livrare
6. **Export raport incidente** — PDF lunar pentru ședința de management
7. **Anomalie manuală** — manager poate flagui ceva detectat offline

### PartsTreePage
1. **Diff între import-uri** — compară versiunea V2 vs V1 (added/removed/renamed)
2. **Export BOM** — Excel cu cantități, materiale, cost rollup
3. **Cost rollup pe ramură** — afișat live lângă fiecare nod
4. **Estimare ore producție** — pe baza istoric piese similare
5. **Detect duplicate parts** — similarity matching pe nume + dimensiuni DXF
6. **Markup pe DXF preview** — adnotări, săgeți, note tehnice
7. **Bulk import din ZIP** — extract + scan recursiv

---

## Pagini din Subdirectoare

### ai/AIAssistantPage
1. **Voice input** — speech-to-text pentru hands-free în atelier
2. **Bibliotecă quick prompts** — "ce comenzi am azi?", "cine întârzie?"
3. **Pin conversații** — istoric salvat permanent (>24h TTL)
4. **Citații inline** — link direct la proiect/document referit
5. **Cost/token tracker** — vizibilitate pe consum lunar
6. **Multi-document context** — drag-drop fișiere ca anexă pentru întrebare
7. **Export Markdown/PDF** — pentru raport către manager

### alerts/AlertsPage
1. **Subscribe per tip alertă** — fiecare user își alege ce primește
2. **Snooze X ore** — "amintește-mi mâine la 9"
3. **Email digest** — sumar zilnic cu unacknowledged
4. **Bulk acknowledge cu motiv** — pentru categoria "rezolvat extern"
5. **Search full-text** — căutare în titluri și descrieri
6. **Lanț de escalare** — dacă X nu confirmă în Y ore → trimite la Z
7. **Mute temporar** — pentru maintenance window planificat

### auth/UsersPage
1. **Bulk import CSV** — onboarding rapid echipă nouă
2. **Login activity log** — last login, IP, device per user
3. **Force logout** — kill session de la admin
4. **Acces temporar** — expires_at pentru intern/colaborator
5. **Grupuri/echipe** — moștenire permisiuni (DRY)
6. **Permission templates** — "Designer Senior" → aplici cu un click
7. **Toggle 2FA enforcement** — per rol sau global

### calendar/CalendarPage
1. **Drag-resize evenimente** — reprogramare directă vizuală
2. **Recurring events** — săptămânal/lunar (ședințe, mentenanțe)
3. **Sync Google/Outlook** — bidirecțional via CalDAV/Graph API
4. **Conflict detection** — același tehnician dublu-rezervat
5. **Day view orar** — sloturi 30min cu drag-drop
6. **Holiday overlay** — sărbători legale RO + concedii
7. **Export per resursă** — calendar dedicat per stație/echipă

### chat/ChatPage
1. **Reacții emoji** — quick acknowledge fără mesaj
2. **Threaded replies** — discuții paralele în același topic
3. **Pin mesaje importante** — top of conversation
4. **Mention autocomplete** — `@nume` cu dropdown
5. **Edit/delete cu istoric** — auditabil
6. **Forward la altă conversație** — partajare rapidă
7. **Voice/video call** — WebRTC peer-to-peer
8. **Search global** — în toate conversațiile

### checklist/FisaProiectantPage
1. **Print A4** — formular semnat pentru arhivă fizică
2. **Sign-off digital per fază** — semnătură + timestamp + user
3. **Foto evidență per asamblare** — calitate + traceability
4. **Template-uri reutilizabile** — per tip produs (mixer, siloz, transportor)
5. **Comments/note per fază** — observații tehnice
6. **Calcul progres ponderat** — fazele complexe contează mai mult
7. **Bottleneck detector** — care fază blochează cel mai des

### clients/ClientsPage
1. **Import CSV/Excel** — onboarding portfolio existent
2. **Hartă geocodată** — pin pe Leaflet/OSM
3. **Timeline interacțiuni** — calls, email, vizite, comenzi
4. **Credit score** — comportament plată (avg days late)
5. **Sistem tag-uri** — "key account", "prospect cald", "rău platnic"
6. **Email blast/merge** — newsletter către segmente
7. **Reminder aniversări** — birthday CEO, ziua firmei

### contract/ContractPage
1. **Bibliotecă template-uri** — per tip produs/serviciu
2. **Auto-numerotare configurabilă** — ANUL/CONTRACT/NR cu reset anual
3. **E-signature flow** — link extern către client (SMS/email)
4. **Reminder reînnoire** — cu 30/60/90 zile înainte de expirare
5. **Comparare revizii** — diff side-by-side cu highlight
6. **Anexe/acte adiționale** — atașate la contract părinte
7. **Public link cu watermark** — share controlat

### deplasari/DeplasariPage
1. **Diurne preset per țară/oraș** — auto-fill rate ANAF
2. **Upload bonuri/chitanțe** — foto + OCR sumă
3. **Workflow aprobare** — request → manager approval → executare
4. **Calculator km** — Google Maps/OSRM între adrese
5. **Vizualizare rută pe hartă** — multi-stop
6. **Export către finance** — tot decontul devine expense automat
7. **Block dates în calendar** — disponibilitate pentru alocări

### documents/DocumentsPage
1. **Full-text search în PDF** — extract text + index
2. **Versionare per document** — V1/V2/V3 cu rollback
3. **Share link cu expirare** — token + zile valabilitate
4. **OCR scanate** — bonuri, certificate calitate
5. **Auto-categorizare** — AI clasifică la upload
6. **Bulk download ZIP** — selecție multiplă
7. **Reminder review** — certificate ISO expiră în X zile
8. **Watermark la download** — username + dată embedded

### email/EmailPage
1. **Template library** — răspunsuri standard, oferte
2. **Schedule send** — trimite mâine la 8:00
3. **Mail merge** — către segmente clienți cu placeholders
4. **Auto-link la proiect** — parsare subject pentru tag
5. **Read receipts** — pixel tracking
6. **Reguli/filtre** — auto-foldere
7. **Manager semnături** — per departament

### engineering/EngineeringTreePage
1. **Where-used** — în ce proiecte e folosit un component
2. **Cost rollup live** — material + manoperă agregat pe sub-asamblare
3. **Diff între versiuni** — change log structural
4. **Replace cascade** — schimbă șurub M8 cu M10 peste tot
5. **Approval workflow** — desen necesită aprobare șef proiectare
6. **3D preview** — STEP/STL în Three.js
7. **Export STEP/IGES skeleton** — pentru furnizori CNC

### libraries/LibrariesPage
1. **Tagging multi-dimensional** — material, dimensiune, tip, normă
2. **Drag-from-library** — direct în parts tree proiect curent
3. **Statistici utilizare** — cele mai folosite componente
4. **Import din SolidWorks/AutoCAD** — bibliotecă nativă
5. **Ierarhie categorii** — folder tree
6. **Versionare componente** — bibliotecă vie
7. **Bulk export** — backup library

### maintenance/MaintenancePage
1. **Mentenanță predictivă** — bazată pe ore funcționare/cicluri
2. **Kit piese de schimb** — predefinit per stație
3. **QR code per stație** — scan → log work order
4. **Ruta zilnică tehnician** — optimizată geografic
5. **Cost rollup per echipament** — TCO peste timp
6. **Foto before/after** — evidență vizuală
7. **Contract mentenanță** — link la furnizor service

### procurement/ProcurementWorkspace
1. **Supplier scorecard** — on-time %, calitate %, preț competitiv
2. **Auto-RFQ din low-stock** — un click → ofertă cerută la 3 furnizori
3. **Comparare oferte side-by-side** — preț × lead time × termen plată
4. **AVL (Approved Vendor List)** — restricție comenzi doar la aprobați
5. **Tracking lead time real** — vs cel promis
6. **Istoric negocieri** — discount-uri obținute
7. **Plan procurement** — agregare nevoi proiecte → comenzi consolidate

### procurement/RfqsPage
1. **Trimitere multi-furnizor** — 5 supplier-uri cu un click
2. **Comparare răspunsuri** — matrice preț/livrare/termeni
3. **Award winner** — un click → generează PO
4. **Template-uri RFQ** — per categorie material
5. **Reminder deadline** — auto la furnizor cu 24h înainte
6. **Public response link** — furnizor răspunde fără cont

### procurement/GoodsReceiptPage
1. **Quality checklist** — pași inspecție la recepție
2. **Foto la recepție** — evidență stare colete
3. **Recepție parțială** — back-order automat pentru rest
4. **Print bon recepție** — etichetă lot
5. **Auto-update inventory** — stoc + locație
6. **Raport discrepanțe** — declanșează ticket reclamație

### procurement/ThreeWayMatchPage
1. **Auto-match rule-based** — toleranță configurabilă
2. **Toleranță ±%** — preț, cantitate, livrare
3. **Workflow aprobare excepții** — escalare la CFO peste prag
4. **Conversie valutară** — la cursul zilei livrării
5. **Audit log** — cine a aprobat când
6. **Export raport match** — Excel pentru audit

### reports/ReportsPage
1. **Schedule rapoarte** — email săptămânal/lunar
2. **Chart views** — bar/line/pie pe rezultate
3. **Pin pe Dashboard** — promovare raport favorit
4. **Pivot table builder** — drag rows/cols/values
5. **Cross-source joins** — proiecte + facturi + ore într-un singur raport
6. **Drill-down pe rând** — click → entitatea sursă
7. **Print-friendly** — paginare A4 cu antet/footer

### sales/SalesHubPage
1. **Lead scoring** — auto-rank pe baza valoare × interacțiuni
2. **Email integration** — track replies cu status update
3. **Activity feed** — timeline calls/emails/vizite
4. **Forecast ponderat** — pipeline × probabilitate stage
5. **Lost reason analysis** — de ce pierdem (preț/timp/competiție)
6. **Leaderboard sales rep** — vânzări lună/an
7. **Atribuire sursă** — Google Ads vs referral vs târg

### sales/QuotationsPage
1. **PDF cu branding** — antet + footer + ștampilă
2. **Quote → Order** — un click conversie cu link
3. **Reguli aprobare discount** — peste 10% → manager
4. **Calculator marjă inline** — vizibil la rep, ascuns clientului
5. **Versionare oferte** — V1/V2/V3 cu motivul revizuirii
6. **Public link** — client vede fără cont
7. **Auto-archive expirate** — peste validitate

### service/ServiceTicketsPage
1. **CSAT survey** — la închidere ticket
2. **Knowledge base linking** — articole sugerate la creare
3. **SLA pause** — "waiting client" nu cronometrat
4. **Foto/video atașat** — diagnostic vizual de la client
5. **Auto-create din email** — inbox support@ → ticket
6. **Time tracking per ticket** — manoperă reală
7. **Reguli escalation** — overdue → supervisor

### settings/SettingsPage
1. **Theme picker** — dark/light/auto + paletă custom
2. **Backup/restore config** — export tot settings.json
3. **Audit log viewer** — cine a schimbat ce când
4. **Feature flags per rol** — beta features pentru selectați
5. **Localization** — RO/EN/IT + timezone + currency
6. **Email server config** — SMTP test connection
7. **API keys management** — generare token-uri pentru integrări
8. **Data retention policy** — auto-delete logs >90d

### stations/StationsListPage
1. **Hartă layout hală** — drag-drop poziții vizuale
2. **Utilization rate** — ore productive / ore disponibile
3. **OEE calculation** — disponibilitate × performanță × calitate
4. **Indicator mentenanță due** — badge roșu pe iconă
5. **Alocare operator pe schimb** — calendar
6. **Live status broadcast** — display pe TV în atelier
7. **Capacity calendar** — booking ore pe stație

### stations/StationDetailPage
1. **Live status feed** — running/idle/down în timp real
2. **Run history** — ce piese, ce operatori
3. **Categorii downtime** — defect/setup/lipsă material/pauză
4. **Trend performanță** — chart OEE 30 zile
5. **Tickets linkate** — service history
6. **Override manual** — corecție status când senzor lipsește
7. **Predictive alerts** — "se va strica în ~5 zile bazat pe vibrații"

### tablet/TabletProductionPage
1. **Foto la finalizare fază** — evidență calitate
2. **Voice notes** — observații hands-free
3. **Offline mode** — sync când revine WiFi
4. **Barcode scan piesă in/out** — fără tastat
5. **Clock-in/out operator** — pontaj integrat
6. **Single-tap stage advance** — UI mare, mănuși-friendly
7. **Buton issue urgent** — escalare la supervisor

### tasks/PersonalTasksPage
1. **Subtasks** — checklist într-un task
2. **Recurring tasks** — zilnic/săptămânal
3. **Template-uri** — "raport săptămânal" cu pași
4. **Drag-reorder priority** — manual pe lângă auto
5. **Calendar overlay** — task-urile cu deadline pe lună
6. **Productivity stats** — tasks/zi, completion rate
7. **Pomodoro timer** — focus 25min integrat

### time/TimeTrackingPage
1. **Active timer** — start/stop live cu task curent
2. **Approval workflow** — manager confirmă pontajul
3. **Export payroll** — CSV pentru contabil
4. **Calcul ore suplimentare** — peste 8h/zi sau 40h/săpt
5. **Tipuri absență** — concediu, medical, formare
6. **Bulk edit** — corecție săptămână întreagă
7. **Per-piesă inline** — alocare ore direct pe piesa lucrată

### warehouse/WarehousePage
1. **Bin location map** — vizualizare 2D rafturi
2. **Cycle count audit** — comparație fizic vs sistem cu varianță
3. **Alerte min/max** — push notification când scade sub prag
4. **Istoric mișcări per material** — trace complet
5. **Transfer cu print bon** — etichetă pentru manipulant
6. **Picking list per proiect** — listă optimizată cu locații
7. **Raport reorder** — ce trebuie comandat săptămâna asta

### portal/CustomerPortalPage
1. **Live order tracker** — etape vizibile la client
2. **Document download** — facturi, contracte, certificate
3. **Self-service support ticket** — fără telefon
4. **Pay invoice online** — Stripe/Netopia link
5. **Galerie foto proiect** — evidență vizuală execuție
6. **Login activity** — IP-uri logate (securitate)
7. **Multi-language** — RO/EN/IT pentru clienți internaționali

### portal/RfqResponsePage
1. **Save draft** — completează în mai multe sesiuni
2. **Upload spec sheets** — PDF/imagini la fiecare poziție
3. **Tabel pricing breakdown** — detaliat pe componente
4. **Currency selection** — RON/EUR cu conversie afișată
5. **Validity period** — "ofertă valabilă 30 zile"
6. **Auto-acknowledge** — email confirmare la submit
7. **Negotiation chat** — discuții în-portal pe ofertă

---

## Categorii Strategice

Ideile sunt grupate astfel încât să poți alege rapid:
- **Quick wins** (UX/efficiency): bulk actions, search, filtre salvate, export
- **Diferentiatori** (AI/automation): scoring, predictive maint, auto-RFQ, smart suggestions
- **Compliance/audit**: signatures, audit log, versionare, retention policies
- **Mobile/floor**: barcode, foto, voice, offline mode

**Total: ~250 idei** distribuite pe 40+ pagini.
