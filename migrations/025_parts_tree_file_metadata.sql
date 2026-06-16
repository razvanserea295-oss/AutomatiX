-- Migration 025: Add file metadata columns to project_pieces for Parts Tree feature
-- Enables tracking of source CAD files (SolidWorks, STEP, etc.) linked to each piece

ALTER TABLE project_pieces ADD COLUMN source_file_name TEXT;
ALTER TABLE project_pieces ADD COLUMN source_file_path TEXT;
ALTER TABLE project_pieces ADD COLUMN source_file_size INTEGER;
ALTER TABLE project_pieces ADD COLUMN source_file_type TEXT;

CREATE INDEX IF NOT EXISTS idx_project_pieces_file_type ON project_pieces(source_file_type);

-- ============================================
-- Seed: Test project "Malaxor 3750-2500 SICOMA" with parts tree
-- ============================================

INSERT OR IGNORE INTO clients (id, name, contact_person, phone, email, city, county, notes)
VALUES (100, 'SICOMA S.p.A.', 'Marco Rossi', '+39 0721 876 101', 'info@sicoma.it', 'Petriano', 'Pesaro-Urbino', 'Producător italian malaxoare industriale');

INSERT INTO projects (id, name, client_id, status, stage_id, priority, manager_id, description, estimated_value, estimated_cost, deadline)
VALUES (100, 'Malaxor 3750-2500 SICOMA', 100, 'în producție', 4, 'high', 1,
  'Malaxor industrial dublu ax SICOMA model 3750-2500. Include pompa hidraulică ILC, centrală hidraulică 2.2kW, motor electric.',
  95000, 62000, date('now', '+60 days'));

-- Custom stages for this project
INSERT INTO project_custom_stages (id, project_id, name, order_index, status) VALUES
(500, 100, 'Recepție blueprint', 10, 'finalizat'),
(501, 100, 'Decodare componente', 20, 'finalizat'),
(502, 100, 'Producție componente', 30, 'in_desfasurare'),
(503, 100, 'Asamblare', 40, 'planificat'),
(504, 100, 'Testare', 50, 'planificat');

-- Top-level assembly
INSERT INTO project_pieces (id, project_id, stage_id, name, category, quantity, status, sort_order, assembly_key, source_file_name, source_file_path, source_file_type, production_tracking) VALUES
(1000, 100, 501, 'Malaxor 3750-2500 (Ansamblu Principal)', 'malaxor', 1, 'in_productie', 0, 'MALAXOR-MAIN',
 '9501G03761 Malaxor 3750 2500.SLDASM', 'Malaxor 3750-2500 SICOMA/9501G03761 Malaxor 3750 2500.SLDASM', 'assembly',
 '{"dxf":"finalizat","desene":"finalizat","executie":"in_lucru","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}');

-- Sub-assemblies
INSERT INTO project_pieces (id, project_id, stage_id, name, category, quantity, status, parent_piece_id, sort_order, assembly_key, source_file_name, source_file_path, source_file_type, production_tracking) VALUES
(1001, 100, 502, 'Pompa Hidraulică ILC', 'pompa', 1, 'in_productie', 1000, 1, 'POMPA-ILC',
 'POMPA-ILC.SLDASM', 'Malaxor 3750-2500 SICOMA/Pompa Refacuta/POMPA-ILC.SLDASM', 'assembly',
 '{"dxf":"finalizat","desene":"finalizat","executie":"in_lucru","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}'),
(1002, 100, 502, 'Centrală Hidraulică 2.2kW', 'hidraulica', 1, 'planificat', 1000, 2, 'CENTRALINA',
 'CENTRALINA 2.2KW.sldasm', 'Malaxor 3750-2500 SICOMA/CENTRALINA 2.2KW.sldasm', 'assembly',
 '{"dxf":"finalizat","desene":"in_lucru","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}'),
(1003, 100, 502, 'Motor Electric 2.2kW B5', 'motor', 1, 'planificat', 1000, 3, 'MOT-22',
 'MOT 2,2 234050455 100 B5.sldasm', 'Malaxor 3750-2500 SICOMA/MOT 2,2 234050455 100 B5.sldasm', 'assembly',
 '{"dxf":"finalizat","desene":"finalizat","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}'),
(1004, 100, 502, 'Ansamblu Supapă 4WE', 'hidraulica', 1, 'planificat', 1002, 4, 'VALVE-4WE',
 '4WE_6_E7X_HG24N9K4.sldasm', 'Malaxor 3750-2500 SICOMA/4WE_6_E7X_HG24N9K4.sldasm', 'assembly',
 '{"dxf":"in_lucru","desene":"neinceput","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}'),
(1005, 100, 502, 'Rezervor Hidraulic', 'hidraulica', 1, 'planificat', 1002, 5, 'SERB',
 'GRSERBATOIO.sldasm', 'Malaxor 3750-2500 SICOMA/GRSERBATOIO.sldasm', 'assembly',
 '{"dxf":"neinceput","desene":"neinceput","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}');

-- Individual parts (children of main assembly)
INSERT INTO project_pieces (id, project_id, stage_id, name, category, quantity, status, parent_piece_id, sort_order, assembly_key, source_file_name, source_file_path, source_file_type, production_tracking) VALUES
(1010, 100, 502, 'Cuvă Malaxor', 'structura', 1, 'in_productie', 1000, 10, 'VASCA',
 'M37_25 M40_30 VASCA.sldprt', 'Malaxor 3750-2500 SICOMA/M37_25 M40_30 VASCA.sldprt', 'part',
 '{"dxf":"finalizat","desene":"finalizat","executie":"in_lucru","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}'),
(1011, 100, 502, 'Brațe Amestecare', 'structura', 4, 'planificat', 1000, 11, 'BRACCI',
 'BRACCI M40_30.sldprt', 'Malaxor 3750-2500 SICOMA/BRACCI M40_30.sldprt', 'part',
 '{"dxf":"finalizat","desene":"finalizat","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}'),
(1012, 100, 502, 'Carter Protecție', 'structura', 2, 'planificat', 1000, 12, 'CARTER',
 'CARTER M37_25 2SPDX CS LF.sldprt', 'Malaxor 3750-2500 SICOMA/CARTER M37_25 2SPDX CS LF.sldprt', 'part',
 '{"dxf":"in_lucru","desene":"neinceput","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}'),
(1013, 100, 502, 'Pedană Platformă', 'structura', 1, 'planificat', 1000, 13, 'PEDANA',
 'PEDANA M45_30 SX 2SC.sldprt', 'Malaxor 3750-2500 SICOMA/PEDANA M45_30 SX 2SC.sldprt', 'part',
 '{"dxf":"neinceput","desene":"neinceput","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}'),
(1014, 100, 502, 'Sistem Skip 60°', 'structura', 1, 'planificat', 1000, 14, 'SKIP-60',
 'M37_25 APP SKIP 60° LF.sldprt', 'Malaxor 3750-2500 SICOMA/M37_25 APP SKIP 60° LF.sldprt', 'part',
 '{"dxf":"finalizat","desene":"finalizat","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}'),
(1015, 100, 502, 'Port Skip 60°', 'structura', 1, 'planificat', 1000, 15, 'PORT-SKIP',
 'M37_25 PORT SKIP 60.sldprt', 'Malaxor 3750-2500 SICOMA/M37_25 PORT SKIP 60.sldprt', 'part',
 '{"dxf":"neinceput","desene":"neinceput","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}'),
(1016, 100, 502, 'Corp Supapă', 'hidraulica', 1, 'planificat', 1004, 16, 'GEHAEUSE',
 'GEHAEUSE_WE6H.sldprt', 'Malaxor 3750-2500 SICOMA/GEHAEUSE_WE6H.sldprt', 'part',
 '{"dxf":"neinceput","desene":"neinceput","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}'),
(1017, 100, 502, 'Monobloc Comandă', 'hidraulica', 1, 'planificat', 1002, 17, 'MONOBLOC',
 'MONOBLOCCO-COD-6001_CLI.sldprt', 'Malaxor 3750-2500 SICOMA/MONOBLOCCO-COD-6001_CLI.sldprt', 'part',
 '{"dxf":"neinceput","desene":"neinceput","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}'),
(1018, 100, 502, 'Manometru 315 bar', 'automatizare', 1, 'planificat', 1002, 18, 'MANOM',
 'MANOMETRO_STAND_315.sldprt', 'Malaxor 3750-2500 SICOMA/MANOMETRO_STAND_315.sldprt', 'part',
 '{"dxf":"neinceput","desene":"neinceput","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}'),
(1019, 100, 502, 'Supapă FCV100', 'hidraulica', 1, 'planificat', 1001, 19, 'FCV100',
 'FCV100.sldprt', 'Malaxor 3750-2500 SICOMA/FCV100.sldprt', 'part',
 '{"dxf":"neinceput","desene":"neinceput","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}'),
(1020, 100, 502, 'Corp Pompă BODY100', 'pompa', 1, 'planificat', 1001, 20, 'BODY100',
 'BODY100.sldprt', 'Malaxor 3750-2500 SICOMA/BODY100.sldprt', 'part',
 '{"dxf":"in_lucru","desene":"neinceput","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}'),
(1021, 100, 502, 'Adaptor P112', 'structura', 1, 'planificat', 1001, 21, 'ADATTATORE',
 'ADATTATORE P112.sldprt', 'Malaxor 3750-2500 SICOMA/ADATTATORE P112.sldprt', 'part',
 '{"dxf":"neinceput","desene":"neinceput","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}');
