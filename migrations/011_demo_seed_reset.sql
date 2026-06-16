-- PROMIX SAP+ Controlled Demo Seed Reset
-- This migration EMPTIES all tables and repopulates them with a realistic, cohesive demo dataset.

-- 1. EMPTY ALL TABLES (Children first to respect implicit logic, though SQLite in transactions doesn't strictly enforce FK unless PRAGMA foreign_keys=ON)
DELETE FROM station_activity_log;
DELETE FROM station_parts_requests;
DELETE FROM station_maintenance_plans;
DELETE FROM station_service_interventions;
DELETE FROM station_change_requests;
DELETE FROM installed_stations;

DELETE FROM project_activity;
DELETE FROM alerts;
DELETE FROM project_finance_overrides;
DELETE FROM project_revenues;
DELETE FROM material_consumptions;
DELETE FROM materials;
DELETE FROM time_entries;
DELETE FROM workers;
DELETE FROM documents;
DELETE FROM document_categories;
DELETE FROM stage_transitions;
DELETE FROM project_workers;
DELETE FROM project_comments;
DELETE FROM projects;
DELETE FROM project_stages;
DELETE FROM clients;

DELETE FROM audit_logs;
DELETE FROM sessions;
DELETE FROM users;
DELETE FROM roles;

-- 2. RESET AUTOINCREMENT SEQUENCES
UPDATE sqlite_sequence SET seq = 0;

-- ============================================
-- 3. REPOPULATE ROLES & USERS
-- ============================================
INSERT INTO roles (id, name, description, permissions) VALUES
(1, 'admin', 'Administrator de sistem', '["all", "manage_users", "manage_roles", "view_all", "edit_all", "delete_all"]'),
(2, 'manager', 'Manager operațional', '["manage_projects", "manage_workers", "view_finances", "manage_alerts", "view_all", "edit_all"]'),
(3, 'project_manager', 'Proiectant / PM', '["manage_projects", "manage_documents", "view_all"]'),
(4, 'hala', 'Șef de hală', '["manage_production", "view_workers", "view_materials", "view_projects", "edit_projects"]'),
(5, 'muncitor', 'Muncitor / Tehnician', '["view_own_projects", "time_tracking", "view_own_data"]'),
(6, 'financiar', 'Contabil / Financiar', '["view_finances", "manage_costs", "view_projects", "view_workers"]'),
(7, 'service', 'Tehnician Service', '["manage_stations", "manage_interventions", "view_materials"]'),
(8, 'viewer', 'Vizualizator (Client/Guest)', '["view_all"]'),
(9, 'hr', 'Resurse Umane', '["view_workers", "time_tracking", "manage_workers"]'),
(10, 'logistica', 'Achiziții / Logistică', '["view_materials", "manage_alerts", "view_projects"]');

-- Admin user seed set to username 'admin' and password '1234'; other seeded passwords remain Promix2024!
INSERT INTO users (id, username, email, password_hash, full_name, role_id, active) VALUES
(1, 'admin', 'radu@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$EK6meEuFaNQD4sZJmbfAiA$sFxmzCJQaYWHnsvidB3y/AKF46XJ0n1KhcoJ7NJoZnk', 'Radu Ionescu', 1, 1),
(2, 'marian.mgr', 'marian@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$cxMPdYAy1dre0LTOWviHDg$afmaq7z84MBG/ru6HFmg6c/RuukgcCqpmWyEKw/wITE', 'Marian Popescu', 2, 1),
(3, 'andrei.pm', 'andrei@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$cxMPdYAy1dre0LTOWviHDg$afmaq7z84MBG/ru6HFmg6c/RuukgcCqpmWyEKw/wITE', 'Andrei Dinu', 3, 1),
(4, 'vasile.hala', 'vasile@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$cxMPdYAy1dre0LTOWviHDg$afmaq7z84MBG/ru6HFmg6c/RuukgcCqpmWyEKw/wITE', 'Vasile Cârțu', 4, 1),
(5, 'ion.muncitor', 'ion@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$cxMPdYAy1dre0LTOWviHDg$afmaq7z84MBG/ru6HFmg6c/RuukgcCqpmWyEKw/wITE', 'Ion Sudorul', 5, 1),
(6, 'ioana.fin', 'ioana@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$cxMPdYAy1dre0LTOWviHDg$afmaq7z84MBG/ru6HFmg6c/RuukgcCqpmWyEKw/wITE', 'Ioana Stan', 6, 1),
(7, 'mihai.service', 'mihai@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$cxMPdYAy1dre0LTOWviHDg$afmaq7z84MBG/ru6HFmg6c/RuukgcCqpmWyEKw/wITE', 'Mihai Voicu', 7, 1),
(8, 'client.viewer', 'client@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$cxMPdYAy1dre0LTOWviHDg$afmaq7z84MBG/ru6HFmg6c/RuukgcCqpmWyEKw/wITE', 'Client Vizitator', 8, 1),
(9, 'elena.hr', 'elena@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$cxMPdYAy1dre0LTOWviHDg$afmaq7z84MBG/ru6HFmg6c/RuukgcCqpmWyEKw/wITE', 'Elena Ionescu', 9, 1),
(10, 'cristi.logistica', 'cristi@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$cxMPdYAy1dre0LTOWviHDg$afmaq7z84MBG/ru6HFmg6c/RuukgcCqpmWyEKw/wITE', 'Cristian Toma', 10, 1);

-- ============================================
-- 4. REPOPULATE CLIENTS
-- ============================================
INSERT INTO clients (id, name, contact_person, phone, email, city, county, notes) VALUES
(1, 'Holcim Romania SA', 'Dan Petrescu', '0722 100 200', 'dan.p@holcim.ro', 'București', 'București', 'Stații de betoane și upgrade-uri.'),
(2, 'Prefconstruct SRL', 'Ana Maria', '0733 300 400', 'achizitii@prefconstruct.ro', 'Cluj-Napoca', 'Cluj', 'Producător prefabricate. Echipamente personalizate.'),
(3, 'Balastiera Sud SRL', 'Gheorghe Toma', '0744 500 600', 'office@balastierasud.ro', 'Craiova', 'Dolj', 'Stații de sortare și cântare auto.'),
(4, 'Logis Construct Industrials', 'Cristian Ene', '0755 700 800', 'cristian@logisconstruct.ro', 'Timișoara', 'Timiș', 'Structuri, hale, logistica.');

-- ============================================
-- 5. REPOPULATE PROJECT STAGES
-- ============================================
INSERT INTO project_stages (id, name, order_index, description) VALUES
(1, 'Ofertare / Contractare', 10, 'Negocieri, oferte, semnătură contract'),
(2, 'Proiectare (CAD)', 20, 'Elaborare desene tehnice și schițe'),
(3, 'Debitare & Pregătire', 30, 'Tăiere profile și tablă'),
(4, 'Sudură', 40, 'Asamblare și sudură componente'),
(5, 'Premontaj / Asamblare Hală', 50, 'Montaj la rece în fabrică'),
(6, 'Vopsitorie', 60, 'Sablare, grunduire, vopsire'),
(7, 'Testare & QC', 70, 'Teste finale electrice și mecanice'),
(8, 'Livrare & PIF', 80, 'Transport, montaj la client, punere în funcțiune'),
(9, 'Finalizat', 90, 'Predat și facturat');

-- ============================================
-- 6. REPOPULATE PROJECTS
-- ============================================
-- Active Projects
INSERT INTO projects (id, name, client_id, status, stage_id, priority, manager_id, description, estimated_value, estimated_cost, actual_cost, deadline) VALUES
(1, 'Stație Betoane PROMIX M60', 1, 'active', 4, 'high', 3, 'Stație de betoane mobilă 60 mc/h, inclusiv 2 silozuri ciment 50t.', 185000, 115000, 45000, date('now', '+30 days')),
(2, 'Modernizare Cântar Auto 80t', 3, 'active', 8, 'medium', 2, 'Înlocuire platformă și celule cântărire pentru balastieră.', 45000, 28000, 25000, date('now', '+5 days')),
(3, 'Matriță Prefabricate Tip L', 2, 'delayed', 3, 'critical', 3, 'Matrițe speciale pentru piloni poduri. Așteptăm tablă groasă.', 35000, 22000, 5000, date('now', '-10 days'));

-- Completed Projects (will become installed stations)
INSERT INTO projects (id, name, client_id, status, stage_id, priority, manager_id, description, estimated_value, estimated_cost, actual_cost, deadline) VALUES
(4, 'Stație Fixă Betoane F100', 1, 'completed', 9, 'high', 3, 'Stație fixă 100 mc/h', 250000, 160000, 158000, date('now', '-200 days')),
(5, 'Stație Sortare Agregate 3 Sorturi', 3, 'completed', 9, 'medium', 2, 'Stație sortare 150t/h', 140000, 95000, 92000, date('now', '-150 days'));

-- ============================================
-- 7. REPOPULATE WORKERS
-- ============================================
INSERT INTO workers (id, name, specialization, department, hourly_rate, active, hire_date, contact) VALUES
(1, 'Ion Sudorul', 'Sudor', 'Producție', 45.0, 1, '2020-01-15', '0722111222'),
(2, 'Gheorghe Cablaje', 'Electrician', 'Producție', 55.0, 1, '2019-06-10', '0733111222'),
(3, 'Dorel Fier', 'Sudor', 'Producție', 40.0, 1, '2021-03-20', '0744111222'),
(4, 'Mihai Service', 'Tehnician Service', 'Service', 60.0, 1, '2018-11-05', '0755111222');

-- ============================================
-- 8. REPOPULATE MATERIALS
-- ============================================
INSERT INTO materials (id, name, code, category, unit, unit_cost, stock, min_stock) VALUES
(1, 'Tablă Oțel 10mm S355', 'MAT-T10', 'Metalurgice', 'kg', 4.5, 5000, 1000),
(2, 'Profil INP 200', 'MAT-INP200', 'Metalurgice', 'm', 120.0, 450, 100),
(3, 'Motor Electric ABB 15kW', 'MAT-MOT15', 'Electromecanice', 'buc', 3500.0, 2, 4),
(4, 'Reductor Bonfiglioli', 'MAT-RED01', 'Electromecanice', 'buc', 2800.0, 1, 2),
(5, 'Celulă Cântărire Zemic 5t', 'MAT-ZEM5T', 'Automatizari', 'buc', 800.0, 8, 12),
(6, 'PLC Siemens S7-1200', 'MAT-PLC12', 'Automatizari', 'buc', 4500.0, 1, 3);

-- ============================================
-- 9. REPOPULATE INSTALLED STATIONS & SERVICE
-- ============================================
INSERT INTO installed_stations (id, project_id, client_id, code, name, location, station_type, delivery_date, commissioning_date, warranty_end_date, status, internal_manager_id) VALUES
(1, 4, 1, 'ST-F100-01', 'Stație Fixă Betoane F100', 'București, Platforma Sud', 'Stație Betoane Fixă', date('now', '-200 days'), date('now', '-190 days'), date('now', '+175 days'), 'ACTIVE', 6),
(2, 5, 3, 'ST-SORT-02', 'Stație Sortare 3 Sorturi', 'Craiova, Balastiera 2', 'Stație Sortare Agregate', date('now', '-150 days'), date('now', '-140 days'), date('now', '+225 days'), 'IN_SERVICE', 6);

INSERT INTO station_service_interventions (id, station_id, intervention_type, reason, problem_description, open_date, is_urgent, technician_id, status) VALUES
(1, 2, 'CORRECTIVE', 'Ruptură bandă transportoare', 'Banda principală de sort s-a rupt și necesită vulcanizare sau înlocuire.', date('now', '-2 days'), 1, 6, 'WAITING_FOR_PARTS');

INSERT INTO station_parts_requests (id, station_id, intervention_id, material_id, part_name, part_code, quantity, status, estimated_cost) VALUES
(1, 2, 1, NULL, 'Bandă cauciuc EP400 800mm', 'BND-EP400', 25, 'ORDERED', 4500);

INSERT INTO station_maintenance_plans (id, station_id, maintenance_type, periodicity_days, last_execution_date, next_execution_date, status) VALUES
(1, 1, 'Calibrare Cântare (Metrologie)', 365, date('now', '-190 days'), date('now', '+175 days'), 'PLANNED'),
(2, 1, 'Revizie Malaxor (Schimb Ulei, Lopeți)', 90, date('now', '-10 days'), date('now', '+80 days'), 'PLANNED');

-- ============================================
-- 10. REPOPULATE ALERTS & DASHBOARD ACTIVITY
-- ============================================
INSERT INTO alerts (id, project_id, type, severity, title, message, acknowledged, created_at) VALUES
(1, 3, 'stock_warning', 'warning', 'Stoc Critic', 'Stocul pentru Motor Electric ABB 15kW a scăzut sub pragul minim.', 0, datetime('now')),
(2, 3, 'deadline', 'critical', 'Proiect Întârziat', 'Proiectul "Matriță Prefabricate Tip L" a depășit deadline-ul cu 10 zile.', 0, datetime('now'));

INSERT INTO project_activity (project_id, user_id, action, details) VALUES
(1, 3, 'CREATED', 'Proiect creat cu succes.'),
(1, 4, 'STAGE_MOVED', 'Proiect mutat în stadiul Sudură.'),
(3, 4, 'BLOCKED', 'Așteptăm livrarea de tablă oțel 10mm din import.');

-- Seed complete
