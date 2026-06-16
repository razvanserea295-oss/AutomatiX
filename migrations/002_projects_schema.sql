-- PROMIX SAP+ Projects Schema
-- Module 2: Projects

-- ============================================
-- CLIENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    city TEXT,
    county TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- ============================================
-- PROJECT STAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    order_index INTEGER NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    client_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    stage_id INTEGER NOT NULL DEFAULT 1,
    priority TEXT NOT NULL DEFAULT 'medium',
    manager_id INTEGER NOT NULL,
    description TEXT,
    estimated_value REAL DEFAULT 0,
    estimated_cost REAL DEFAULT 0,
    actual_cost REAL DEFAULT 0,
    deadline TEXT,
    start_date TEXT,
    end_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (stage_id) REFERENCES project_stages(id),
    FOREIGN KEY (manager_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_manager_id ON projects(manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_stage_id ON projects(stage_id);

-- ============================================
-- PROJECT COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    stage_id INTEGER,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON project_comments(project_id);

-- ============================================
-- PROJECT WORKERS TABLE (allocation)
-- ============================================
CREATE TABLE IF NOT EXISTS project_workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    worker_id INTEGER NOT NULL,
    allocated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id)
);

CREATE INDEX IF NOT EXISTS idx_project_workers_project_id ON project_workers(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_workers_unique ON project_workers(project_id, worker_id);

-- ============================================
-- INSERT PROJECT STAGES
-- ============================================
INSERT INTO project_stages (name, order_index, description) VALUES
('ofertă aprobată', 10, 'Ofertă acceptată, contract semnat'),
('proiectare', 20, 'Proiect tehnic aprobat'),
('debitare', 30, 'Materiale debitate conform documentației'),
('sudură', 40, 'Sudură elemente structurale'),
('asamblare', 50, 'Asamblare subansamble'),
('finisare', 60, 'Grunduire, vopsire, protecție'),
('testare', 70, 'Teste funcționale și calitate'),
('livrare', 80, 'Livrare și montaj la client'),
('finalizat', 90, 'Proiect închis, facturat');

-- ============================================
-- INSERT CLIENTS (from seed data)
-- ============================================
INSERT INTO clients (name, contact_person, phone, email, city, county, notes) VALUES
('Beta Construct SRL', 'Andrei Marin', '0722 111 222', 'andrei@betaconstruct.ro', 'București', 'București', 'Client vechi, plăți la timp'),
('Metal Termic SA', 'Carmen Popa', '0733 222 333', 'carmen@metaltermic.ro', 'Cluj-Napoca', 'Cluj', 'Proiecte mari, necesită documente complete'),
('Agro Fix SRL', 'Dan Dumitrescu', '0744 333 444', 'dan@agrofix.ro', 'Timișoara', 'Timiș', 'Firmă agricolă, proiecte sezoniere'),
('Indus Park SA', 'Elena Voicu', '0755 444 555', 'elena@induspark.ro', 'Brașov', 'Brașov', 'Dezvoltator industrial'),
('Ferro System SRL', 'Florin Stan', '0766 555 666', 'florin@ferrosystem.ro', 'Iași', 'Iași', 'Construcții metalice grele'),
('Eco Build SA', 'Gabriela Iorga', '0777 666 777', 'gabriela@ecobuild.ro', 'Constanța', 'Constanța', 'Clădiri verzi, termene stricte'),
('Primăria Oradea', 'Cristian Nicoară', '0788 777 888', 'cristi.n@primariaoradea.ro', 'Oradea', 'Bihor', 'Contractant public, proceduri formale'),
('Hydro Energy SA', 'Ioana Muntean', '0799 888 999', 'ioana@hydroenergy.ro', 'Craiova', 'Dolj', 'Proiecte hidrotehnice');

-- ============================================
-- INSERT PROJECTS (from seed data)
-- ============================================
INSERT INTO projects (name, client_id, status, stage_id, priority, manager_id, description, estimated_value, estimated_cost, deadline, start_date) VALUES
('Stație betoane Beta Construct', 1, 'active', 5, 'high', 2, 'Stație de betoane 120mc/h, inclusiv silozuri și transport', 450000, 320000, '2024-08-15', '2024-03-10'),
('Cântar auto 60t', 1, 'active', 2, 'medium', 2, 'Cântar auto electronic 60t, platformă 18m, software inclus', 85000, 55000, '2024-07-20', '2024-04-01'),
('Structură metalică Indus Park', 4, 'active', 4, 'high', 2, 'Hală industrială 2000mp, structură metalică + învelitoare', 280000, 195000, '2024-09-30', '2024-02-15'),
('Linie producție lapte', 3, 'delayed', 3, 'critical', 2, 'Linie completă procesare lapte 5000L/zi', 520000, 410000, '2024-06-30', '2024-01-20'),
('Echipament modular Agro', 3, 'active', 1, 'low', 2, '3 module depozitare cereale, 500mc fiecare', 120000, 85000, '2024-10-01', '2024-05-01'),
('Platformă logistică Ferro', 5, 'active', 6, 'medium', 2, 'Platformă logistică 1500mp, pardoseală industrială', 180000, 135000, '2024-07-01', '2024-03-25'),
('Instalație hidraulică Hydro', 8, 'completed', 9, 'high', 2, 'Instalație pompare + rezervoare 500mc', 340000, 265000, '2024-05-15', '2024-01-10'),
('Hală depozitare Eco Build', 6, 'active', 7, 'medium', 2, 'Hală 2500mp, structură metalică, panouri sandwich', 390000, 290000, '2024-08-01', '2024-03-01'),
('Pasarelă pietonală Oradea', 7, 'blocked', 2, 'high', 2, 'Pasarelă pietonală 80m, oțel inbox + lemn', 220000, 175000, '2024-11-15', '2024-04-10'),
('Silozuri cereale', 3, 'active', 5, 'medium', 2, '4 silozuri 100tone fiecare, instalație aerare', 195000, 140000, '2024-09-01', '2024-03-15');

-- ============================================
-- INSERT PROJECT COMMENTS
-- ============================================
INSERT INTO project_comments (project_id, stage_id, user_id, content) VALUES
(1, 5, 3, 'Asamblarea decurge conform planului. Necesită încă 2 zile pentru silozul principal.'),
(1, 5, 2, 'OK. Pregătiți transportul pentru săptămâna viitoare.'),
(3, 4, 3, 'Sudura în grafic. Grinzile principale sunt 90% complete.'),
(3, 4, 4, 'Verificat sudurile - totul conform standard. ATENȚIE la cordoanele de colț.'),
(4, 3, 2, 'Situație critică. Furnizorul a întârziat materialele cu 3 săptămâni. Discutat cu clientul.'),
(4, 3, 1, 'Trebuie găsit furnizor alternativ pentru componentele hidraulice.'),
(6, 6, 3, 'Vopsirea decurge bine. Așteptăm uscare completă pentru layer 2.'),
(9, 2, 2, 'Primăria nu a răspuns la solicitarea de aviz. Trimitem somație formală.'),
(2, 2, 3, 'Modificări cerute de client la design. Necesită redebitare piese.'),
(8, 7, 3, 'Testare finală programată pentru 28.05.2024. Clientul va fi prezent.'),
(10, 5, 3, 'Montaj silozuri conform plan. Baze deja ancorate.'),
(5, 1, 2, 'Ofertă acceptată dar clientul vrea modificări la dimensiuni. Revizuire necesară.');
