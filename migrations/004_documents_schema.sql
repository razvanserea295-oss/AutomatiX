-- PROMIX SAP+ Documents Schema
-- Module 4: Documents

-- ============================================
-- DOCUMENT CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS document_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO document_categories (name, description) VALUES
('Contract', 'Contracte și acorduri'),
('Proiect Tehnic', 'Documentație tehnică de proiect'),
('Ofertă', 'Ofete și propuneri'),
('Factură', 'Facturi și documente financiare'),
('Fișă Tehnică', 'Fișe tehnice produse/materiale'),
('Proces Verbal', 'Procese verbale de recepție'),
('Aviz', 'Avize și aprobări'),
('Foto', 'Fotografii și imagini'),
('Altele', 'Alte documente');

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    version TEXT DEFAULT '1.0',
    uploaded_by INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES document_categories(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_category_id ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- ============================================
-- INSERT SAMPLE DOCUMENTS (from seed data)
-- ============================================
INSERT INTO documents (project_id, category_id, name, file_type, file_size, file_path, original_name, version, uploaded_by) VALUES
(1, 1, 'Contract Beta Construct - Stație Betoane', 'PDF', 2450, '/docs/projects/1/contract.pdf', 'contract.pdf', '1.0', 1),
(1, 2, 'Proiect Tehnic - Stație Betoane', 'DWG', 8900, '/docs/projects/1/proiect_tehnic.dwg', 'proiect_tehnic.dwg', '2.1', 2),
(1, 5, 'Fișă Tehnică Siloz', 'PDF', 1200, '/docs/projects/1/fisa_siloz.pdf', 'fisa_siloz.pdf', '1.0', 2),
(3, 1, 'Contract Indus Park - Hală', 'PDF', 2800, '/docs/projects/3/contract.pdf', 'contract.pdf', '1.0', 1),
(3, 2, 'Plan Fundare', 'DWG', 5600, '/docs/projects/3/fundare.dwg', 'fundare.dwg', '1.2', 2),
(3, 2, 'Detalii Sudură', 'PDF', 3400, '/docs/projects/3/suduri.pdf', 'suduri.pdf', '1.0', 2),
(4, 1, 'Contract Agro Fix - Linie Lapte', 'PDF', 3100, '/docs/projects/4/contract.pdf', 'contract.pdf', '1.0', 1),
(4, 2, 'Plan Producție', 'XLSX', 890, '/docs/projects/4/plan_productie.xlsx', 'plan_productie.xlsx', '1.0', 2),
(6, 1, 'Contract Ferro System', 'PDF', 2200, '/docs/projects/6/contract.pdf', 'contract.pdf', '1.0', 1),
(6, 2, 'Desen Platformă', 'DWG', 4200, '/docs/projects/6/platforma.dwg', 'platforma.dwg', '1.1', 2),
(7, 1, 'Contract Hydro Energy', 'PDF', 2900, '/docs/projects/7/contract.pdf', 'contract.pdf', '1.0', 1),
(7, 6, 'Proces Verbal Recepție', 'PDF', 850, '/docs/projects/7/pv_receptie.pdf', 'pv_receptie.pdf', '1.0', 2),
(7, 4, 'Factură Finală', 'PDF', 450, '/docs/projects/7/factura_finala.pdf', 'factura_finala.pdf', '1.0', 4),
(8, 1, 'Contract Eco Build - Hală', 'PDF', 2600, '/docs/projects/8/contract.pdf', 'contract.pdf', '1.0', 1),
(8, 2, 'Plan Cofraje', 'DWG', 3800, '/docs/projects/8/cofraje.dwg', 'cofraje.dwg', '1.0', 2),
(8, 8, 'Poze Execuție - 15.05.2024', 'ZIP', 45000, '/docs/projects/8/foto_15mai.zip', 'foto_15mai.zip', '-', 3),
(2, 3, 'Ofertă Cântar Auto', 'PDF', 1200, '/docs/projects/2/oferta.pdf', 'oferta.pdf', '1.0', 2),
(2, 2, 'Desen Cântar', 'DWG', 2100, '/docs/projects/2/cantar.dwg', 'cantar.dwg', '0.9', 2),
(9, 1, 'Contract Primăria Oradea', 'PDF', 3200, '/docs/projects/9/contract.pdf', 'contract.pdf', '1.0', 1),
(9, 7, 'Studiu Fezabilitate', 'PDF', 5600, '/docs/projects/9/studiu.pdf', 'studiu.pdf', '1.0', 2),
(10, 1, 'Contract Agro Fix - Silozuri', 'PDF', 2400, '/docs/projects/10/contract.pdf', 'contract.pdf', '1.0', 1),
(10, 2, 'Desen Siloz', 'DWG', 4800, '/docs/projects/10/siloz.dwg', 'siloz.dwg', '1.3', 2);
