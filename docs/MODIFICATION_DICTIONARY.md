# Dicționar de modificări — Automatix

Acest fișier este vocabularul comun pentru a comunica modificări precise asupra
funcționalităților adăugate prin bundle-urile *Enhancements.tsx*.

## 1. Format comandă

```
[VERB] [PAGINĂ] > [CARD] > [CÂMP/ELEMENT] : [VALOARE/INSTRUCȚIUNE]
```

Exemple:
- `MODIFICĂ Dashboard > Comparație temporală > intervalele : adaugă "trimestrial"`
- `ASCUNDE Inventar > Audit stoc (cycle count)`
- `REDENUMIȘTE Finance > Cashflow forecast > "Cashflow forecast" : "Prognoză numerar"`
- `ELIMINĂ Email > Schedule send`
- `MUTĂ Projects > Risk register : înainte de Health score`

## 2. Verbe acceptate

| Verb         | Înțeles                                                      |
|--------------|--------------------------------------------------------------|
| `ADAUGĂ`     | Element nou în card / câmp nou în formular                    |
| `ELIMINĂ`    | Șterge complet (atenție: ireversibil dacă nu confirmi)        |
| `ASCUNDE`    | Marchează ca ne-vizibil (păstrează codul)                     |
| `AFIȘEAZĂ`   | Re-activează un card ascuns                                   |
| `MODIFICĂ`   | Schimbă comportament / valori implicite                       |
| `REDENUMIȘTE`| Schimbă titlu / etichetă                                      |
| `MUTĂ`       | Schimbă ordinea cardurilor în pagină                          |
| `EXTINDE`    | Adaugă funcționalitate nouă în card-ul existent               |
| `CONECTEAZĂ` | Leagă cardul de o sursă de date reală (înlocuiește stub-ul)   |
| `STILIZEAZĂ` | Modificări vizuale (culori, spațiere, font)                   |
| `VALIDEAZĂ`  | Adaugă reguli de validare pe câmpuri                          |
| `EXPORTĂ`    | Adaugă/personalizează formate de export                       |

## 3. Pagini și carduri disponibile

> Toate cardurile sunt în fișiere `*Enhancements.tsx` per pagină. Pentru fiecare
> pagină mai jos sunt listate cardurile + identificatorii lor (numele componentei
> React) astfel încât să poți spune exact ce vrei modificat.

### 3.1 DashboardPage
File: `src/pages/DashboardEnhancements.tsx`

| Nume card                           | Componentă React        | LocalStorage key                    |
|-------------------------------------|-------------------------|-------------------------------------|
| Personalizare tablou                | `LayoutControls`        | `promix_dash_layout_v1`             |
| Comparație temporală                | `ComparisonSection`     | `promix_dash_compare_v1`            |
| Praguri & alarme KPI                | `ThresholdsSection`     | `promix_dash_thresholds_v1`         |
| Acțiuni rapide                      | `QuickActionsSection`   | —                                   |
| Predicție AI luna curentă           | `ForecastSection`       | —                                   |
| Snapshot zilnic                     | `SnapshotSection`       | —                                   |
| Drill-down                          | `DrillDownSection`      | —                                   |

### 3.2 LoginPage
File: `src/pages/LoginEnhancements.tsx`

| Card                  | Componentă               | LS key                     |
|-----------------------|--------------------------|----------------------------|
| Lockout badge         | `LockoutBadge`           | `promix_login_fails_v1`    |
| 2FA TOTP              | `TotpField`              | `promix_2fa_users_v1`      |
| SSO buttons           | `SsoButtons`             | —                          |
| Auto-discovery LAN    | `LanDiscovery`           | —                          |
| Biometric login       | `BiometricButton`        | —                          |
| Sesiuni recente       | `SessionsPanel`          | `promix_login_sessions_v1` |
| Reset parolă          | `ResetPasswordPanel`     | —                          |

### 3.3 FinancePage (tab "Extra")
File: `src/pages/finance/FinanceEnhancements.tsx`

| Card                       | Componentă                | LS key                                |
|----------------------------|---------------------------|---------------------------------------|
| Facturi recurente          | `RecurringInvoicesCard`   | `promix_finance_recurring_v1`         |
| Cashflow forecast          | `CashflowForecastCard`    | `promix_cashflow_v1`                  |
| Memente plată              | `ReminderQueueCard`       | `promix_finance_reminders_v1`         |
| Reconciliere bancară       | `BankReconCard`           | —                                     |
| Note credit / Storno       | `CreditNoteCard`          | `promix_finance_credits_v1`           |
| Rate de schimb             | `CurrencyRatesCard`       | `promix_finance_rates_v1`             |
| Drill profit per piesă     | `ProfitDrillCard`         | `promix_finance_profit_drill_v1`      |

### 3.4 InventoryPage
File: `src/pages/inventory/InventoryEnhancements.tsx`

| Card                       | Componentă               | LS key                              |
|----------------------------|--------------------------|-------------------------------------|
| Scanner cod / QR           | `BarcodeScannerCard`     | —                                   |
| Loturi & expirări          | `LotTrackerCard`         | `promix_inventory_lots_v1`          |
| Analiză ABC                | `AbcAnalysisCard`        | —                                   |
| Comenzi sugerate           | `PoSuggestionsCard`      | —                                   |
| Audit stoc (cycle count)   | `CycleCountCard`         | —                                   |
| Foto / fișe tehnice        | `AttachmentsCard`        | `promix_inventory_attach_v1`        |
| Materiale alternative      | `SubstitutesCard`        | `promix_inventory_subs_v1`          |

### 3.5 KanbanPage
File: `src/pages/kanban/KanbanEnhancements.tsx`

| Card             | Componentă                | LS key                                       |
|------------------|---------------------------|----------------------------------------------|
| WIP limits       | inline (`SectionCard`)    | `promix_kanban_<scope>_v1`                   |
| Swimlanes        | inline                    | (același)                                    |
| Card aging       | inline                    | (același)                                    |
| Auto-archive     | inline                    | (același)                                    |
| Filtre salvate   | `QuickFilterChips`        | `promix_qfilter_kanban-<scope>`              |

### 3.6 ProjectsPage
File: `src/pages/projects/ProjectsEnhancements.tsx`

| Card                  | Componentă               | LS key                                        |
|-----------------------|--------------------------|-----------------------------------------------|
| Health score          | `HealthScoreCard`        | —                                             |
| Cronologie (Gantt)    | `GanttCard`              | `promix_gantt_<id>_v1`                        |
| Milestones            | `MilestonesCard`         | `promix_milestones_<id>_v1`                   |
| Risk register         | `RiskRegisterCard`       | `promix_risks_<id>_v1`                        |
| Burndown              | `BurndownCard`           | `promix_burndown_<id>_v1`                     |
| Versiune contract     | `ContractPointerCard`    | `promix_contract_<id>_v1`                     |
| Șabloane proiect      | `TemplatesCard`          | `promix_project_templates_v1`                 |

### 3.7 ForcePasswordChangePage
File: `src/pages/auth/PasswordChangeEnhancements.tsx`

| Card / element            | Componentă                       | LS key                                    |
|---------------------------|----------------------------------|-------------------------------------------|
| Strength meter            | inline                           | —                                         |
| Verificare istoric        | `useLocalStorage`                | `promix_pwd_history_<username>`           |
| Generator parolă          | `onGenerate`                     | —                                         |
| HIBP probe                | `checkHibp`                      | —                                         |
| Skip cu aprobare admin    | `requestSkip`                    | —                                         |

### 3.8 ManagerControlPage
File: `src/pages/manager/ManagerEnhancements.tsx`

| Card                      | Componentă                  | LS key                              |
|---------------------------|-----------------------------|-------------------------------------|
| Trend anomalii (30 zile)  | `TrendChartCard`            | —                                   |
| Bulk acknowledge          | `BulkAckCard`               | —                                   |
| Reguli auto-escalation    | `EscalationRulesCard`       | `promix_manager_rules_v1`           |
| SLA per tip predare       | `SlaRulesCard`              | `promix_manager_sla_v1`             |
| Reasignare predare        | `ReassignCard`              | —                                   |
| Anomalie manuală          | `ManualAnomalyCard`         | `promix_manager_manual_anom_v1`     |
| Raport incidente          | `IncidentReportCard`        | —                                   |

### 3.9 PartsTreePage
File: `src/pages/parts-tree/PartsTreeEnhancements.tsx`

| Card                    | Componentă                 | LS key                                      |
|-------------------------|----------------------------|---------------------------------------------|
| Diff versiuni           | `VersionDiffCard`          | `promix_partstree_snapshots_<pid>_v1`       |
| Roll-up cost ramură     | `BranchCostCard`           | —                                           |
| Estimare ore producție  | `HourEstimateCard`         | —                                           |
| Detectare duplicate     | `DuplicatesCard`           | —                                           |
| Adnotări DXF            | `DxfMarkupCard`            | `promix_partstree_markup_<pid>_v1`          |
| Bill of Materials       | `BomExportCard`            | —                                           |
| Import ZIP              | `ZipImportCard`            | —                                           |

### 3.10 AIAssistantPage
File: `src/pages/ai/AIAssistantEnhancements.tsx`

| Card                       | Componentă               | LS key                          |
|----------------------------|--------------------------|---------------------------------|
| Voice input                | `VoiceInputCard`         | —                               |
| Prompts rapide             | `QuickPromptsCard`       | `promix_ai_quick_prompts_v1`    |
| Conversații pinned         | `PinnedCard`             | `promix_ai_pinned_v1`           |
| Surse / citate             | `CitationsCard`          | —                               |
| Consum tokeni              | `TokenTrackerCard`       | `promix_ai_tokens_v1`           |
| Context multi-document     | `MultiDocCard`           | —                               |
| Export Markdown / PDF      | `ExportCard`             | —                               |

### 3.11 AlertsPage
File: `src/pages/alerts/AlertsEnhancements.tsx`

| Card                  | Componentă                | LS key                              |
|-----------------------|---------------------------|-------------------------------------|
| Subscripții pe tip    | `SubscriptionsCard`       | `promix_alerts_subs_v1`             |
| Bulk acknowledge      | `BulkAckCard`             | —                                   |
| Snooze individual     | `PerAlertSnoozeCard`      | `promix_alerts_snoozes_v1`          |
| Search full-text      | `FullTextSearchCard`      | —                                   |
| Mute notificări       | `MuteWindowCard`          | `promix_alerts_mute_v1`             |
| Lanț de escalare      | `EscalationChainCard`     | `promix_alerts_chains_v1`           |
| Email digest          | `EmailDigestCard`         | `promix_alerts_digest_v1`           |

### 3.12 UsersPage
File: `src/pages/auth/UsersEnhancements.tsx`

| Card                   | Componentă                  | LS key                                |
|------------------------|-----------------------------|---------------------------------------|
| Bulk import CSV        | `BulkImportCard`            | —                                     |
| Activitate login       | `LoginActivityCard`         | `promix_login_sessions_v1`            |
| Force logout           | `ForceLogoutCard`           | —                                     |
| Acces temporar         | `TemporaryAccessCard`       | `promix_user_expiry_v1`               |
| Echipe                 | `TeamsCard`                 | `promix_user_teams_v1`                |
| Șabloane permisiuni    | `PermissionTemplatesCard`   | `promix_user_perm_templates_v1`       |
| 2FA enforcement        | `TwoFAEnforcementCard`      | `promix_user_2fa_policy_v1`           |

### 3.13 CalendarPage
File: `src/pages/calendar/CalendarEnhancements.tsx`

| Card                          | Componentă               | LS key                                  |
|-------------------------------|--------------------------|-----------------------------------------|
| Drag & resize hint            | `DragResizeHintCard`     | —                                       |
| Evenimente recurente          | `RecurringEventsCard`    | `promix_calendar_recurring_v1`          |
| Detectare conflicte           | `ConflictDetectorCard`   | —                                       |
| Day view (sloturi 30 min)     | `DayViewCard`            | —                                       |
| Sărbători legale RO 2026      | `HolidaysCard`           | —                                       |
| Sync Google / Outlook         | `ExternalSyncCard`       | —                                       |
| Export per resursă            | `ExportPerResourceCard`  | —                                       |

### 3.14 ChatPage
File: `src/pages/chat/ChatEnhancements.tsx`

| Card                     | Componentă                 | LS key                                          |
|--------------------------|----------------------------|-------------------------------------------------|
| Reacții emoji            | `ReactionsCard`            | —                                               |
| Răspunsuri în fir        | `ThreadedRepliesCard`      | `promix_chat_thread_mode_v1`                    |
| Autocomplete @mențiuni   | `MentionAutocompleteCard`  | `promix_chat_known_users_v1`                    |
| Mesaje pinned            | `PinnedCard`               | `promix_chat_pins_<conv>_v1`                    |
| Edit / delete cu istoric | `EditHistoryCard`          | —                                               |
| Forward mesaj            | `ForwardCard`              | —                                               |
| Search global            | `GlobalSearchCard`         | —                                               |
| Voice / video call       | `VoiceVideoCallCard`       | —                                               |

### 3.15 FisaProiectantPage
File: `src/pages/checklist/FisaProiectantEnhancements.tsx`

| Card                        | Componentă                | LS key                              |
|-----------------------------|---------------------------|-------------------------------------|
| Print A4                    | `PrintCard`               | —                                   |
| Semnături per fază          | `SignOffCard`             | `promix_fisa_signs_v1`              |
| Foto evidență               | `PhotoEvidenceCard`       | `promix_fisa_photos_v1`             |
| Șabloane per produs         | `TemplatesCard`           | `promix_fisa_templates_v1`          |
| Comentarii per fază         | `PhaseCommentsCard`       | `promix_fisa_comments_v1`           |
| Progres ponderat            | `WeightedProgressCard`    | —                                   |
| Bottleneck detector         | `BottleneckCard`          | —                                   |

### 3.16 ClientsPage
File: `src/pages/clients/ClientsEnhancements.tsx`

| Card                   | Componentă                | LS key                                |
|------------------------|---------------------------|---------------------------------------|
| Import CSV             | `CsvImportCard`           | —                                     |
| Hartă clienți          | `GeoMapCard`              | —                                     |
| Timeline interacțiuni  | `TimelineCard`            | `promix_clients_timeline_v1`          |
| Credit score (manual)  | `CreditScoreCard`         | `promix_clients_credit_v1`            |
| Tag-uri                | `TagsCard`                | `promix_clients_tags_v1`              |
| Email blast            | `EmailBlastCard`          | —                                     |
| Aniversări             | `AnniversariesCard`       | `promix_clients_anniversaries_v1`     |

### 3.17 ContractPage
File: `src/pages/contract/ContractEnhancements.tsx`

| Card                         | Componentă                | LS key                                       |
|------------------------------|---------------------------|----------------------------------------------|
| Bibliotecă șabloane          | `TemplateLibraryCard`     | `promix_contract_templates_v1`               |
| Auto-numerotare              | `AutoNumberingCard`       | `promix_contract_numbering_v1`               |
| E-signature                  | `ESignatureCard`          | —                                            |
| Reminder reînnoire           | `RenewalRemindersCard`    | `promix_contract_reminders_<id>_v1`          |
| Comparare revizii            | `RevisionCompareCard`     | —                                            |
| Anexe / acte adiționale      | `AddendaCard`             | `promix_contract_addenda_v1`                 |
| Link public watermarked      | `PublicLinkCard`          | —                                            |

### 3.18 DeplasariPage
File: `src/pages/deplasari/DeplasariEnhancements.tsx`

| Card                         | Componentă             | LS key                                  |
|------------------------------|------------------------|-----------------------------------------|
| Diurne preset                | `PerDiemCard`          | `promix_deplasare_per_diem_v1`          |
| Foto bonuri / chitanțe       | `ReceiptsCard`         | `promix_deplasare_receipts_v1`          |
| Workflow aprobare            | `ApprovalCard`         | `promix_deplasare_approvals_v1`         |
| Calculator km                | `MileageCard`          | —                                       |
| Rută pe hartă                | `MapRouteCard`         | —                                       |
| Export către finanțe         | `FinanceExportCard`    | —                                       |
| Blocare în calendar          | `CalendarBlockCard`    | —                                       |

### 3.19 DocumentsPage
File: `src/pages/documents/DocumentsEnhancements.tsx`

| Card                    | Componentă             | LS key                                  |
|-------------------------|------------------------|-----------------------------------------|
| Search full-text        | `FullTextSearchCard`   | —                                       |
| Versiuni document       | `VersioningCard`       | `promix_documents_versions_v1`          |
| Link share cu expirare  | `ShareLinkCard`        | `promix_documents_share_v1`             |
| OCR scanate             | `OcrPlaceholderCard`   | —                                       |
| Auto-categorizare AI    | `AutoCategorizeCard`   | —                                       |
| Bulk download ZIP       | `ZipDownloadCard`      | —                                       |
| Reminder expirare       | `ExpiryRemindersCard`  | `promix_documents_expiry_v1`            |
| Watermark la download   | `WatermarkCard`        | `promix_documents_watermark_v1`         |

### 3.20 EmailPage
File: `src/pages/email/EmailEnhancements.tsx`

| Card                  | Componentă             | LS key                            |
|-----------------------|------------------------|-----------------------------------|
| Template-uri răspuns  | `TemplatesCard`        | `promix_email_templates_v1`       |
| Schedule send         | `ScheduleSendCard`     | —                                 |
| Mail merge            | `MailMergeCard`        | —                                 |
| Auto-link la proiect  | `ProjectAutoLinkCard`  | —                                 |
| Read receipts         | `ReadReceiptsCard`     | `promix_email_receipts_v1`        |
| Reguli / filtre       | `RulesCard`            | `promix_email_rules_v1`           |
| Manager semnături     | `SignaturesCard`       | `promix_email_signatures_v1`      |

### 3.21 EngineeringTreePage
File: `src/pages/engineering/EngineeringEnhancements.tsx`

| Card                       | Componentă             | LS key                                |
|----------------------------|------------------------|---------------------------------------|
| Where used                 | `WhereUsedCard`        | —                                     |
| Cost rollup                | `CostRollupCard`       | —                                     |
| Diff versiuni              | `VersionDiffCard`      | —                                     |
| Replace cascade            | `CascadeReplaceCard`   | —                                     |
| Approval workflow          | `ApprovalCard`         | `promix_engineering_approvals_v1`     |
| 3D preview                 | `ThreeDPreviewCard`    | —                                     |
| Export STEP / IGES         | `ExportStepCard`       | —                                     |

### 3.22 LibrariesPage
File: `src/pages/libraries/LibrariesEnhancements.tsx`

| Card                       | Componentă               | LS key                                  |
|----------------------------|--------------------------|-----------------------------------------|
| Tag-uri multi-dimensional  | `TagsCard`               | `promix_libraries_tags_v1`              |
| Drag-from-library          | `DragHintCard`           | —                                       |
| Cele mai folosite          | `UsageStatsCard`         | —                                       |
| Import bibliotecă CAD      | `CadImportCard`          | —                                       |
| Ierarhie categorii         | `CategoryHierarchyCard`  | `promix_libraries_categories_v1`        |
| Versionare componente      | `VersioningCard`         | —                                       |
| Bulk export                | `BulkExportCard`         | —                                       |

### 3.23 MaintenancePage
File: `src/pages/maintenance/MaintenanceEnhancements.tsx`

| Card                        | Componentă               | LS key                                  |
|-----------------------------|--------------------------|-----------------------------------------|
| Mentenanță predictivă       | `PredictiveCard`         | `promix_maintenance_predictive_v1`      |
| Kit piese de schimb         | `SparePartsKitCard`      | `promix_maintenance_kits_v1`            |
| QR per stație               | `QrCard`                 | —                                       |
| Rută zilnică tehnician      | `RouteCard`              | —                                       |
| TCO per stație              | `CostRollupCard`         | —                                       |
| Foto before / after         | `BeforeAfterCard`        | `promix_maintenance_photos_v1`          |
| Contracte mentenanță        | `ServiceContractCard`    | `promix_maintenance_contracts_v1`       |

### 3.24 ProcurementWorkspacePage
File: `src/pages/procurement/ProcurementEnhancements.tsx`

| Card                       | Componentă             | LS key                                |
|----------------------------|------------------------|---------------------------------------|
| Supplier scorecard         | `ScorecardCard`        | `promix_procurement_scores_v1`        |
| Auto-RFQ din low-stock     | `AutoRfqCard`          | —                                     |
| Compară oferte             | `CompareOffersCard`    | —                                     |
| Approved Vendor List       | `AvlCard`              | `promix_procurement_avl_v1`           |
| Lead time tracker          | `LeadTimeCard`         | `promix_procurement_lead_v1`          |
| Istoric negocieri          | `NegotiationCard`      | `promix_procurement_negotiations_v1`  |
| Plan procurement           | `PoPlannerCard`        | —                                     |

### 3.25 RfqsPage
File: `src/pages/procurement/RfqsEnhancements.tsx`

| Card                  | Componentă             | LS key                            |
|-----------------------|------------------------|-----------------------------------|
| Trimite multi-furnizor| `MultiSendCard`        | —                                 |
| Matrice comparare     | `CompareMatrixCard`    | —                                 |
| Award winner          | `AwardCard`            | —                                 |
| Template-uri RFQ      | `TemplateLibraryCard`  | `promix_rfqs_templates_v1`        |
| Reminder deadline     | `DeadlineReminderCard` | `promix_rfq_reminder_hours_v1`    |
| Public response link  | `PublicLinkCard`       | —                                 |

### 3.26 GoodsReceiptPage
File: `src/pages/procurement/GoodsReceiptEnhancements.tsx`

| Card                       | Componentă               | LS key                                  |
|----------------------------|--------------------------|-----------------------------------------|
| Quality checklist          | `QualityChecklistCard`   | `promix_goodsreceipt_checklist_v1`      |
| Foto recepție              | `ReceptionPhotoCard`     | `promix_goodsreceipt_photos_v1`         |
| Recepție parțială          | `PartialReceiptCard`     | `promix_goodsreceipt_partial_v1`        |
| Print bon recepție         | `PrintBonCard`           | —                                       |
| Auto-update inventar       | `AutoUpdateInventoryCard`| —                                       |
| Raport discrepanțe         | `DiscrepancyReportCard`  | `promix_goodsreceipt_discrepancies_v1`  |

### 3.27 ThreeWayMatchPage
File: `src/pages/procurement/ThreeWayMatchEnhancements.tsx`

| Card                       | Componentă             | LS key                              |
|----------------------------|------------------------|-------------------------------------|
| Reguli auto-match          | `AutoMatchRulesCard`   | `promix_3wm_rules_v1`               |
| Toleranță globală          | `ToleranceCard`        | `promix_3wm_global_tolerance_v1`    |
| Workflow excepții          | `ApprovalWorkflowCard` | `promix_3wm_exceptions_v1`          |
| Conversie valutară         | `CurrencyConversionCard`| —                                  |
| Audit log                  | `AuditLogCard`         | `promix_3wm_audit_v1`               |
| Export raport match        | `ExportReportCard`     | —                                   |

### 3.28 Pagini fără bundle încă (urmează)

Aceste pagini au listă de funcții în [PAGE_IMPROVEMENTS.md](PAGE_IMPROVEMENTS.md)
și vor primi un bundle similar la cerere:

- **ReportsPage** (rapoarte)
- **SalesHubPage** (vânzări)
- **QuotationsPage** (oferte)
- **ServiceTicketsPage** (tichete service)
- **SettingsPage** (setări)
- **StationsListPage** (stații)
- **StationDetailPage** (detaliu stație)
- **TabletProductionPage** (tabletă)
- **PersonalTasksPage** (task-uri personale)
- **TimeTrackingPage** (pontaje)
- **WarehousePage** (depozit)
- **CustomerPortalPage** (portal client)
- **RfqResponsePage** (răspuns RFQ)

Pentru a continua: spune `CONTINUĂ Reports` (sau orice altă pagină) și voi
crea bundle-ul lipsă.

## 4. Vocabular pentru elementele din interiorul cardurilor

Cardurile au structuri repetitive. Folosește aceste cuvinte pentru a referi
părți specifice:

| Element                    | Termen oficial            |
|----------------------------|---------------------------|
| Inputul mic (text)         | `câmp`                    |
| Lista derulantă (`<select>`)| `selector`               |
| Buton primar               | `acțiune principală`      |
| Buton ghost / outline      | `acțiune secundară`       |
| Icon trash mic             | `șterge inline`           |
| Toate liniile dintr-un tabel| `rânduri`                |
| Antet card (titlu + icon)  | `header card`             |
| Descriere sub titlu        | `subtitlu`                |
| Mesaj cu lipsă date        | `empty state`             |
| Toast verde / roșu         | `notificare`              |
| Modal pe lateral           | `panel lateral`           |
| Modal centrat              | `dialog`                  |

## 5. Modificări frecvente — exemple gata-formulate

```
ELIMINĂ Dashboard > Predicție AI luna curentă
   (motivul: nu vrem AI pe această pagină)

REDENUMIȘTE Inventory > Materiale alternative > "Materiale alternative" : "Substituenți"

EXTINDE Finance > Rate de schimb : adaugă moneda CHF pe lângă EUR/USD

CONECTEAZĂ Manager > Reasignare predare : la endpoint backend
   "POST /api/handoffs/<id>/reassign" cu payload { username }

ASCUNDE Login > SSO buttons (până configurăm OAuth)

MUTĂ Projects > Health score : sub Burndown

VALIDEAZĂ Email > Mail merge > câmpul recipients : trebuie să conțină
   minimum "nume,email" pe fiecare linie, altfel afișează eroare

STILIZEAZĂ Alerts > toate cardurile : crește padding-ul header-ului la py-3
```

## 6. Cum aplic modificarea

Când scrii o comandă, voi face exact 3 lucruri:
1. Confirm pagina + cardul vizat
2. Aplic modificarea (fișier + linie)
3. Rulez `npx tsc --noEmit` și raportez orice eroare

Dacă comanda este ambiguă, voi cere o singură clarificare scurtă (max 1
întrebare).

## 7. Ce NU pot face fără confirmare suplimentară

- Schimbări în fișiere care nu sunt `*Enhancements.tsx` (ex: modific direct
  `DashboardPage.tsx` în logica existentă)
- Migrarea datelor din localStorage (le pot pierde)
- Modificări care necesită backend nou (creare endpoint, schemă DB)

Pentru oricare dintre acestea îți voi spune explicit "necesită confirmare" și
voi propune planul.
