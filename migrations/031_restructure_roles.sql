-- 031: Restructurare roluri — 6 roluri principale
-- Admin, Manager, Marketer, Proiectant, Contabil, Hala

-- Update existing roles
UPDATE roles SET name = 'admin', description = 'Administrator — acces total, editare permisiuni per user',
  permissions = '["all"]' WHERE id = 1;

UPDATE roles SET name = 'manager', description = 'Manager — vede si editeaza tot, dashboard complet',
  permissions = '["all", "manage_projects", "manage_production", "view_finances", "manage_alerts"]' WHERE id = 2;

-- Rename project_manager -> proiectant
UPDATE roles SET name = 'proiectant', description = 'Proiectant — proiectare, fise, biblioteci, arbore piese',
  permissions = '["manage_projects", "manage_documents", "view_all"]' WHERE id = 3;

-- Rename hala -> hala (keep)
UPDATE roles SET name = 'hala', description = 'Sef Hala — productie, piese, biblioteci, depozit (viewer)',
  permissions = '["manage_production", "view_materials", "view_projects"]' WHERE id = 4;

-- Rename financiar -> contabil
UPDATE roles SET name = 'contabil', description = 'Contabil — depozit, inventar, furnizori, financiar, deplasari',
  permissions = '["view_finances", "manage_costs", "view_projects"]' WHERE id = 6;

-- Insert marketer if not exists (id 11 from migration 030, or update)
INSERT OR REPLACE INTO roles (id, name, description, permissions) VALUES
(11, 'marketer', 'Marketer / Contracter — centru vanzari, contracte, clienti, proiecte',
 '["manage_projects", "view_clients", "manage_sales"]');

-- Disable unused roles (keep in DB but mark inactive via description)
UPDATE roles SET description = '[DEZACTIVAT] ' || description WHERE id IN (5, 7, 8, 9, 10) AND description NOT LIKE '[DEZACTIVAT]%';
