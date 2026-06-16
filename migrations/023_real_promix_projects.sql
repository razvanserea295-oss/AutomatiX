-- Migration 023: Real Promix Projects with Detailed Piece Breakdowns

-- Add clients for the projects
INSERT INTO clients (name, contact_person, phone, email, city, county, notes) VALUES
('Constructii SRL Cluj', 'Ion Popescu', '+40 264 123 456', 'office@constructiicluj.ro', 'Cluj-Napoca', 'Cluj', 'Client fidel, proiecte mari de infrastructură'),
('Beton București SA', 'Maria Ionescu', '+40 21 234 5678', 'contact@betonbucuresti.ro', 'București', 'București', 'Companie mare, plăți regulate'),
('Construct Timișoara', 'Vasile Georgescu', '+40 256 345 678', 'vasile@constructtimisoara.ro', 'Timișoara', 'Timiș', 'Client nou, proiect compact'),
('Port Constanța Development', 'Elena Marinescu', '+40 241 456 789', 'elena@portconstanta.ro', 'Constanța', 'Constanța', 'Proiect strategic, termen strâns'),
('Construct Moldova', 'Andrei Dumitrescu', '+40 232 567 890', 'andrei@constructmoldova.ro', 'Iași', 'Iași', 'Client regional, sisteme moderne');

-- Add real Promix projects based on their actual product line
INSERT INTO projects (name, client_id, description, status, operational_flow_json, manager_id, created_at) VALUES
('Stație Beton PROMIX M120 - Cluj-Napoca', (SELECT id FROM clients WHERE name = 'Constructii SRL Cluj'), 'Stație beton M120 mc/h cu automatizare completă, silozuri ciment 4x100t, sistem reciclare apă', 'in_producție', '{"modules": ["sasiu", "predozare", "banda_cantar", "malaxor", "turn_nivel_1", "cantar_ciment", "cantar_h2o", "silozuri", "cantar_rutier"]}', 1, datetime('now', '-30 days')),
('Stație Beton PROMIX M90 - București', (SELECT id FROM clients WHERE name = 'Beton București SA'), 'Stație beton M90 mc/h cu control SCADA, 3 silozuri ciment, sistem dozare agregate 4x25mc', 'in_producție', '{"modules": ["sasiu", "predozare", "banda_cantar", "malaxor", "turn_nivel_1", "cantar_ciment", "cantar_h2o", "silozuri"]}', 1, datetime('now', '-45 days')),
('Stație Beton PROMIX M60 - Timișoara', (SELECT id FROM clients WHERE name = 'Construct Timișoara'), 'Stație beton M60 mc/h compactă, 2 silozuri ciment, sistem malaxare twin-shaft', 'fabricat', '{"modules": ["sasiu", "predozare", "banda_cantar", "malaxor", "turn_nivel_1", "cantar_ciment", "cantar_h2o", "silozuri"]}', 1, datetime('now', '-60 days')),
('Stație Beton PROMIX M150 - Constanța', (SELECT id FROM clients WHERE name = 'Port Constanța Development'), 'Stație beton M150 mc/h pentru proiect portuar, 6 silozuri ciment, sistem înaltă productivitate', 'planificat', '{"modules": ["sasiu", "predozare", "banda_cantar", "skip", "malaxor", "turn_nivel_1", "turn_nivel_2", "cantar_ciment", "cantar_h2o", "silozuri", "cantar_rutier"]}', 1, datetime('now', '-15 days')),
('Stație Beton PROMIX M75 - Iași', (SELECT id FROM clients WHERE name = 'Construct Moldova'), 'Stație beton M75 mc/h cu sistem reciclare complet, 3 silozuri ciment, automatizare Siemens', 'in_productie', '{"modules": ["sasiu", "predozare", "banda_cantar", "malaxor", "turn_nivel_1", "cantar_ciment", "cantar_h2o", "silozuri"]}', 1, datetime('now', '-20 days'));

-- Get project IDs for reference
-- Project 1: M120 Cluj (ID will be auto-assigned)
-- Project 2: M90 București
-- Project 3: M60 Timișoara
-- Project 4: M150 Constanța
-- Project 5: M75 Iași

-- Add project stages for each project
INSERT INTO project_custom_stages (project_id, name, order_index, description, status) VALUES
-- M120 Cluj stages
((SELECT id FROM projects WHERE name LIKE '%M120%Cluj%'), 'Proiectare & Inginerie', 1, 'Proiectare CAD, calcule structurale, scheme electrice', 'finalizat'),
((SELECT id FROM projects WHERE name LIKE '%M120%Cluj%'), 'Debitare & Sudare Structură', 2, 'Debitare profile, sudură șasiu și structuri principale', 'in_desfasurare'),
((SELECT id FROM projects WHERE name LIKE '%M120%Cluj%'), 'Prelucrare Mecanică', 3, 'Strunjire, frezare, găurire componente', 'planificat'),
((SELECT id FROM projects WHERE name LIKE '%M120%Cluj%'), 'Asamblare Subansamble', 4, 'Malaxor, buncăre, transportoare, silozuri', 'planificat'),
((SELECT id FROM projects WHERE name LIKE '%M120%Cluj%'), 'Instalare Electrică & Automatizare', 5, 'Cablară, panouri electrice, PLC, SCADA', 'planificat'),
((SELECT id FROM projects WHERE name LIKE '%M120%Cluj%'), 'Testare & Punere în Funcțiune', 6, 'Teste funcționale, calibrare, instruire', 'planificat'),

-- M90 București stages
((SELECT id FROM projects WHERE name LIKE '%M90%București%'), 'Proiectare & Inginerie', 1, 'Proiectare tehnică și specificații', 'finalizat'),
((SELECT id FROM projects WHERE name LIKE '%M90%București%'), 'Debitare & Sudare', 2, 'Prelucrări metalice pentru structură', 'finalizat'),
((SELECT id FROM projects WHERE name LIKE '%M90%București%'), 'Asamblare Componente', 3, 'Asamblare malaxor, buncăre, transportoare', 'in_desfasurare'),
((SELECT id FROM projects WHERE name LIKE '%M90%București%'), 'Instalare Sisteme', 4, 'Electrice, pneumatice, hidraulice', 'planificat'),
((SELECT id FROM projects WHERE name LIKE '%M90%București%'), 'Testare Finală', 5, 'Teste complete și validare', 'planificat'),

-- M60 Timișoara stages (completed)
((SELECT id FROM projects WHERE name LIKE '%M60%Timișoara%'), 'Proiectare', 1, 'Proiectare și specificații', 'finalizat'),
((SELECT id FROM projects WHERE name LIKE '%M60%Timișoara%'), 'Fabricare', 2, 'Producție componente', 'finalizat'),
((SELECT id FROM projects WHERE name LIKE '%M60%Timișoara%'), 'Asamblare', 3, 'Asamblare finală', 'finalizat'),
((SELECT id FROM projects WHERE name LIKE '%M60%Timișoara%'), 'Testare & Livrare', 4, 'Teste și livrare client', 'finalizat'),

-- M150 Constanța stages (early stage)
((SELECT id FROM projects WHERE name LIKE '%M150%Constanța%'), 'Proiectare Conceptuală', 1, 'Studiu fezabilitate și proiectare preliminară', 'in_desfasurare'),
((SELECT id FROM projects WHERE name LIKE '%M150%Constanța%'), 'Proiectare Detaliată', 2, 'Proiectare completă și specificații', 'planificat'),

-- M75 Iași stages
((SELECT id FROM projects WHERE name LIKE '%M75%Iași%'), 'Proiectare', 1, 'Proiectare și inginerie', 'finalizat'),
((SELECT id FROM projects WHERE name LIKE '%M75%Iași%'), 'Fabricare Structură', 2, 'Șasiu și structuri principale', 'in_desfasurare'),
((SELECT id FROM projects WHERE name LIKE '%M75%Iași%'), 'Fabricare Componente', 3, 'Malaxor, transportoare, silozuri', 'planificat'),
((SELECT id FROM projects WHERE name LIKE '%M75%Iași%'), 'Asamblare Finală', 4, 'Asamblare completă', 'planificat'),
((SELECT id FROM projects WHERE name LIKE '%M75%Iași%'), 'Testare & Livrare', 5, 'Teste și punere în funcțiune', 'planificat');

-- Add detailed pieces for each project
-- M120 Cluj Project Pieces
INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, assembly_key, production_tracking, fulfillment_type, fulfillment_status) VALUES
-- Stage 1: Proiectare & Inginerie (completed)
((SELECT id FROM projects WHERE name LIKE '%M120%Cluj%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M120%Cluj%') AND name = 'Proiectare & Inginerie'), 
 'Proiect CAD Stație M120', 'proiectare', '{"format": "AutoCAD", "versiune": "2023", "foi": 45}', 1, 'finalizat', 'proiectare', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"finalizat","livrat":"finalizat","montat":"finalizat","testat":"finalizat"}', 'fabricare', 'finalizat'),

-- Stage 2: Debitare & Sudare Structură (in progress)
((SELECT id FROM projects WHERE name LIKE '%M120%Cluj%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M120%Cluj%') AND name = 'Debitare & Sudare Structură'), 
 'Șasiu Principal M120', 'sasiu', '{"material": "S355", "lungime_mm": 12000, "latime_mm": 3500, "inaltime_mm": 1800, "greutate_kg": 8500}', 1, 'in_productie', 'sasiu', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"in_lucru","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}', 'fabricare', 'in_productie'),

((SELECT id FROM projects WHERE name LIKE '%M120%Cluj%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M120%Cluj%') AND name = 'Debitare & Sudare Structură'), 
 'Grinzi Suport Turn', 'structura', '{"material": "HEA300", "lungime_mm": 8000, "greutate_kg": 1200}', 4, 'in_productie', 'sasiu', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"in_lucru","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}', 'fabricare', 'in_productie'),

-- Stage 3: Prelucrare Mecanică (planned)
((SELECT id FROM projects WHERE name LIKE '%M120%Cluj%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M120%Cluj%') AND name = 'Prelucrare Mecanică'), 
 'Arboret Malaxor Ø350', 'malaxor', '{"material": "42CrMo4", "diametru_mm": 350, "lungime_mm": 3200, "greutate_kg": 450}', 2, 'planificat', 'malaxor', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}', 'fabricare', 'draft'),

-- Stage 4: Asamblare Subansamble (planned)
((SELECT id FROM projects WHERE name LIKE '%M120%Cluj%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M120%Cluj%') AND name = 'Asamblare Subansamble'), 
 'Malaxor Twin-Shaft M120', 'malaxor', '{"capacitate_m3": 3.0, "motor_putere_kw": 75, "turatie_rpm": 28, "brand": "PROMIX"}', 1, 'planificat', 'malaxor', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}', 'fabricare', 'draft'),

((SELECT id FROM projects WHERE name LIKE '%M120%Cluj%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M120%Cluj%') AND name = 'Asamblare Subansamble'), 
 'Buncăr Agregate 4x25mc', 'buncar', '{"capacitate_totala_m3": 100, "nr_compartimente": 4, "descarcare": "pneumatica"}', 1, 'planificat', 'predozare', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}', 'fabricare', 'draft'),

((SELECT id FROM projects WHERE name LIKE '%M120%Cluj%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M120%Cluj%') AND name = 'Asamblare Subansamble'), 
 'Siloz Ciment 100t', 'siloz', '{"capacitate_tone": 100, "diametru_mm": 3000, "inaltime_mm": 12000}', 4, 'planificat', 'silozuri', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}', 'fabricare', 'draft');

-- M90 București Project Pieces
INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, assembly_key, production_tracking, fulfillment_type, fulfillment_status) VALUES
-- Stage 1: Proiectare & Inginerie (completed)
((SELECT id FROM projects WHERE name LIKE '%M90%București%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M90%București%') AND name = 'Proiectare & Inginerie'), 
 'Proiect Tehnic M90', 'proiectare', '{"format": "SolidWorks", "versiune": "2022", "complexitate": "medie"}', 1, 'finalizat', 'proiectare', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"finalizat","livrat":"finalizat","montat":"finalizat","testat":"finalizat"}', 'fabricare', 'finalizat'),

-- Stage 2: Debitare & Sudare (completed)
((SELECT id FROM projects WHERE name LIKE '%M90%București%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M90%București%') AND name = 'Debitare & Sudare'), 
 'Șasiu M90 Compact', 'sasiu', '{"material": "S355", "lungime_mm": 10000, "latime_mm": 3200, "greutate_kg": 6800}', 1, 'finalizat', 'sasiu', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"finalizat","livrat":"finalizat","montat":"finalizat","testat":"finalizat"}', 'fabricare', 'finalizat'),

-- Stage 3: Asamblare Componente (in progress)
((SELECT id FROM projects WHERE name LIKE '%M90%București%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M90%București%') AND name = 'Asamblare Componente'), 
 'Malaxor Twin-Shaft M90', 'malaxor', '{"capacitate_m3": 2.25, "motor_putere_kw": 55, "brand": "PROMIX"}', 1, 'in_productie', 'malaxor', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"in_lucru","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}', 'fabricare', 'in_productie'),

((SELECT id FROM projects WHERE name LIKE '%M90%București%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M90%București%') AND name = 'Asamblare Componente'), 
 'Buncăr Agregate 4x20mc', 'buncar', '{"capacitate_totala_m3": 80, "nr_compartimente": 4}', 1, 'planificat', 'predozare', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}', 'fabricare', 'draft'),

((SELECT id FROM projects WHERE name LIKE '%M90%București%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M90%București%') AND name = 'Asamblare Componente'), 
 'Siloz Ciment 80t', 'siloz', '{"capacitate_tone": 80, "diametru_mm": 2800}', 3, 'planificat', 'silozuri', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}', 'fabricare', 'draft');

-- M60 Timișoara Project Pieces (completed)
INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, assembly_key, production_tracking, fulfillment_type, fulfillment_status) VALUES
((SELECT id FROM projects WHERE name LIKE '%M60%Timișoara%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M60%Timișoara%') AND name = 'Fabricare'), 
 'Șasiu M60', 'sasiu', '{"material": "S355", "lungime_mm": 9000, "greutate_kg": 5200}', 1, 'finalizat', 'sasiu', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"finalizat","livrat":"finalizat","montat":"finalizat","testat":"finalizat"}', 'fabricare', 'finalizat'),

((SELECT id FROM projects WHERE name LIKE '%M60%Timișoara%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M60%Timișoara%') AND name = 'Fabricare'), 
 'Malaxor M60', 'malaxor', '{"capacitate_m3": 1.5, "motor_putere_kw": 37}', 1, 'finalizat', 'malaxor', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"finalizat","livrat":"finalizat","montat":"finalizat","testat":"finalizat"}', 'fabricare', 'finalizat'),

((SELECT id FROM projects WHERE name LIKE '%M60%Timișoara%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M60%Timișoara%') AND name = 'Asamblare'), 
 'Siloz Ciment 60t', 'siloz', '{"capacitate_tone": 60, "diametru_mm": 2500}', 2, 'finalizat', 'silozuri', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"finalizat","livrat":"finalizat","montat":"finalizat","testat":"finalizat"}', 'fabricare', 'finalizat'),

((SELECT id FROM projects WHERE name LIKE '%M60%Timișoara%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M60%Timișoara%') AND name = 'Testare & Livrare'), 
 'Testare Finală Stație', 'testare', '{"proceduri": ["test_functionare", "calibrare_cantare", "test_receptie"]}', 1, 'finalizat', 'testare', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"finalizat","livrat":"finalizat","montat":"finalizat","testat":"finalizat"}', 'fabricare', 'finalizat');

-- M150 Constanța Project Pieces (early stage)
INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, assembly_key, production_tracking, fulfillment_type, fulfillment_status) VALUES
((SELECT id FROM projects WHERE name LIKE '%M150%Constanța%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M150%Constanța%') AND name = 'Proiectare Conceptuală'), 
 'Studiu Fezabilitate M150', 'proiectare', '{"capacitate_req": 150, "conditii_portuare": true}', 1, 'in_productie', 'proiectare', 
 '{"dxf":"in_lucru","desene":"neinceput","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}', 'fabricare', 'draft');

-- M75 Iași Project Pieces
INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, assembly_key, production_tracking, fulfillment_type, fulfillment_status) VALUES
((SELECT id FROM projects WHERE name LIKE '%M75%Iași%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M75%Iași%') AND name = 'Proiectare'), 
 'Proiect M75 cu Reciclare', 'proiectare', '{"sistem_reciclare": true, "automatizare": "Siemens"}', 1, 'finalizat', 'proiectare', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"finalizat","livrat":"finalizat","montat":"finalizat","testat":"finalizat"}', 'fabricare', 'finalizat'),

((SELECT id FROM projects WHERE name LIKE '%M75%Iași%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M75%Iași%') AND name = 'Fabricare Structură'), 
 'Șasiu M75 cu Reciclare', 'sasiu', '{"material": "S355", "sistem_reciclare_integrat": true}', 1, 'in_productie', 'sasiu', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"in_lucru","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}', 'fabricare', 'in_productie'),

((SELECT id FROM projects WHERE name LIKE '%M75%Iași%'), (SELECT id FROM project_custom_stages WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%M75%Iași%') AND name = 'Fabricare Componente'), 
 'Malaxor M75 Premium', 'malaxor', '{"capacitate_m3": 1.875, "motor_putere_kw": 45, "sistem_reciclare": true}', 1, 'planificat', 'malaxor', 
 '{"dxf":"finalizat","desene":"finalizat","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}', 'fabricare', 'draft');