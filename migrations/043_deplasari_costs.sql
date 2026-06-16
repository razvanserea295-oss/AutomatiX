-- Add per-diem and expense columns to deplasari so users can record actual
-- travel costs (previously the UI showed a hardcoded 250 RON/day estimate
-- with no input for diurna, transport, accommodation, or advances).

ALTER TABLE deplasari ADD COLUMN diurna_per_day REAL DEFAULT 250;
ALTER TABLE deplasari ADD COLUMN diurna_total REAL DEFAULT 0;
ALTER TABLE deplasari ADD COLUMN transport_cost REAL DEFAULT 0;
ALTER TABLE deplasari ADD COLUMN accommodation_cost REAL DEFAULT 0;
ALTER TABLE deplasari ADD COLUMN advance_paid REAL DEFAULT 0;
ALTER TABLE deplasari ADD COLUMN total_cost REAL DEFAULT 0;
