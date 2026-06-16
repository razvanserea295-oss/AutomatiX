-- Extend suppliers with the fields the UI needs to track each supplier
-- properly (products they sell, fiscal data, payment terms, category).
-- All optional / nullable so existing rows remain valid.

ALTER TABLE suppliers ADD COLUMN cui TEXT;
ALTER TABLE suppliers ADD COLUMN address TEXT;
ALTER TABLE suppliers ADD COLUMN website TEXT;
ALTER TABLE suppliers ADD COLUMN category TEXT;            -- raw_materials | services | equipment | logistics | other
ALTER TABLE suppliers ADD COLUMN products TEXT;            -- free-text or comma-separated list of products/services
ALTER TABLE suppliers ADD COLUMN payment_terms TEXT;       -- e.g. "30 zile", "OP la livrare"
ALTER TABLE suppliers ADD COLUMN active INTEGER NOT NULL DEFAULT 1;
