-- 115: Per-column WEIGHTS for the fișă proiectant tracking matrix (#4).
--
-- The tracking tab is a matrix of assemblies → sub-assemblies × 5 FIXED
-- workflow columns (proiect, dxf, desene, executie, livrat). Until now the
-- fișă progress % was a flat count — completed checkboxes / total checkboxes,
-- every column weighing the same (an implicit 20% each).
--
-- Now each COLUMN carries a configurable weight (%) that must sum to 100,
-- defined on the TEMPLATE (in the template editor) and SNAPSHOTTED onto the
-- fișă at creation so later template edits don't retroactively change a
-- project's progress (same Q8 snapshot rule as the rest of the schema).
--
-- We store the weights as a small JSON object in a dedicated column rather
-- than burying them inside schema_json — it keeps them cleanly selectable by
-- the backend (no JSON1 dependency in sql.js) and snapshot-copyable as one
-- value. Shape: {"proiect":20,"dxf":20,"desene":20,"executie":20,"livrat":20}.
--
-- NULL = legacy / unset → the app falls back to equal weights (the old
-- behaviour), so nothing breaks for existing templates or fișe. We do NOT
-- backfill explicit weights here; the equal-weight fallback in
-- src/lib/fisaProgress.ts (mirrored server-side) handles NULL transparently.

ALTER TABLE fisa_templates       ADD COLUMN column_weights_json TEXT;
ALTER TABLE designer_checklists  ADD COLUMN column_weights_json TEXT;
