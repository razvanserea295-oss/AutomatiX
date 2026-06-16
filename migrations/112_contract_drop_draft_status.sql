-- 112: Remove the contract "ciornă" (draft) status.
--
-- Contracts no longer have a draft stage — they go straight to 'active' on
-- creation (see ContractService.createContract). Promote any existing draft
-- contracts to 'active' so nothing is stranded in a status the UI no longer
-- offers. Additive/idempotent data migration (no schema change).

UPDATE contracts SET status = 'active', updated_at = datetime('now')
WHERE status = 'draft' OR status = 'ciorna';
