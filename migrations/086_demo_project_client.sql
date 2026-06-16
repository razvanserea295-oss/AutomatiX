-- 086: One demo project + client.
--
-- The DB was wiped of mockup data earlier (scripts/db-clear-mockup-data.mjs)
-- so the workspace is empty and there's nothing to look at. This migration
-- adds ONE realistic-looking client and ONE active project against it so
-- the admin can verify the pipeline / kanban / finance views without
-- having to type everything by hand.
--
-- Re-seeds project_stages first (the cleanup wiped that too) with
-- INSERT OR IGNORE so subsequent runs are no-ops. The client / project
-- inserts also guard against duplicate-on-rerun via a `WHERE NOT EXISTS`
-- check on the name.

-- 1) Project stages — required by every project FK.
INSERT OR IGNORE INTO project_stages (id, name, order_index, description) VALUES
(1, 'ofertă aprobată',  10, 'Ofertă acceptată, contract semnat'),
(2, 'proiectare',        20, 'Proiect tehnic aprobat'),
(3, 'debitare',          30, 'Materiale debitate conform documentației'),
(4, 'sudură',            40, 'Sudură elemente structurale'),
(5, 'asamblare',         50, 'Asamblare subansamble'),
(6, 'finisare',          60, 'Grunduire, vopsire, protecție'),
(7, 'testare',           70, 'Teste funcționale și calitate'),
(8, 'livrare',           80, 'Livrare și montaj la client'),
(9, 'finalizat',         90, 'Proiect închis, facturat');

-- 2) Demo client. INSERT only if not already present (idempotent).
INSERT INTO clients (name, contact_person, phone, email, city, county, notes)
SELECT 'Holcim Romania SA', 'Andrei Marin', '0722 100 100', 'andrei.marin@holcim.ro',
       'București', 'București', 'Client demo — stație de betoane mobilă pe șantier'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = 'Holcim Romania SA');

-- 3) Demo project tied to that client. manager_id picks the first active
-- admin so the FK is satisfied regardless of user setup. start_date is
-- 10 days ago and deadline is 30 days out so the project lands smack in
-- the middle of the calendar's default window.
INSERT INTO projects (
  name, client_id, status, stage_id, priority, manager_id, description,
  estimated_value, estimated_cost, deadline, start_date
)
SELECT
  'Stație betoane M60 — DEMO',
  (SELECT id FROM clients WHERE name = 'Holcim Romania SA' ORDER BY id LIMIT 1),
  'active', 4, 'high',
  (SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
    WHERE r.name = 'admin' AND u.active = 1
    ORDER BY u.id LIMIT 1),
  'Stație de betoane mobilă 60 mc/h, inclusiv 2 silozuri ciment 50t. Proiect demo — poate fi șters oricând fără efecte asupra altor date.',
  185000, 115000,
  date('now', '+30 days'),
  date('now', '-10 days')
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Stație betoane M60 — DEMO')
  AND EXISTS      (SELECT 1 FROM clients WHERE name = 'Holcim Romania SA')
  AND EXISTS      (SELECT 1 FROM users u JOIN roles r ON r.id = u.role_id
                    WHERE r.name = 'admin' AND u.active = 1);
