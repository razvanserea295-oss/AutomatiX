# Inventar Aplicație Automatix Promix

**Generat:** 2026-06-24
**Repo:** Automatix-NEW (`C:\APLICATIE AUTOMATIX\Automatix-NEW\`)
**Tip:** Inventar READ-ONLY — pagini, funcții, butoane acționabile, comenzi IPC

---

## Arhitectura navigării

Aplicația folosește o navigare pe **workspace-uri** (grupuri din bara laterală), fiecare workspace fiind un container care randează **sub-pagini (tab-uri)**. Sursa de adevăr:

- **Rutare:** `src/App.tsx` (rute `wouter`, hash-based) + `src/config/workspaceNav.ts` (`WORKSPACE_SUBPAGES`)
- **Containere workspace:** `src/pages/workspace/*Workspace.tsx`
- **Pagini reale (tree viu):** `src/redesign/pages/**`
- **Backend IPC:** `electron/ipc/*.ts` (înregistrate via `ipcRegister`), servicii în `electron/services/*.ts`

Există **10 workspace-uri multi-tab** + pagina **Dashboard** (standalone) + pagini de detaliu contextuale (detaliu lead, detaliu stație, arbore proiect, arhivă sursă).

> Toate acțiunile de scriere trec prin helperul `apiCommand('<cmd>', payload)` din `@/api/commands` (în Electron → `window.electron.invoke`; în web → POST `/api/cmd/<cmd>`). Multe mutații invalidează `useDashboardStore`.

---

## 1. Dashboard

- **Cale:** `/` și `/dashboard`
- **Pagini:** 1 (Overview) — `src/redesign/pages/DashboardPage.tsx` + widgets `dashboard/`

**Funcții principale:**
- Tablou de bord operațional cu salut personalizat și data curentă (hook `useDashboardPage`: venituri, proiecte, alerte, handoff-uri, stoc, vânzări).
- Patru KPI-uri în antet, gardate de permisiuni (`can(...)`): Venituri, Proiecte active, Necesită atenție (alerte+handoff-uri), Blocaje operaționale.
- Șase panouri-widget: feed de atenție, pipeline proiecte, acțiuni rapide, snapshot operațional, stoc critic, evoluție venituri.
- Datele financiare/depozit/proiecte sunt mascate cu `—` și ecran „Fără acces" când lipsesc permisiunile.

**Butoane / acțiuni:**
- **Reîmprospătează** (antet) — reîncarcă datele (`handleRefresh`, spinner cât timp `refreshing`).
- *AttentionFeed:* **Vezi toate** → `alerts`; rândurile navighează la `alerts` / `manager-control`.
- *ProjectsPipeline:* **Deschide portofoliul** → `projects`; rândurile → `projects`.
- *QuickActions:* grilă de max 6 scurtături filtrate pe permisiuni (din `PALETTE_ACTIONS`) → `onNavigate(action.page)`.
- *OperationalSnapshot:* celule clicabile → `documents`, `materials`, `production`, `warehouse`, `sales-hub`; scurtături jos: Documente, Producție, Depozit, Vânzări, Rapoarte.
- *CriticalStock:* **Deschide depozitul** → `warehouse`; materialele sub minim → `materials`.
- *RevenuePanel:* fără butoane — Venituri/Costuri/Marjă + grafic lazy (`RevenueChartWidget`).
- **Date:** `get_dashboard_data` (navigarea e prin shell, nu IPC).

---

## 2. Personal

- **Cale:** `/tasks`, `/calendar`, `/deplasari`
- **Sub-pagini:** 3

### Task-urile mele (`/tasks`) — `tasks/PersonalTasksPage.tsx`
**Funcții principale:** Gestionarea task-urilor proprii + delegate, 4 tab-uri (Task-urile mele / Delegate / Statusuri / Mențiuni), KPI-uri (Deschise, Scadente azi, Săptămâna asta, Delegate de mine), căutare, comutator „Arată finalizate", flux de review pentru delegator, panou mențiuni (@ + delegări).
**Butoane / acțiuni:**
- **Task nou** → editor în mod create.
- Tab-uri segmentate; checkbox **Arată finalizate**.
- Card task: checkbox toggle (`update_personal_task`), **Detalii**, **Editează**, **Șterge** (`delete_personal_task`).
- Mențiuni: **Toate citite** (`mark_all_mentions_read`), **Marchează citit** (`mark_mention_read`).
- Editor: **Creează/Deleagă/Salvează** → `create_personal_task` / `assign_task_to_user` / `update_personal_task`.
- Info modal: **Rezolvat / Necesită clarificări / Nerezolvat** (`update_personal_task` status=done), **Redeschide** (status=open), **Cere clarificări** (`request_task_clarification`).
- Review modal: **Confirmă** / **Acceptă ca nerezolvat** (`delete_personal_task`), **Trimite înapoi** / **Reasignează** (`reopen_personal_task`).
- **Citire:** `list_personal_tasks`, `list_mentions`, `list_tasks_assigned_by_me`, `list_assignable_users`.

### Calendar (`/calendar`) — `calendar/CalendarPage.tsx`
**Funcții principale:** Calendar cu 4 vizualizări (Lună/Săptămână/Zi/Agendă); agregă evenimente din mai multe surse (deadline proiect, deplasare, mentenanță, compliance, scadență factură, expirare ofertă, personal) via `get_calendar_events`; filtre pe tip; drag&drop reprogramare; creare evenimente personale; export iCal.
**Butoane / acțiuni:**
- **iCal** → `build_calendar_ical` (descarcă `.ics`).
- **Eveniment / Eveniment personal** → editor creare.
- Comutatoare Lună/Săptămână/Zi/Agendă; navigare **‹ / Azi / ›**; toggle sidebar.
- Filtre tip eveniment + **Arată toate**.
- Drag&drop → `reschedule_calendar_event`; click eveniment (personal → editor, altfel navigare la URL).
- Editor personal: **Adaugă/Salvează** (`create_personal_calendar_event` / `update_personal_calendar_event`), **Șterge** (`delete_personal_calendar_event`).

### Deplasări (`/deplasari`) — `deplasari/DeplasariPage.tsx`
**Funcții principale:** Evidența deplasărilor; listă + panou „În deplasare acum" + alertă costuri necompletate >7 zile; KPI-uri (Total, Active acum, Costuri întârziate, Cost total cu conversie EUR→RON); filtrare pe status + căutare; creare/editare cu persoane suplimentare, proiect, costuri (transport/cazare/mâncare/materiale/diurnă) și monedă; panou **Plăți & buget** cu închiderea delegației și transfer automat în Financiar (doar Admin/Manager).
**Butoane / acțiuni:**
- **Detalii**, **Plăți & buget**, **Editează**, **Marcat întors** (`update_deplasare` status=intors), **Șterge** (`delete_deplasare`).
- Creare/editare: **Înregistrează/Salvează** (`create_deplasare` / `update_deplasare`); calculator diurnă (**= total**).
- CompleteCostsModal: **Finalizează** (`update_deplasare` + postare în Cheltuieli).
- PaymentsModal: **Adaugă plată** (`record_deplasare_payment`), **Șterge plata** (`delete_deplasare_payment`), **Marchează încheiată** (`update_deplasare` status=finalizat). Citire: `list_deplasare_payments`.

---

## 3. Vânzări

- **Cale:** `/sales-hub`, `/quotations`, `/clients` (+ detaliu `/sales-hub/:id`)
- **Sub-pagini:** 3 + detaliu lead

### Pipeline / Sales Hub (`/sales-hub`) — `sales/SalesHubPage.tsx`
**Funcții principale:** Două vizualizări (Pipeline Kanban pe stadii / În execuție); drag&drop carduri între coloane; KPI-uri (În discuție, În negocieri, Convertite, Valoare pipeline); avertisment lead-uri „stale" (>7 zile); filtre manager (utilizator + sortare). CRUD prin `salesStore`.
**Butoane / acțiuni:** **Oferte** → `/quotations`; **Discuție nouă** (`createLeadStore`); drag-drop → `updateLeadStore`; pe card: „Înregistrează update" (`addNoteStore`), „Editează lead"; click card → detaliu.

### Detaliu lead (`/sales-hub/:id`) — `sales/LeadDetailPage.tsx`
**Funcții principale:** Încarcă lead + atașamente (`get_sales_lead`, `list_lead_attachments`); KPI-uri; galerie poze + fișiere; feed update-uri + notă rapidă; compresie imagini client-side.
**Butoane / acțiuni:** **Înapoi**; **Update** (`add_sales_lead_note`); **Editează** (`update_sales_lead`); **Trece în execuție** (`convert_sales_lead`); **Șterge** (`delete_sales_lead`); select status (`update_sales_lead`); **Adaugă fișiere** (`add_lead_attachment`); ștergere fișier (`delete_lead_attachment`); email→`mailto:`, telefon→`tel:`.

### Oferte (`/quotations`) — `sales/QuotationsPage.tsx`
**Funcții principale:** Listă + detaliu master-detail; statistici funnel (`list_quotations`, `get_quotation_stats`); KPI-uri (Trimise, Vizualizate, Acceptate, Valoare pipeline); builder ofertă cu poziții dinamice; atașamente per ofertă.
**Butoane / acțiuni:** **Ofertă nouă** (`create_quotation`); **PDF** (`downloadOfferPdfFromQuotation`); **Trimite email** (`send_quotation`); **Acceptată/Refuzată** (`decide_quotation`); **Convertește în contract** (`convert_quotation_to_contract`); **Șterge** (`delete_quotation`); documente: încărcare (`add_quotation_attachment`), descărcare, ștergere (`delete_quotation_attachment`).

### Clienți (`/clients`) — `clients/ClientsPage.tsx`
**Funcții principale:** Master-detail clienți cu căutare + sortare pe valoarea portofoliului; KPI-uri; fișă client (contact, date fiscale CUI/Reg.Com/IBAN, note, proiecte asociate); CRM `ClientsEnhancements`; lookup ANAF. CRUD prin `clientStore`.
**Butoane / acțiuni:** **Client nou**; **Editează** / **Șterge** (`createClient`/`updateClient`/`deleteClient`); **ANAF** (`anaf_lookup_cui`); email→`mailto:`, telefon→`tel:`.

---

## 4. Proiecte & Contracte

- **Cale:** `/projects`, `/contracts`
- **Sub-pagini:** 2

### Proiecte (`/projects`) — `ProjectsPage.tsx`
**Funcții principale:** Master-detail cu split-view comutabil; deep-link focus; detaliu (info, arbore piese, revizuire stadii în localStorage, documente, comentarii); tabel tracking producție 14 faze + preview DXF; token-uri portal client. CRUD prin `projectStore`.
**Butoane / acțiuni:** **Proiect nou**; **Editează** / **Șterge** (store); **Blochează / Anulează / Reia** (`updateProjectStore` status); card **Arbore piese** → `parts-tree`; comentarii (`add_project_comment`); documente: vizualizare/descărcare; **PortalTokensButton**: **Generează link** (`create_portal_token`), **Revocă** (`revoke_portal_token`), **Șterge** (`delete_portal_token`), Copy URL. Citire: `list_portal_tokens`, `get_project_parts_tree`, `get_project_documents`, `get_project_comments`.

### Contracte (`/contracts`) — `contract/ContractPage.tsx`
**Funcții principale:** Master-detail + filtru status (Activ/Amendat/Închis); creare contract inline; editare in-place; revizii; atașamente. Citire: `get_contracts`, `get_contract`.
**Butoane / acțiuni:** **Contract nou** (`create_contract`); **Editează/Salvează** (`update_contract`); **Revizuire** (`create_contract_revision`); **Descarcă contract**; atașamente: încărcare (`add_contract_attachment`) / ștergere (`delete_contract_attachment`). Citire: `list_contract_attachments`.

---

## 5. Inginerie

- **Cale:** `/briefings`, `/fisa-proiectant`, `/fisa-templates`, `/parts-tree`, `/parts-ordering`, `/libraries`
- **Sub-pagini:** 6

### Briefing (`/briefings`) — `ProjectBriefingsPage.tsx`
**Funcții principale:** Inbox/Sent/All briefing-uri proiect (master-list + detaliu) via `get_project_briefings`; căutare + filtru pe 8 stări; auto-marcare „Văzut"; detaliu cu tab-uri Briefing/Clarificări (Q&A); atașamente (drag&drop, max 500 MB/fișier); modal „Briefing nou".
**Butoane / acțiuni:** **Primite/Trimise/Toate**; **Briefing nou** (`create_project_briefing` draft/sent); workflow status (`update_project_briefing_status`: accepted/rejected/completed/cancelled); atașamente (`uploadBriefingFile`, `list_briefing_attachments`, `delete_briefing_attachment`, `update_briefing_attachment_note`); clarificări (`ask_briefing_clarification`, `answer_briefing_clarification`, `reopen_briefing_clarification`).

### Fișa proiectant (`/fisa-proiectant`) — `checklist/FisaProiectantPage.tsx`
**Funcții principale:** Selectează proiect → fișă via `get_checklist_by_project`; creare din template (`create_checklist`); tab-uri Tracking Ansambluri (matrice checkbox) + Specificații Tehnice (secțiuni dinamice); calcul progres ponderat; mod Vizualizare/Editare; la finalizare mută proiectul în producție.
**Butoane / acțiuni:** click card proiect; **Editează/Vizualizare**; **Salvează** (`update_checklist`); **Finalizează** (`update_checklist` status=finalized); **Creează fișă** (`create_checklist`); checkbox tracking + câmpuri specs (local).

### Template-uri fișe (`/fisa-templates`) — `FisaTemplatesPage.tsx`
**Funcții principale:** Catalog template-uri globale (`get_fisa_templates`); căutare; detaliu cu ponderi coloane; acțiuni gate-uite (`canEdit`); editor schemă JSON.
**Butoane / acțiuni:** **Template nou**; **Clonează** (`clone_fisa_template`); **Editează** (`update_fisa_template`); **Dezactivează** (`delete_fisa_template`).

### Arbore piese (`/parts-tree`) — `PartsTreePage.tsx`
**Funcții principale:** Arbore CAD virtualizat (`get_project_parts_tree`); import folder CAD (Electron `scan_parts_folder` / web upload chunked + `import_scanned_parts`); căutare + expand/collapse; sortare + redenumire automată; adăugare piesă; ștergere arbore; coduri furnizor.
**Butoane / acțiuni:** select proiect; **Coduri** (SupplierCodesModal); **Adaugă piesa** (`createPiece`); **Expandează/Restrânge**; **Doar ansambluri**; **Import** (`scan_parts_folder`/`import_scanned_parts`); **ZIP** (download); **Sortează** (`updatePiece` în masă); **Șterge arbore** (`wipe_project_parts_tree`); **Scanează** (cale manuală).

### De comandat (`/parts-ordering`) — `PiecesOrderingPage.tsx`
**Funcții principale:** Pipeline Kanban aprovizionare piese (Cerute → Comandate → Sosite → Montate) via `get_piece_orders`; filtre proiect + cod furnizor; note editabile; coduri furnizor (`get_supplier_codes`).
**Butoane / acțiuni:** filtre + **Reîmprospătează**; **Confirmă comandă / Confirmă sosire / Marchează montat** (`update_piece_order_status`); **Anulează** (`cancel_piece_order`); **re-deschide** (`update_piece_order_status`); note (`update_piece_order_notes`).

### Biblioteci (`/libraries`) — `libraries/LibrariesPage.tsx`
**Funcții principale:** Tab-uri Standard (`get_standard_parts`) + Custom (`get_custom_parts`); stats agregate; CRUD; promovare custom → standard.
**Butoane / acțiuni:** **Piesă nouă** (`create_standard_part`/`create_custom_part`); **Editează** (`update_*`); **Șterge** (`delete_*`); **Promovează la standard** (`promote_to_standard`).

---

## 6. Producție

- **Cale:** `/production`, `/maintenance`, `/service-tickets` (+ detaliu `/stations/:id`)
- **Sub-pagini:** 3 + detaliu stație

### Producție / Kanban (`/production`) — `KanbanPage.tsx`
**Funcții principale:** Board Kanban dual-mod (proiecte pe etape / piesele unui proiect); drag&drop între etape; carduri proiect (prioritate, valoare, deadline, comentarii, pontaje) și carduri piesă (categorie, progres, buton pontaj); filtrare pe client.
**Butoane / acțiuni:** selector Vizualizare + selector client; drag&drop proiect (`move_project_to_stage`) / piesă; click card → `parts-tree`; „Editează proiect" → `projects`; `PieceTimerButton` (pontaj). Citire: `get_project_stages_custom`, `get_production_board`.

### Service / Mentenanță (`/maintenance`) — `maintenance/MaintenancePage.tsx`
**Funcții principale:** Istoric servisări pe piese per proiect; căutare + filtru status; KPI-uri; panou costuri (manoperă vs piese); drawer creare/editare cu foto BEFORE/AFTER (compresie client-side).
**Butoane / acțiuni:** selector proiect + căutare; **Servisare nouă**; editare (drawer), **Șterge** (`delete_piece_service`); creare/salvare (`create_piece_service`/`update_piece_service`). Citire: `list_piece_services`, `get_users`.

### Tichete service (`/service-tickets`) — `service/ServiceTicketsPage.tsx`
**Funcții principale:** Listă tichete + KPI-uri (deschise, în lucru, overdue SLA, rezolvate 7 zile); filtre rapide; detaliu cu editare inline (status, severitate+SLA, asignare, cost, monedă); piese consumate + comentarii; modal creare.
**Butoane / acțiuni:** **Tichet nou** (`create_service_ticket`); filtre Deschise/Overdue/Toate; editare inline (`update_service_ticket`); **+** piesă (`add_service_ticket_part`) / **×** (`remove_service_ticket_part`); comentariu (`add_service_ticket_comment`). Citire: `list_service_tickets`, `get_service_ticket_stats`, `get_all_stations`.

### Detaliu stație (`/stations/:id`) — `stations/StationDetailPage.tsx`
**Funcții principale:** 6 tab-uri (Prezentare, Intervenții, Mentenanță, Piese, Cereri modificare, Jurnal); KPI-uri; cronologie (creare→livrare→PIF→garanție); reîncărcare la revenirea în tab.
**Butoane / acțiuni:** **Stații** (back); **Adaugă intervenție** (`create_intervention`); **Plan nou** (`create_station_maintenance_plan`) + ștergere (`delete_station_maintenance_plan`); **Cerere nouă** piese (`create_station_parts_request`) + ștergere (`delete_station_parts_request`); **Cerere nouă** modificare (`create_station_change_request`) + ștergere (`delete_station_change_request`). Citire: `get_station_by_id`, `get_station_interventions`, `get_station_maintenance_plans`, `get_station_parts`, `get_station_change_requests`, `get_station_activity`.

---

## 7. Aprovizionare

- **Cale:** `/warehouse`, `/materials`, `/purchase-orders`
- **Sub-pagini:** 3

### Depozit (`/warehouse`) — `warehouse/WarehousePage.tsx`
**Funcții principale:** 4 tab-uri (Stoc, Mișcări, Rezervări, Locații); stoc total/rezervat/disponibil + badge Critic; rezervări cu vechime + alertă >7 zile; respectă modul viewer.
**Butoane / acțiuni:** acțiune primară contextuală (Mișcare/Rezervare/Locație nouă); **Înregistrează** mișcare (`record_stock_movement`); **Creează rezervare** (`create_stock_reservation`); **Adaugă locație** (`create_warehouse_location`); **Eliberează** rezervare (`issue_stock_reservation`). Citire: `get_stock_movements`, `get_stock_reservations`, `get_warehouse_locations`.

### Inventar (`/materials`) — `InventoryPage.tsx`
**Funcții principale:** Listă materiale cu căutare + filtre categorie/stare; modal creare/editare; modal istoric consumuri; respectă modul viewer.
**Butoane / acțiuni:** căutare + filtre; **Istoric consum** (`get_material_consumptions`); **Material nou**; **Editează / Șterge** (`create_material`/`update_material`/`delete_material` via store). Citire: `fetchMaterials`, `fetchLocations`.

### Achiziții (`/purchase-orders`) — `procurement/ProcurementWorkspacePage.tsx`
**Funcții principale:** Workspace cu tab-uri Furnizori + Comenzi achiziție; furnizori (tabel sortabil cu coloane redimensionabile, CRUD); comenzi cu linii multiple; export CSV + print; recepție pe linie (`ReceptionsTab`).
**Butoane / acțiuni:** **Export CSV / Printează**; **Adaugă furnizor** (`create_supplier`/`update_supplier`), ștergere (`delete_supplier`); **Comandă nouă** (`create_purchase_order`); **Recepționează** (`receive_purchase_line`). Citire: `get_suppliers`, `get_purchase_orders`, `get_materials`, `get_projects`, `get_purchase_order`.

---

## 8. Financiar

- **Cale:** `/finance`, `/documents`, `/reports`
- **Sub-pagini:** 3

### Financiar (`/finance`) — `FinancePage.tsx`
**Funcții principale:** 3 tab-uri (Prezentare / Facturi / Cheltuieli); KPI-uri (Venituri, Costuri, Profit, Marjă — profit blocat până la finalizare); tabel profitabilitate; vechime creanțe + proiecte cu risc + conformitate; facturi (creare, plăți, status, PDF); cheltuieli + top categorii.
**Butoane / acțiuni:** **Cost final** (`set_project_final_cost`); **Factura noua** (`create_finance_invoice`); descărcare PDF (`downloadInvoicePdf`); **Înregistrează plata** (`record_invoice_payment`); **Marchează trimisă / Anulează** (`update_invoice_status`); **Cheltuiala noua** (`create_project_expense`). Citire: `get_finance_overview`, `get_finance_projects`, `get_finance_insights`, `get_finance_compliance`, `get_invoices`, `get_project_expenses`.

### Documente (`/documents`) — `documents/DocumentsPage.tsx`
**Funcții principale:** Listare cu sidebar categorii (filtrare + reordonare drag&drop); upload cu conținut fișier (max ~6 MB base64); căutare + sortare; gestionare categorii; selecție multiplă + ștergere în masă; descărcare/deschidere; `DocumentsEnhancements` (versiuni, share, OCR, ZIP).
**Butoane / acțiuni:** **Adaugă document** (`create_document`/`update_document`); **Gestionează** categorii; reordonare (`update_document_categories_order`); **Adaugă** categorie (`create_document_category`) / editare (`update_document_category`); descărcare (`get_document_file`); **Șterge** (`delete_document`) inclusiv în masă. Citire: `get_documents`, `get_document_categories`, `get_projects`.

### Rapoarte (`/reports`) — `reports/ReportsPage.tsx`
**Funcții principale:** Generator rapoarte ad-hoc peste surse selectabile; alegere coloane/filtre/sortare; afișare tabel cu totaluri; export Excel client-side; presete salvabile.
**Butoane / acțiuni:** dropdown sursă; checkbox coloane; **Adaugă filtru**; sortare; **Ruleaza raportul** (`run_report`); **Export Excel**; **Salvează** preset (`save_report_preset`); încărcare preset; **Șterge** preset (`delete_report_preset`). Citire: `get_report_sources`, `list_report_presets`.

---

## 9. Comunicare

- **Cale:** `/email`, `/chat`, `/alerts`
- **Sub-pagini:** 3

### Email (`/email`) — `email/EmailPage.tsx`
**Funcții principale:** Client IMAP/SMTP cu 3 panouri (foldere / listă mesaje paginată / vizualizare); stare „Email neconfigurat"; sincronizare; stelare/coș; vizualizare iframe sandbox; descărcare atașamente; compunere/răspuns; `EmailEnhancements` (template-uri, programare, mail merge).
**Butoane / acțiuni:** căutare; **Sincronizează** (`email_sync_inbox`); folder; click mesaj (`email_get_message`); stea (`email_toggle_star`); paginare; **Raspunde**; coș (`email_trash`); atașament (`email_download_attachment`); **Trimite** (`email_send`). Citire: `email_get_account`, `email_list_folders`, `email_list_messages`.

### Mesaje / Chat (`/chat`) — `chat/ChatPage.tsx`
**Funcții principale:** Mesagerie 1-la-1 și grupuri (polling 3-5s); text + fișiere (drag&drop, paste screenshot); conversație nouă + creare grup; setări grup (redenumire, avatar, membri, admin) gate-uite pe creator/admin.
**Butoane / acțiuni:** căutare; **Grup nou**; **Conversație nouă** (`send_chat_message` 👋); click conversație (`get_chat_messages` + `mark_chat_read`); atașează (`send_chat_message` file); **Trimite** (`send_chat_message` text); **Creează grup** (`create_chat_group`); setări grup: avatar/nume (`update_chat_group`), **Adaugă membri** (`add_chat_group_members`), admin (`set_chat_group_admin`), elimină (`remove_chat_group_member`). Citire: `get_chat_conversations`, `get_chat_group_details`.

### Alerte (`/alerts`) — `alerts/AlertsPage.tsx`
**Funcții principale:** Listare alerte categorisite (critical/warning/info/resolved) cu generare automată; KPI-uri clicabile pe severitate; căutare + filtre; creare/editare manuală; acknowledge individual + masă.
**Butoane / acțiuni:** căutare; **Adaugă alertă** (`createAlert`/`updateAlert` via store); pile filtre severitate; KPI-uri clicabile; **Confirmă** (`acknowledgeAlert` / `acknowledge_alert`); bulk-ack. Citire/generare: `generate_system_alerts`, `get_alerts` (via `useAlertStore`).

---

## 10. Instrumente

- **Cale:** `/manager-control` (birou-control), `/tutorial`, `/download-app`, `/print`, `/remote-support`, `/licente` (+ `/arhiva`)
- **Sub-pagini:** 6 vizibile + Arhivă sursă

### Birou de control / Manager (`/manager-control`) — `ManagerControlPage.tsx`
**Funcții principale:** Consolă admin/manager cu 2 tab-uri (Supraveghere / Activitate); predări pendinte + blocate >24h SLA + urgente; anomalii AI sortate pe severitate; KPI strip. Date din `useHandoffStore`.
**Butoane / acțiuni:** **Detectează anomalii** (`detect_anomalies` → `get_anomalies`); **Marchez urgent** (`setUrgent`); **Forțează** tranziție (store `force`); **Marcaj rezolvat** (`acknowledge_anomaly`); bulk-ack.

### Tutorial (`/tutorial`) — `tutorial/TutorialPage.tsx`
**Funcții principale:** Hub ajutor/onboarding **static** (fără IPC); 3 secțiuni (Parcurs proiect 6 etape / Toate paginile / Sfaturi); căutare instant; KPI (pagini ghidate, pași, sfaturi).
**Butoane / acțiuni:** căutare; nav rail; accordion lifecycle; **Deschide pagina** (navigare client-side `onNavigate`/hash). *Nicio comandă IPC.*

### Aplicație desktop (`/download-app`) — `tools/DownloadAppPage.tsx`
**Funcții principale:** Descărcare app desktop nativă; detectează OS; interoghează `GET /api/download/latest` (REST, nu IPC); doar Windows disponibil; cerințe + pași instalare.
**Butoane / acțiuni:** **Descarcă pentru {OS}** (link download); **Descarcă totuși versiunea Windows** (fallback). *Nicio comandă IPC.*

### Imprimare (`/print`) — `tools/PrintPage.tsx`
**Funcții principale:** Trimite fișiere (PDF/text/imagini max 25 MB) la imprimantă de pe server; opțiuni (imprimantă, copii, pagini); ultimele 12 joburi; panou Administrare admin (kill-switch + aprobare imprimante).
**Butoane / acțiuni:** **Administrare** (toggle); **Reîmprospătează**; **Alege fișier** / dropzone; **Imprimă** (`print_file`); checkbox **Imprimare activată** + per imprimantă (`admin_print_config_set`). Citire: `list_printers`, `list_print_jobs`, `admin_print_config_get`.

### Asistență la distanță (`/remote-support`) — `remote/RemoteSupportPage.tsx`
**Funcții principale:** Suport remote RustDesk (suport rapid cu link temporar / endpoint-uri înregistrate); viewer în Automatix (web) sau fereastră RustDesk locală; KPI; istoric sesiuni.
**Butoane / acțiuni:** **Reîmprospătează**; **Generează link** (`create_quick_remote_support`); copiază link/mesaj; **Anulează link** (`cancel_remote_session`); **Conectează** (`start_remote_connection` + `launch_rustdesk_viewer`); **Redeschide RustDesk** (`launch_rustdesk_viewer`); **Încheie** (`end_remote_session`); endpoint: **Salvează/Adaugă** (`create_remote_endpoint`/`update_remote_endpoint`), **Șterge** (`delete_remote_endpoint`). Citire: `list_remote_sessions`, `get_remote_endpoints`.

### Licențe (`/licente`) — `admin/LicensesPage.tsx`
**Funcții principale:** Generator licențe semnate criptografic (issuer autorizat); formular firmă → token; verifică starea cheii de semnare; listează licențele emise.
**Butoane / acțiuni:** **Reîmprospătează** (`list_issued_licenses`); **Generează** (`create_license`); **Copiază cheia / Copiază** token. Citire: `get_license_issuer_state`.

### Arhivă sursă (`/arhiva`) — `backup/SourceArchivePanel.tsx`
**Funcții principale:** Doar admin; download cod sursă (link temporar TTL); upload zip actualizare app (backup + rebuild + restart, rollback la eșec); restart server.
**Butoane / acțiuni:** **Generează link** (`create_source_archive_link`); copiază/descarcă; **Încarcă și actualizează** (XHR `POST /api/source-archive/upload`); **Repornește serverul** (`app_restart`). Citire: `app_restart_allowed`.

---

## 11. Sistem

- **Cale:** `/users`, `/sessions`, `/settings`
- **Sub-pagini:** 3 (Utilizatori/Sesiuni doar admin; Setări pentru toți)

### Utilizatori (`/users`) — `auth/UsersPage.tsx`
**Funcții principale:** CRUD utilizatori + roluri; listă cu căutare + filtru rol; detaliu cu editare profil, acces pe pagini (4 niveluri: Implicit/Fără acces/Viewer/Editor), config widget-uri dashboard per user; KPI-uri.
**Butoane / acțiuni:** **Utilizator nou** (`create_user`); **Editează** (`update_user`); **Șterge** (`delete_user`); **Salvează permisiuni** (`update_user_pages`); toggle widget-uri + **Salvează dashboard** (`update_user_dashboard_config`). Citire: `get_users`, `get_roles`.

### Sesiuni (`/sessions`) — `auth/UserSessionsPage.tsx`
**Funcții principale:** Doar admin; monitorizare live conectați (polling 5s); grupare pe utilizator; istoric login/logout/eșuat; KPI-uri; card 2FA enforcement (politică salvată **local** în localStorage).
**Butoane / acțiuni:** **Reîmprospătează**; **Vezi istoric login** (`get_user_login_history`); **Forțează deconectare** (`force_logout_user`); checkbox-uri 2FA (local). Citire: `list_active_sessions`, `get_sessions_summary`.

### Setări (`/settings`) — `settings/SettingsPage.tsx`
**Funcții principale:** Container cu nav rail grupat (Personal/Companie/Platformă), 12 secțiuni gate-uite pe rol; KPI-uri.
**Butoane / acțiuni pe secțiuni:**
- **Banner setup** (admin): **Continuă setup inițial** (wizard).
- **Aspect** (`AspectSection`): Interfață app (v2/Clasică), Interfață (Modern/Fiori), Temă, Culoare accent, densitate, animații, scală text, culoare navbar, fundal carduri, înălțimi shell, colțuri/borduri/umbre carduri (toate prin store-uri, fără IPC); **LayoutPresetPicker** (Clasic/Compact/Aerisit/Focus); **PageCustomizerWizard** (personalizare pe pagină, 5 pași).
- **Notificări**: toggle desktop native; checkbox-uri per eveniment; **Salvează** (`update_notification_prefs`). Citire: `get_notification_prefs`.
- **Cont** (`TwoFactorPanel`): **Activează 2FA** (`enable_2fa_start` → `enable_2fa_confirm`); **Dezactivează** (`disable_2fa`); `AvatarUpload`.
- **Email**: **Testează conexiunea** (`email_test_connection`); **Salvează** (`email_save_account`). Citire: `email_get_account`.
- **Fiscal**: **Salvează** (`update_company_settings`); **Actualizează din BNR** (`refresh_exchange_rate`). Citire: `get_company_settings`, `get_bnr_rate_history`.
- **Server**: **Pornește/Oprește** (`server_start`/`server_stop`); **Testează/Salvează/Deconectează** URL.
- **Backup**: **Backup acum** (`backup_run_now`); **Actualizează** (`backup_status`, `backup_list`); `AutoBackupPanel`.
- **Anunțuri** (`BroadcastsAdminPanel`), **Mentenanță** (`MaintenanceModePanel`), **Audit** (`AuditLogPanel`), **Despre** (`AboutPanel`), **Ajutor** (`HelpPanel`) — secțiuni delegate, admin.

---

## Comenzi IPC backend (411 înregistrate, pe categorii)

> Sursa: `electron/ipc/*.ts` (apel `ipcRegister`). Backend-ul real e aggregat via servicii în `electron/services/*.ts`.

**Autentificare & 2FA** (`auth`): `login`, `logout`, `validate_session`, `cleanup_sessions`, `change_password`, `enable_2fa_start`, `enable_2fa_confirm`, `disable_2fa`, `login_verify_2fa`

**Sesiuni & activitate** (`userSessions`, `activityLog`): `list_active_sessions`, `get_user_login_history`, `force_logout_user`, `get_sessions_summary`, `get_user_activity_log`, `get_activity_actors`

**Utilizatori & workspace** (`users`, `workspace`): `get_users`, `get_user`, `create_user`, `update_user`, `delete_user`, `get_roles`, `update_user_pages`, `update_user_dashboard_config`, `get_workspace_profile`, `update_workspace_profile`, `export_personal_data`, `import_personal_data`, `get_system_monitor`, `get_moderation_dashboard`, `create_moderation_report`, `resolve_moderation_report`

**Vânzări & oferte** (`sales`, `quotations`): `get_sales_stats`, `get_sales_leads`, `get_sales_lead`, `delete_sales_lead`, `get_lead_notes`, `list_lead_attachments`, `delete_lead_attachment`, `list_quotations`, `get_quotation`, `delete_quotation`, `convert_quotation_to_contract`, `get_quotation_stats`, `mark_quotation_viewed`, `generate_pdf_quotation`, `list_quotation_attachments`, `get_quotation_attachment`, `delete_quotation_attachment`

**Clienți & ANAF** (`projects`, `anaf`): `get_clients`, `delete_client`, `anaf_lookup_cui`

**Proiecte & portal** (`projects`, `portal`, `production`): `get_projects`, `get_project`, `delete_project`, `get_project_stages`, `get_project_comments`, `add_project_comment`, `get_project_history`, `get_project_stats`, `update_project_stage`, `list_portal_tokens`, `create_portal_token`, `revoke_portal_token`, `delete_portal_token`, `get_production_board`, `get_stage_transitions`, `move_project_to_stage`

**Contracte** (`contracts`): `get_section_templates`, `get_contracts`, `get_contract`, `get_contract_by_project`, `create_contract`, `update_contract`, `create_contract_revision`, `get_contract_revisions`, `list_contract_attachments`, `add_contract_attachment`, `get_contract_attachment`, `delete_contract_attachment`

**Inginerie & piese** (`engineering`, `pieces`, `partsTree`, `piecesOrdering`, `supplierCodes`, `tipPiese`): `get_engineering_tree`, `create/update/delete/move_engineering_node`, `release_engineering_tree`, `get_engineering_bom`, `add/delete_engineering_bom_item`, `get_material_needs`, `get_project_pieces`, `create/update/delete_project_piece`, `bulk_import_project_pieces`, `list/create/delete_piece_material_requirement`, `get/create/update_project_stage_custom`, `scan_parts_folder`, `get_project_parts_tree`, `import_scanned_parts`, `delete_parts_tree_node`, `wipe_project_parts_tree`, `get_piece_orders`, `create_piece_order_request`, `update_piece_order_status`, `update_piece_order_notes`, `cancel_piece_order`, `get/create/update/delete_supplier_code`, `get_tip_piese`, `get/save_operatii_config`

**Fișe & checklist & template-uri** (`checklist`, `fisaTemplates`): `get_checklists`, `get_checklist_by_project`, `create/update_checklist`, `get_fisa_templates`, `get_fisa_template`, `create/update/delete/clone_fisa_template`

**Briefing & handoff-uri** (`projectBriefings`, `handoffs`): `get_project_briefings`, `create/update/delete_project_briefing`, `update_project_briefing_status`, `list/ask/answer/reopen_briefing_clarification`, `list/add/get/delete_briefing_attachment`, `update_briefing_attachment_note`, `get_my_handoffs`, `get_project_handoffs`, `accept/reject/force_handoff`, `set_handoff_urgent`, `escalate_overdue_handoffs`, `generate_handoff_ai_summary`, `detect_anomalies`, `get/acknowledge_anomaly`, `get/refresh_my_briefing`

**Producție, stații, service** (`stations`, `serviceTickets`, `maintenance`, `productionDocs`, `reservations`): `get_all_stations`, `get_station_by_id`, `delete_station`, `get_station_interventions/maintenance_plans/parts/activity/change_requests`, `delete_station_*`, `list/get/create/update/delete_piece_service`, `list/get/delete_service_ticket`, `add_service_ticket_comment`, `remove_service_ticket_part`, `get_station_ticket_history`, `get_service_ticket_stats`, `list_bon_consums_by_project`, `get/create_bon_consum`, `list_avize_by_project`, `get/create_aviz`, `list_invoices_by_project`, `create_invoice`, `get/create/update/delete_reservation`, `set_reservation_status`

**Aprovizionare** (`procurement`, `warehouse`, `materials`, `rfq`, `threeWayMatch`, `goodsReceipts`, `orders`): `get/create/update/delete_supplier`, `get_purchase_orders`, `get_purchase_order`, `create_purchase_order`, `receive_purchase_line`, `get_warehouse_locations`, `create_warehouse_location`, `get/record_stock_movement`, `get/create_stock_reservation`, `issue_stock_reservation`, `get/create/update/delete_material`, `get/create_material_consumption`, `list/get/create/delete_rfq`, `send_rfq_invitations`, `award_rfq`, `compare_rfq`, `list/get/create/delete_supplier_invoice`, `compute_three_way_match`, `approve/reject_supplier_invoice`, `record_supplier_invoice_payment`, `get/update_matching_thresholds`, `list/get/create/delete_goods_receipt`

**Financiar & documente & rapoarte** (`finance`, `documents`, `reports`, `pdf`, `pdfExport`, `exchangeRate`, `signatures`): `get_finance_overview/projects/insights/compliance`, `get_compliance_tasks`, `get_project_revenues`, `get_company_settings`, `get_invoices`, `get_finance_invoice`, `get_project_expenses`, `get_profit_loss_report`, `get/get_project/create/update/delete_document`, `get_document_file`, `get/create/update_document_category`, `update_document_categories_order`, `get_report_sources`, `run_report`, `list/save/delete_report_preset`, `generate_pdf_invoice/contract/offer`, `export_document_pdf`, `list_document_exports`, `refresh_exchange_rate`, `get_bnr_rate_history`, `list/add/delete_signature`

**Bibliotecă piese & recipes** (`libraries`, `recipes`): `get/create/update/delete_standard_part`, `get/create/update/delete_custom_part`, `promote_to_standard`, `get_recipes_overview`, `get_recipe`, `add/update/delete_recipe_item`

**Comunicare** (`email`, `chat`, `alerts`, `notifications`, `notificationPrefs`, `broadcasts`): `email_get/delete_account`, `email_sync_inbox`, `email_get_message`, `email_list_threads/folders/drafts`, `email_toggle_star`, `email_trash`, `email_download_attachment`, `email_delete_draft`, `email_get_unread_count`, `get_chat_unread_count`, `get_chat_conversations/messages`, `send_chat_message`, `mark_chat_read`, `create_chat_group`, `get_chat_group_details`, `update_chat_group`, `add/remove_chat_group_member(s)`, `set_chat_group_admin`, `get_alerts`, `create/update/acknowledge_alert`, `generate_system_alerts`, `get_user_notifications`, `mark_notification_read`, `mark_all_notifications_read`, `get/update_notification_prefs`, `admin_create/list/delete_broadcast`, `get_pending_broadcasts`, `dismiss_broadcast`

**Personal: task-uri, calendar, deplasări** (`personalTasks`, `calendar`, `deplasari`): `list_personal_tasks`, `get/delete_personal_task`, `list_tasks_assigned_by_me`, `list_assignable_users`, `list_mentions`, `mark_mention_read`, `mark_all_mentions_read`, `get_unread_mention_count`, `get_calendar_events`, `reschedule_calendar_event`, `build_calendar_ical`, `create/update/delete_personal_calendar_event`, `get_deplasari`, `create/update/delete_deplasare`, `list/record/delete_deplasare_payment`

**Instrumente: print, remote, shared storage** (`printing`, `remoteSupport`, `sharedStorage`): `list_printers`, `list_print_jobs`, `print_file`, `admin_print_config_get/set`, `get/create/update/delete_remote_endpoint`, `list_remote_sessions`, `create_quick_remote_support`, `start_remote_connection`, `end/cancel_remote_session`, `get_remote_viewer_config`, `launch_rustdesk_viewer`, `list/get/upload/delete_shared_file`

**Sistem, setup, mentenanță, AI** (`system`, `setup`, `appMaintenance`, `serverControl`, `demoSeed`, `ai`, `dashboard`, `search`, `bomImport`, `menu`, `tables`): `fs_exists`, `fs_read_text`, `extract_sldprt_thumbnail`, `updater_get_version`, `system_info`, `get_setup_state`, `complete_initial_setup`, `reopen_initial_setup`, `get/set_maintenance_mode`, `get_demo_step6_status`, `seed/clear_demo_step6`, `ai_ask`, `ai_search_documents`, `get_dashboard_data`, `global_search`, `read_excel_file`, `get/create/update/delete_menu_item`, `set_menu_item_availability`, `get/create/update/delete_restaurant_table`, `set_restaurant_table_status` *(meniu/restaurant = funcții latente, eliminate din frontend)*

---

## Funcții transversale (cross-page)

- **Paletă de comenzi** (Ctrl+K / Ctrl+/) — pagini + acțiuni globale.
- **Scurtături globale:** `g d` Dashboard, `g r` Proiecte, `g v` Vânzări, `g f` Financiar, `g p` Personal, `g c` Mesaje; `Ctrl+N` creează nou (în context), `Ctrl+,` Setări, `Ctrl+S` salvează, `Shift+?` panou scurtături.
- **Căutare globală** în titlebar (`global_search`) → navigare la proiect/client/material/document/stație/piesă.
- **Wizard primă conectare admin** (`AdminSetupGate` / `get_setup_state` / `complete_initial_setup`).
- **Mod mentenanță** (`get/set_maintenance_mode`) — doar adminii au acces; banner global.
- **Gate licență** — pre-login (`/api/license/tenant-state`) + per-tenant (`LicenseActivationPage`); schimbare parolă forțată (`must_change_password`).
- **Backup automat + manual** (`backup_run_now`, `AutoBackupPanel`).
- **Audit log** (`AuditLogPanel` / `get_user_activity_log`).
- **Notificări** native desktop + in-app cu polling; **broadcast popup** (anunțuri admin).
- **Help / About / Tutorial** (pagina Tutorial statică + `HelpPanel`, `AboutPanel`).
- **Export PDF** documente (facturi/contracte/oferte) + export Excel rapoarte + iCal calendar + ZIP arbore.
- **Mod viewer** (read-only) per pagină prin override de acces (`useViewerMode`).
- **Personalizare aspect** (temă, accent, densitate, presete layout, personalizare pe pagină) — în store-uri locale.
- **Tranziții de pagină** (View Transitions API) + skeletoane lazy-load.

---

## Statistici finale

| Metrică | Valoare |
|---|---|
| **Workspace-uri (multi-tab)** | 10 (+ Dashboard standalone) |
| **Sub-pagini de navigare** | 36 |
| **Pagini de detaliu / contextuale** | ~5 (detaliu lead, detaliu stație, arbore proiect, arhivă sursă, portal/RFQ public) |
| **Comenzi IPC înregistrate (unice)** | **411** |
| **Fișiere IPC backend** | 67 (`electron/ipc/*.ts`) |
| **Servicii backend** | ~80 (`electron/services/*.ts`) |
| **Butoane / acțiuni principale inventariate** | ~280+ |

### Top 5 pagini cu cele mai multe funcții / butoane

1. **Setări** (`/settings`) — 12 secțiuni, zeci de controale de aspect + 8 grupuri de acțiuni IPC (notificări, 2FA, email, fiscal, server, backup, anunțuri, mentenanță).
2. **Deplasări** (`/deplasari`) — CRUD complet + panou Plăți & buget cu conversie valutară, închidere delegație și transfer automat în Financiar.
3. **Arbore piese** (`/parts-tree`) — import CAD (Electron + web chunked), scanare, sortare/redenumire automată, ZIP, coduri furnizor, ștergere arbore.
4. **Oferte** (`/quotations`) — builder ofertă, trimitere email, decizie accept/refuz, conversie în contract, PDF, atașamente.
5. **Tichete service** (`/service-tickets`) — editare inline multi-câmp (status/severitate/SLA/asignare/cost), piese consumate, comentarii, creare.
