-- 103: Per-record currency (RON/EUR) on the cost-bearing tables that lacked it.
--
-- Item: costs entered anywhere in the app must let the user pick RON or EUR
-- instead of an implicit hardcoded RON. Tables that already carry a `currency`
-- column (quotations 054, finance_invoices/project_expenses 027,
-- purchase_order_lines/supplier_invoices 058) are untouched. These three are
-- the remaining cost-entry surfaces: travels (deplasari), service tickets, and
-- inventory materials. Existing rows default to 'RON' (the prior implicit
-- behaviour), so nothing changes for historical data.

ALTER TABLE deplasari ADD COLUMN currency TEXT NOT NULL DEFAULT 'RON';
ALTER TABLE service_tickets ADD COLUMN currency TEXT NOT NULL DEFAULT 'RON';
ALTER TABLE materials ADD COLUMN currency TEXT NOT NULL DEFAULT 'RON';
