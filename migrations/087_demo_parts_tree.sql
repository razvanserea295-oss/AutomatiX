-- 087: Demo parts tree for the demo project (migration 086).
--
-- Builds a 4-level hierarchy on `project_pieces` so the Parts Tree view
-- has something realistic to show. Tree layout:
--
--   Stație betoane M60 (root)
--   ├── Malaxor Dublu Ax 1m³
--   │   ├── Cuvă malaxor
--   │   ├── Brațe amestecare (4 buc)
--   │   └── Motor electric 30kW
--   ├── Buncăr agregate 4x15m³
--   │   ├── Compartiment agregate (4 buc)
--   │   └── Sistem descărcare pneumatic
--   ├── Sistem Cântărire
--   │   ├── Cântar agregate 3000kg
--   │   ├── Cântar ciment 600kg
--   │   └── Cântar apă 500L
--   ├── Siloz Ciment 50t (2 buc)
--   │   ├── Corp siloz Ø2500
--   │   ├── Filtru praf
--   │   └── Supapă siguranță
--   └── Tablou Automatizare
--       ├── PLC Siemens S7-1200
--       └── HMI Touch 10"
--
-- Every insert is guarded by `NOT EXISTS` so re-running the migration
-- (or running it on a fresh DB next to migration 086) is a no-op. The
-- project_id and parent_piece_id values are resolved via subqueries on
-- the (project name, piece name) pair — no hardcoded IDs.

-- ----------------------------------------------------------------------------
-- 1. Custom stages
-- ----------------------------------------------------------------------------
INSERT INTO project_custom_stages (project_id, name, order_index, status)
SELECT p.id, 'Proiectare CAD', 10, 'finalizat'
  FROM projects p
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_custom_stages s
                   WHERE s.project_id = p.id AND s.name = 'Proiectare CAD');

INSERT INTO project_custom_stages (project_id, name, order_index, status)
SELECT p.id, 'Producție Structură', 20, 'in_desfasurare'
  FROM projects p
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_custom_stages s
                   WHERE s.project_id = p.id AND s.name = 'Producție Structură');

INSERT INTO project_custom_stages (project_id, name, order_index, status)
SELECT p.id, 'Producție Subansamble', 30, 'planificat'
  FROM projects p
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_custom_stages s
                   WHERE s.project_id = p.id AND s.name = 'Producție Subansamble');

INSERT INTO project_custom_stages (project_id, name, order_index, status)
SELECT p.id, 'Asamblare & Testare', 40, 'planificat'
  FROM projects p
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_custom_stages s
                   WHERE s.project_id = p.id AND s.name = 'Asamblare & Testare');

-- ----------------------------------------------------------------------------
-- 2. Root assembly
-- ----------------------------------------------------------------------------
INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, source_file_type)
SELECT p.id, s.id, 'Stație betoane M60', 'structura',
       '{"capacity_m3h": 60, "footprint_m": "15x8", "weight_tons": 28}', 1, 'in_productie', 'assembly'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Producție Structură'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp
                   WHERE pp.project_id = p.id AND pp.name = 'Stație betoane M60');

-- ----------------------------------------------------------------------------
-- 3. Sub-assemblies (level 2)
-- ----------------------------------------------------------------------------
INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'Malaxor Dublu Ax 1m³', 'mixer',
       '{"capacity_m3": 1.0, "motor_power_kw": 30, "brand": "SICOMA", "lining": "Ni-Hard"}', 1, 'in_productie',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Stație betoane M60'),
       'assembly'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Producție Subansamble'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp
                   WHERE pp.project_id = p.id AND pp.name = 'Malaxor Dublu Ax 1m³');

INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'Buncăr agregate 4x15m³', 'buncar',
       '{"compartments": 4, "total_capacity_m3": 60, "discharge": "pneumatic"}', 1, 'in_productie',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Stație betoane M60'),
       'assembly'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Producție Structură'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp
                   WHERE pp.project_id = p.id AND pp.name = 'Buncăr agregate 4x15m³');

INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'Sistem Cântărire', 'automatizare',
       '{"scales": 3, "precision": "0.1%", "controller": "Schenck"}', 1, 'planificat',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Stație betoane M60'),
       'assembly'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Producție Subansamble'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp
                   WHERE pp.project_id = p.id AND pp.name = 'Sistem Cântărire');

INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'Siloz Ciment 50t', 'siloz',
       '{"capacity_tons": 50, "diameter_mm": 2500, "height_m": 9.5, "material": "Oțel S235"}', 2, 'planificat',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Stație betoane M60'),
       'assembly'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Producție Subansamble'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp
                   WHERE pp.project_id = p.id AND pp.name = 'Siloz Ciment 50t');

INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'Tablou Automatizare', 'automatizare',
       '{"plc": "Siemens S7-1200", "hmi": "KTP700 Basic", "io_count": 64}', 1, 'planificat',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Stație betoane M60'),
       'assembly'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Asamblare & Testare'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp
                   WHERE pp.project_id = p.id AND pp.name = 'Tablou Automatizare');

-- ----------------------------------------------------------------------------
-- 4. Leaf parts (level 3)
-- ----------------------------------------------------------------------------

-- Children of Malaxor
INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'Cuvă malaxor', 'structura',
       '{"material": "S355", "lining": "Ni-Hard", "weight_kg": 850}', 1, 'in_productie',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Malaxor Dublu Ax 1m³'),
       'part'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Producție Subansamble'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp WHERE pp.project_id = p.id AND pp.name = 'Cuvă malaxor');

INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'Brațe amestecare', 'structura',
       '{"material": "Hardox 500", "length_mm": 600}', 4, 'planificat',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Malaxor Dublu Ax 1m³'),
       'part'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Producție Subansamble'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp WHERE pp.project_id = p.id AND pp.name = 'Brațe amestecare');

INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'Motor electric 30kW', 'automatizare',
       '{"power_kw": 30, "voltage_v": 400, "brand": "ABB", "ip_rating": "IP55"}', 1, 'planificat',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Malaxor Dublu Ax 1m³'),
       'part'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Producție Subansamble'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp WHERE pp.project_id = p.id AND pp.name = 'Motor electric 30kW');

-- Children of Buncăr
INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'Compartiment agregate 15m³', 'structura',
       '{"capacity_m3": 15, "material": "S235", "thickness_mm": 5}', 4, 'in_productie',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Buncăr agregate 4x15m³'),
       'part'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Producție Structură'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp WHERE pp.project_id = p.id AND pp.name = 'Compartiment agregate 15m³');

INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'Sistem descărcare pneumatic', 'automatizare',
       '{"cylinders": 4, "pressure_bar": 8, "valves": "Festo VUVS"}', 1, 'planificat',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Buncăr agregate 4x15m³'),
       'part'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Producție Structură'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp WHERE pp.project_id = p.id AND pp.name = 'Sistem descărcare pneumatic');

-- Children of Sistem Cântărire
INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'Cântar agregate 3000kg', 'automatizare',
       '{"capacity_kg": 3000, "cells": 4, "brand": "Zemic", "precision_g": 100}', 1, 'planificat',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Sistem Cântărire'),
       'part'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Producție Subansamble'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp WHERE pp.project_id = p.id AND pp.name = 'Cântar agregate 3000kg');

INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'Cântar ciment 600kg', 'automatizare',
       '{"capacity_kg": 600, "cells": 3, "brand": "Zemic", "precision_g": 50}', 1, 'planificat',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Sistem Cântărire'),
       'part'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Producție Subansamble'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp WHERE pp.project_id = p.id AND pp.name = 'Cântar ciment 600kg');

INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'Cântar apă 500L', 'automatizare',
       '{"capacity_l": 500, "cells": 1, "brand": "Zemic", "precision_g": 100}', 1, 'planificat',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Sistem Cântărire'),
       'part'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Producție Subansamble'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp WHERE pp.project_id = p.id AND pp.name = 'Cântar apă 500L');

-- Children of Siloz Ciment
INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'Corp siloz Ø2500', 'structura',
       '{"diameter_mm": 2500, "height_m": 9.5, "material": "Oțel S235"}', 1, 'planificat',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Siloz Ciment 50t'),
       'part'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Producție Subansamble'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp WHERE pp.project_id = p.id AND pp.name = 'Corp siloz Ø2500');

INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'Filtru praf siloz', 'automatizare',
       '{"area_m2": 25, "brand": "WAM", "cleaning": "pulse-jet"}', 1, 'planificat',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Siloz Ciment 50t'),
       'part'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Producție Subansamble'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp WHERE pp.project_id = p.id AND pp.name = 'Filtru praf siloz');

INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'Supapă siguranță presiune', 'automatizare',
       '{"set_pressure_bar": 0.5, "vacuum_protection": true}', 1, 'planificat',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Siloz Ciment 50t'),
       'part'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Producție Subansamble'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp WHERE pp.project_id = p.id AND pp.name = 'Supapă siguranță presiune');

-- Children of Tablou Automatizare
INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'PLC Siemens S7-1200', 'automatizare',
       '{"model": "1214C", "memory_kb": 100, "io": "14DI / 10DO / 2AI"}', 1, 'planificat',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Tablou Automatizare'),
       'part'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Asamblare & Testare'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp WHERE pp.project_id = p.id AND pp.name = 'PLC Siemens S7-1200');

INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status, parent_piece_id, source_file_type)
SELECT p.id, s.id, 'HMI Touch 10"', 'automatizare',
       '{"size_inch": 10, "resolution": "1024x600", "model": "KTP1000 Basic"}', 1, 'planificat',
       (SELECT id FROM project_pieces WHERE project_id = p.id AND name = 'Tablou Automatizare'),
       'part'
  FROM projects p
  JOIN project_custom_stages s ON s.project_id = p.id AND s.name = 'Asamblare & Testare'
 WHERE p.name = 'Stație betoane M60 — DEMO'
   AND NOT EXISTS (SELECT 1 FROM project_pieces pp WHERE pp.project_id = p.id AND pp.name = 'HMI Touch 10"');
