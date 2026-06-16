# Automatix — Inventar pagini & funcții

_Generat 2026-06-16 din sursă (PAGE_TITLES + registry-ul de comenzi `ipcRegister`)._

## 1. PAGINI

### Workspaces (spații de lucru)
- Vânzări
- Proiectare
- Producție
- Aprovizionare
- Financiar
- Proiecte & Contracte
- Instrumente
- Personal
- Sistem
- Restaurant

### Pagini de conținut
- Dashboard
- Proiecte
- Proiect
- Clienți
- Producție
- Creare
- Stații
- Stație
- Inventar
- Furnizori
- Comenzi
- Recepții
- Documente
- Financiar
- Alerte
- AI
- Utilizatori
- Setări
- Operații
- Arbore
- De comandat
- Briefing
- Template-uri fișe
- Contracte
- Proiectare
- Biblioteci
- Depozit
- Deplasări
- Fișa
- Vânzări
- Mesaje
- Email
- Service
- Meniu
- Comenzi
- Rețete
- Oferte
- Calendar
- Pontaj
- Tichete service
- 3-way match
- RFQ
- Rapoarte
- Task-urile mele
- Recepție marfă
- Stație tabletă
- Tutorial
- Birou control
- Rezervări
- Mese

_Total pagini definite: 60_

## 2. FUNCȚII (comenzi backend implementate)

_Total funcții unice: 291_

### activityLog
- get_activity_actors
- get_user_activity_log

### ai
- ai_ask
- ai_search_documents

### alerts
- acknowledge_alert
- create_alert
- generate_system_alerts
- get_alerts
- update_alert

### anaf
- anaf_lookup_cui

### appMaintenance
- get_maintenance_mode
- set_maintenance_mode

### auth
- change_password
- cleanup_sessions
- disable_2fa
- enable_2fa_confirm
- enable_2fa_start
- login
- login_verify_2fa
- logout
- validate_session

### bomImport
- read_excel_file

### broadcasts
- admin_create_broadcast
- admin_delete_broadcast
- admin_list_broadcasts
- dismiss_broadcast
- get_pending_broadcasts

### calendar
- build_calendar_ical
- create_personal_calendar_event
- delete_personal_calendar_event
- get_calendar_events
- reschedule_calendar_event
- update_personal_calendar_event

### chat
- add_chat_group_members
- create_chat_group
- get_chat_conversations
- get_chat_group_details
- get_chat_messages
- get_chat_unread_count
- mark_chat_read
- remove_chat_group_member
- send_chat_message
- set_chat_group_admin
- update_chat_group

### checklist
- create_checklist
- get_checklist_by_project
- get_checklists
- update_checklist

### contracts
- add_contract_attachment
- create_contract
- create_contract_revision
- delete_contract_attachment
- get_contract
- get_contract_attachment
- get_contract_by_project
- get_contract_revisions
- get_contracts
- get_section_templates
- list_contract_attachments
- update_contract

### dashboard
- get_dashboard_data

### demoSeed
- clear_demo_step6
- get_demo_step6_status
- seed_demo_step6

### deplasari
- create_deplasare
- delete_deplasare
- delete_deplasare_payment
- get_deplasari
- list_deplasare_payments
- record_deplasare_payment
- update_deplasare

### documents
- create_document
- create_document_category
- delete_document
- get_document_categories
- get_document_file
- get_documents
- get_project_documents
- update_document
- update_document_categories_order
- update_document_category

### engineering
- add_engineering_bom_item
- create_engineering_node
- delete_engineering_bom_item
- delete_engineering_node
- get_engineering_bom
- get_engineering_tree
- get_material_needs
- move_engineering_node
- release_engineering_tree
- update_engineering_node

### exchangeRate
- get_bnr_rate_history
- refresh_exchange_rate

### fisaTemplates
- clone_fisa_template
- create_fisa_template
- delete_fisa_template
- get_fisa_template
- get_fisa_templates
- update_fisa_template

### goodsReceipts
- create_goods_receipt
- delete_goods_receipt
- get_goods_receipt
- list_goods_receipts

### libraries
- create_custom_part
- create_standard_part
- delete_custom_part
- delete_standard_part
- get_custom_parts
- get_standard_parts
- promote_to_standard
- update_custom_part
- update_standard_part

### maintenance
- create_piece_service
- delete_piece_service
- get_piece_service
- list_piece_services
- update_piece_service

### materials
- create_material
- create_material_consumption
- delete_material
- get_material_consumptions
- get_materials
- update_material

### menu
- create_menu_item
- delete_menu_item
- get_menu_item
- get_menu_items
- set_menu_item_availability
- update_menu_item

### notificationPrefs
- get_notification_prefs
- update_notification_prefs

### notifications
- get_user_notifications
- mark_all_notifications_read
- mark_notification_read

### orders
- create_restaurant_order
- delete_restaurant_order
- get_restaurant_order
- get_restaurant_orders
- update_restaurant_order_status

### partsTree
- delete_parts_tree_node
- get_project_parts_tree
- import_scanned_parts
- scan_parts_folder
- wipe_project_parts_tree

### pdf
- generate_pdf_contract
- generate_pdf_invoice
- generate_pdf_offer

### pieces
- bulk_import_project_pieces
- create_piece_material_requirement
- create_project_piece
- create_project_stage_custom
- delete_piece_material_requirement
- delete_project_piece
- get_project_pieces
- get_project_stages_custom
- list_piece_material_requirements
- update_project_piece
- update_project_stage_custom

### piecesOrdering
- cancel_piece_order
- create_piece_order_request
- get_piece_orders
- update_piece_order_notes
- update_piece_order_status

### portal
- create_portal_token
- delete_portal_token
- list_portal_tokens
- revoke_portal_token

### procurement
- create_purchase_order
- create_supplier
- delete_supplier
- get_purchase_order
- get_purchase_orders
- get_suppliers
- receive_purchase_line
- update_supplier

### production
- get_production_board
- get_stage_transitions
- move_project_to_stage

### productionDocs
- create_aviz
- create_bon_consum
- create_invoice
- get_aviz
- get_bon_consum
- list_avize_by_project
- list_bon_consums_by_project
- list_invoices_by_project

### projectBriefings
- add_briefing_attachment
- answer_briefing_clarification
- ask_briefing_clarification
- create_project_briefing
- delete_briefing_attachment
- delete_project_briefing
- get_briefing_attachment
- get_project_briefing
- get_project_briefings
- list_briefing_attachments
- list_briefing_clarifications
- reopen_briefing_clarification
- update_briefing_attachment_note
- update_project_briefing
- update_project_briefing_status

### recipes
- add_recipe_item
- delete_recipe_item
- get_recipe
- get_recipes_overview
- update_recipe_item

### reports
- delete_report_preset
- get_report_sources
- list_report_presets
- run_report
- save_report_preset

### reservations
- create_reservation
- delete_reservation
- get_reservation
- get_reservations
- set_reservation_status
- update_reservation

### rfq
- award_rfq
- compare_rfq
- create_rfq
- delete_rfq
- get_rfq
- list_rfqs
- send_rfq_invitations

### search
- global_search

### signatures
- add_signature
- delete_signature
- list_signatures

### supplierCodes
- create_supplier_code
- delete_supplier_code
- get_supplier_codes
- update_supplier_code

### system
- extract_sldprt_thumbnail
- fs_exists
- fs_read_text
- system_info
- updater_get_version

### tables
- create_restaurant_table
- delete_restaurant_table
- get_restaurant_table
- get_restaurant_tables
- set_restaurant_table_status
- update_restaurant_table

### threeWayMatch
- approve_supplier_invoice
- compute_three_way_match
- create_supplier_invoice
- delete_supplier_invoice
- get_matching_thresholds
- get_supplier_invoice
- list_supplier_invoices
- record_supplier_invoice_payment
- reject_supplier_invoice
- update_matching_thresholds

### timeTracking
- time_get_active
- time_list_entries
- time_piece_breakdown
- time_start
- time_stop
- time_update_piece_estimate
- time_update_user_rate
- time_weekly_rollup

### tipPiese
- get_operatii_config
- get_tip_piese
- save_operatii_config

### userSessions
- force_logout_user
- get_sessions_summary
- get_user_login_history
- list_active_sessions

### users
- create_user
- delete_user
- get_roles
- get_user
- get_users
- update_user
- update_user_dashboard_config
- update_user_pages

### warehouse
- create_stock_reservation
- create_warehouse_location
- get_stock_movements
- get_stock_reservations
- get_warehouse_locations
- issue_stock_reservation
- record_stock_movement

### workspace
- create_moderation_report
- export_personal_data
- get_moderation_dashboard
- get_system_monitor
- get_workspace_profile
- import_personal_data
- resolve_moderation_report
- update_workspace_profile

