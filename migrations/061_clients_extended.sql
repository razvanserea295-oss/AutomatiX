-- ============================================================================
-- 061: Extended client fields — CUI, reg_com, full address
-- ============================================================================
-- Needed for: ANAF auto-lookup, invoice/contract PDF, customer portal.
-- ============================================================================

ALTER TABLE clients ADD COLUMN cui TEXT;
ALTER TABLE clients ADD COLUMN reg_com TEXT;
ALTER TABLE clients ADD COLUMN address TEXT;
ALTER TABLE clients ADD COLUMN bank_name TEXT;
ALTER TABLE clients ADD COLUMN iban TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_cui ON clients(cui);
