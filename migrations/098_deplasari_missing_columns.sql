-- 098: Add the three `deplasari` columns the service layer requires but that
-- were never created.
--
-- electron/services/deplasariService.ts SELECTs `d.other_costs`,
-- `d.additional_persons`, `d.costs_completed_at` (and the INSERT/UPDATE write
-- them), but migration 043 only added diurna/transport/accommodation/advance/
-- total cost columns. The missing three made every get_deplasari /
-- create_deplasare throw ("no such column: d.other_costs" /
-- "table deplasari has no column named additional_persons") — the Deplasări
-- page errored (500) and demo seeding of trips failed.
--
--   other_costs         — extra cost bucket beyond diurnă/transport/cazare (REAL)
--   additional_persons  — JSON array of extra traveller names (TEXT, nullable)
--   costs_completed_at  — timestamp when the trip's costs were finalized (TEXT, nullable)
ALTER TABLE deplasari ADD COLUMN other_costs REAL DEFAULT 0;
ALTER TABLE deplasari ADD COLUMN additional_persons TEXT;
ALTER TABLE deplasari ADD COLUMN costs_completed_at TEXT;
