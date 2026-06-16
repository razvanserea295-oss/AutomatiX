# UI Rebuild — Master Function Inventory (Phase 0)

Generated 2026-06-13. Source of truth for the from-scratch Modern-SaaS rebuild: **no function below
may disappear**. One detailed manifest per page lives beside this file (`<PageName>.md`); the raw
apiCommand yardstick is `_apiCommand-baseline.txt`.

- **41 pages inventoried** · **254 distinct backend functions** captured (direct `apiCommand` + store
  actions + lazy helpers) · **13 heavy pages** (>800 lines).
- Navigation stays identical: Titlebar → Navbar (tier-1 = 9 workspaces) → WorkspacePanel (tier-2 subpages)
  → StatusBar. Workspace→subpage map is `src/config/workspaceNav.ts` (reused untouched).

## ⚠️ Cross-cutting rules for "zero functions removed"
The apiCommand superset check is **necessary but not sufficient** — backend access is frequently indirect:

1. **Store-indirect backend (page file has 0–few direct `apiCommand`):** ClientsPage, SalesHubPage,
   DashboardPage, KanbanPage, InventoryPage, AlertsPage, ManagerControlPage, ProjectsPage (partial),
   FinancePage (PDF). Rebuilt pages MUST call the same Zustand store actions (clientStore, salesStore,
   projectStore, materialStore, alertStore, handoffStore, dashboardStore). Stores are reused as-is.
2. **Raw REST (NOT apiCommand) — preserve the fetch/lib helpers:**
   - PartsTree CAD **chunked upload** (`upload-chunk`) + ZIP download REST endpoint.
   - Public pages: `GET /api/portal/:token` (CustomerPortal), `GET|POST /api/rfq/:token` (RfqResponse),
     `GET /api/download/latest` (Download).
   - AI service HTTP (`/chat`, `/health`, `/queue` via `@/api/ai`) — AIAssistantPage + Dashboard AI widget.
   - ForcePasswordChange HIBP check (pwnedpasswords.com), LoginPage LAN discovery (`/health`).
   - Base64 file upload/compress on LeadDetail, ProjectBriefings (500MB chunked), Maintenance, Tablet, Chat.
3. **Electron IPC (guarded lazy-require) — preserve:** SettingsPage (`server_start/stop/status`,
   `ai_service_start/stop/status`, `get_local_ip`), LoginPage (`creds_save`, `creds_clear`).
4. **PDF/export helpers (lib, not apiCommand):** `@/lib/downloadPdf` (`downloadInvoicePdf`,
   `generate_pdf_quotation`, `get_quotation_attachment`), ExportMenu, client-side CSV/XLSX/iCal blobs.
5. **Stub panels (localStorage/toast, NO backend) — keep the UI, know they don't persist server-side:**
   ClientsEnhancements (7 CRM cards), Kanban dock, Libraries/Documents/Email/Alerts enhancements,
   Procurement enhancements (3 of 4 belong to sibling routes), ManagerEnhancements (3 removed cards),
   ContractEnhancements & EngineeringEnhancements (imported-conceptually but NOT rendered).
6. **Native `prompt()`/`confirm()` to upgrade to real modals (rebuild win):** FisaTemplatesPage
   (clone/deactivate), ProjectBriefingsPage (reject/cancel), PersonalTasksPage (delete has no confirm),
   WarehousePage already replaced one — must not regress.
7. **Dormant/dead within page (don't resurrect, don't break):** RadialTreeNode/Edge (not mounted),
   PiecesTrackingTable (exported, unrendered in ProjectsPage).
8. **Master-detail — do NOT force ListReport/bento layout:** ProjectsPage, ProjectBriefingsPage, ChatPage,
   ServiceTicketsPage, QuotationsPage, UsersPage, LeadDetailPage, FinancePage.
9. **Layout wins (missing search/filter/sort to add cleanly):** ContractPage, WarehousePage, UsersPage,
   ServiceTicketsPage, QuotationsPage, MaintenancePage.

## Pages by workspace
Legend: `lines · cmds(captured backend fns) · modals · actions`.

### Sales (`sales-workspace` → Pipeline / Oferte / Clienți)
| Page | route | metrics | key note |
|---|---|---|---|
| ClientsPage | clients | 526 · 0dir · 2 · 14 | backend only via clientStore + AnafLookupButton; CRM cards localStorage |
| SalesHubPage | sales-hub | 430 · 0dir · 1 · 9 | pipeline via stores; stale-lead 7d client-computed; owner-filter mgr-gated |
| LeadDetailPage | sales-hub/:id | 640 · 8 · 5 · 14 | image-compress upload; sessionStorage auto-open edit |
| QuotationsPage | quotations | **870** · 12 · 5 · 14 | 2 cmds via lazy downloadPdf; send_quotation PDF bold-font bug |

### Projects & Contracts (`projects-contracts-workspace` → Proiecte / Contracte)
| Page | route | metrics | key note |
|---|---|---|---|
| ProjectsPage | projects | **1280** · 14 · 5 · 22 | master-detail; portal-token sharing; KPIs local |
| ContractPage | contracts | 521 · 8 · 3 · 14 | no search/filter (add); revisions; attachment download lib |

### Engineering (`engineering-workspace` → Briefing / Fișa proiectant / Template-uri / Arbore / De comandat / Biblioteci)
| Page | route | metrics | key note |
|---|---|---|---|
| FisaProiectantPage | fisa-proiectant | 655 · 6 · 5 · 15 | checklist + template create/update |
| PartsTreePage | parts-tree | **1407** · 9 · 5 · 19 | chunked CAD upload (REST) + ZIP; AI sort; reactive refetch |
| PiecesOrderingPage | parts-ordering | 531 · 8 · 1 · 9 | supplier-code catalog; kanban statuses |
| ProjectBriefingsPage | briefings | **970** · 11 · 4 · 22 | master-detail; 500MB chunked upload; prompt/confirm→modal |
| LibrariesPage | libraries | 275 · 9 · 4 · 10 | standard/custom parts; promote-to-standard; +100000 id offset |
| FisaTemplatesPage | fisa-templates | 205 · 5 · 1 · 4 | clone/deactivate via prompt/confirm; visual schema editor |

### Production (`production-workspace` → Producție / Service / Tichete + stations, tablet)
| Page | route | metrics | key note |
|---|---|---|---|
| KanbanPage | production | 700 · 10 · 0 · 14 | 2 direct + rest via project/pieceStore + PieceTimerButton |
| StationDetailPage | stations/:id | **862** · 13 · 2 · 15 | 3 inline create panels; focus-refresh |
| MaintenancePage | maintenance | **802** · 5 · 3 · 11 | costs cascade to P&L/Dashboard; RON-forced; base64 photos |
| ServiceTicketsPage | service-tickets | 553 · 10 · 1 · 14 | master-detail; update multiplexed over 5 fields |
| TabletProductionPage | tablet | 300 · 7 · 1 · 10 | touch kiosk; 1s clock; base64→create_document; signoff gate |

### Procurement (`procurement-workspace` → Depozit / Inventar / Achiziții + suppliers/goods-receipt/rfqs/3-way)
| Page | route | metrics | key note |
|---|---|---|---|
| WarehousePage | warehouse | 524 · 7 · 4 · 8 | tabs-only; low-stock/overdue banners; Disponibil capacity bar |
| InventoryPage | materials | 351 · 6 · 3 · 8 | 1 direct + materialStore CRUD; viewer hides mutate |
| ProcurementWorkspacePage | purchase-orders(+suppliers/goods-receipt/rfqs/3-way) | **956** · 10 · 4 · 22 | parked recepții flow must survive; only SupplierToolsBar mounted |

### Finance (`finance-workspace` → Financiar / Documente / Rapoarte)
| Page | route | metrics | key note |
|---|---|---|---|
| FinancePage | finance | **915** · 12 · 4 · 17 | invoices/expenses/P&L; per-row PDF; CSV; cross-tab refresh |
| DocumentsPage | documents | 742 · 10 · 3 · 16 | categories reorder; ZIP/OCR are placeholders |
| ReportsPage | reports | 340 · 5 · 0 · 11 | ad-hoc report builder; client xlsx; between-op missing 2nd input |

### Instrumente (`instrumente-workspace` → Tutorial / Email / Mesaje / AI / Alerte)
| Page | route | metrics | key note |
|---|---|---|---|
| TutorialPage | tutorial | 717 · 0 · 0 · 7 | fully static; content arrays + search + deep-link nav |
| EmailPage | email | 497 · 9 · 3 · 19 | 3-pane IMAP/SMTP; mode-switched right pane |
| ChatPage | chat | **963** · 11 · 6 · 22 | dual polling 5s/3s; base64 files; read receipts; group tiers |
| AIAssistantPage | ai | 530 · 0api · 0 · 6 | talks to Rust ai-service over HTTP; localStorage history 7d TTL |
| AlertsPage | alerts | 268 · 1 · 2 · 9 | acknowledge_alert direct; rest via alertStore thunks |

### Personal (`personal-workspace` → Task-uri / Calendar / Deplasări)
| Page | route | metrics | key note |
|---|---|---|---|
| PersonalTasksPage | tasks | **1278** · 13 · 4 · 18 | all sub-components in-file; update/delete multi-purpose; no delete confirm |
| CalendarPage | calendar | **862** · 6 · 1 · 15 | date-level; drag-drop reschedule; iCal export; conflict detector |
| DeplasariPage | deplasari | **1543** · 7 · 5 · 18 | payments ledger; close→auto-post to Financiar; RON/EUR+BNR+diurnă |

### Sistem (`sistem-workspace` → Utilizatori / Sesiuni / Setări) — admin-gated
| Page | route | metrics | key note |
|---|---|---|---|
| UsersPage | users | 483 · 7 · 2 · 10 | admin-only; add search+role filter (win); 2 separate save zones |
| UserSessionsPage | sessions | 450 · 4 · 1 · 5 | admin-only; 5s polling; 2FA card localStorage |
| SettingsPage | settings | **1418** · 22 · 3 · 28 | 13 role-gated sections; 15 apiCommand + 7 Electron IPC |

### Standalone & gates
| Page | route | metrics | key note |
|---|---|---|---|
| DashboardPage | dashboard | 629 · 13 · 1 · 14 | all via stores + AI widget HTTP; per-domain access gating must survive |
| ManagerControlPage | manager-control | 400 · 5 · 1 · 12 | handoff via handoffStore; 3 removed enhancement cards |
| LoginPage | login | 414 · 0api · 3 · 19 | onLogin prop + authStore + IPC creds; LAN discovery; retired SSO/biometric kept |
| ForcePasswordChangePage | force-password | 191 · 1 · 0 · 8 | change_password via authStore; HIBP fetch; history localStorage |

### Public (auth-bypassed)
| Page | route | metrics | key note |
|---|---|---|---|
| CustomerPortalPage | portal/:token | 285 · 0 · 0 · 0 | raw GET /api/portal/:token; read-only |
| RfqResponsePage | rfq/:token | 226 · 0 · 1 · 11 | raw GET/POST /api/rfq/:token; offer vs decline bodies |
| DownloadPage | download | 168 · 0 · 0 · 1 | raw GET /api/download/latest + .exe link |

## Heavy pages (rebuild last, copy data/handler layer verbatim, redo only JSX)
DeplasariPage(1543), SettingsPage(1418), PartsTreePage(1407), PersonalTasksPage(1278), ProjectsPage(1280),
ProjectBriefingsPage(970), ChatPage(963), ProcurementWorkspacePage(956), FinancePage(915), QuotationsPage(870),
CalendarPage(862), StationDetailPage(862), MaintenancePage(802).
