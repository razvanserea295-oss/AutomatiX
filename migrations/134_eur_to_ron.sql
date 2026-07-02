-- 134: One-time EUR → RON consolidation. The dual-currency system is being
-- retired (conversion was unreliable); everything becomes RON (lei).
--
-- Rate = this DB's own company_settings.eur_to_ron_rate (fallback 5.2409),
-- so multi-tenant DBs each convert at their own rate.
--
-- Two kinds of money:
--   1. Tables WITH a `currency` column  → convert only rows where currency='EUR',
--      then stamp currency='RON'. Child tables (lines/payments) inherit the
--      parent's currency, so they are converted BEFORE the parent is stamped RON.
--   2. Implicit-EUR columns WITHOUT a currency flag (contracts.sale_price,
--      projects.estimated_value) → convert ALL rows, but ONLY on a DB that was
--      operating in EUR mode (default_currency='EUR'). A RON-mode tenant keeps
--      its values untouched.
--
-- Runs once (tracked in _migrations), atomically (runner wraps BEGIN/COMMIT).
-- default_currency is flipped to 'RON' LAST, after the guarded conversions.

-- ── Family: quotations (children first) ──────────────────────────────────────
UPDATE quotation_lines
   SET unit_price = unit_price * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       total      = total      * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1)
 WHERE quotation_id IN (SELECT id FROM quotations WHERE UPPER(currency)='EUR');
UPDATE quotations
   SET subtotal   = subtotal   * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       tva_amount = tva_amount * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       total      = total      * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       currency   = 'RON'
 WHERE UPPER(currency)='EUR';

-- ── Family: finance_invoices (children first) ────────────────────────────────
UPDATE finance_invoice_lines
   SET unit_price = unit_price * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       total      = total      * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1)
 WHERE invoice_id IN (SELECT id FROM finance_invoices WHERE UPPER(currency)='EUR');
UPDATE finance_invoice_payments
   SET amount = amount * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1)
 WHERE invoice_id IN (SELECT id FROM finance_invoices WHERE UPPER(currency)='EUR');
UPDATE finance_invoices
   SET subtotal    = subtotal    * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       tva_amount  = tva_amount  * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       total       = total       * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       paid_amount = paid_amount * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       currency    = 'RON'
 WHERE UPPER(currency)='EUR';

-- ── Family: supplier_invoices (children first) ───────────────────────────────
UPDATE supplier_invoice_lines
   SET unit_price = unit_price * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       total      = total      * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1)
 WHERE supplier_invoice_id IN (SELECT id FROM supplier_invoices WHERE UPPER(currency)='EUR');
UPDATE supplier_invoices
   SET subtotal    = subtotal    * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       tva_amount  = tva_amount  * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       total       = total       * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       paid_amount = paid_amount * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       currency    = 'RON'
 WHERE UPPER(currency)='EUR';

-- ── Family: service_tickets (children first) ─────────────────────────────────
UPDATE service_ticket_parts
   SET unit_cost  = unit_cost  * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       total_cost = total_cost * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1)
 WHERE ticket_id IN (SELECT id FROM service_tickets WHERE UPPER(currency)='EUR');
UPDATE service_tickets
   SET cost_labor = cost_labor * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       cost_parts = cost_parts * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       cost_total = cost_total * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       currency   = 'RON'
 WHERE UPPER(currency)='EUR';

-- ── Standalone currency-columned tables ──────────────────────────────────────
UPDATE deplasari
   SET diurna_per_day     = diurna_per_day     * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       diurna_total       = diurna_total       * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       transport_cost     = transport_cost     * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       accommodation_cost = accommodation_cost * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       other_costs        = other_costs        * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       food_cost          = food_cost          * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       advance_paid       = advance_paid       * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       total_cost         = total_cost         * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       currency           = 'RON'
 WHERE UPPER(currency)='EUR';
UPDATE deplasari_payments
   SET amount = amount * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       currency = 'RON'
 WHERE UPPER(currency)='EUR';
UPDATE project_expenses
   SET amount = amount * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       currency = 'RON'
 WHERE UPPER(currency)='EUR';
UPDATE purchase_order_lines
   SET unit_price = unit_price * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       currency = 'RON'
 WHERE UPPER(currency)='EUR';
UPDATE materials
   SET unit_cost = unit_cost * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1),
       currency = 'RON'
 WHERE UPPER(currency)='EUR';

-- ── Implicit-EUR columns (no currency flag): convert ALL rows, but only on an
--    EUR-mode DB. Uses the DB's rate captured BEFORE default_currency flips. ──
UPDATE contracts
   SET sale_price = sale_price * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1)
 WHERE (SELECT default_currency FROM company_settings WHERE id=1)='EUR';
UPDATE projects
   SET estimated_value = estimated_value * (SELECT COALESCE(NULLIF(eur_to_ron_rate,0),5.2409) FROM company_settings WHERE id=1)
 WHERE (SELECT default_currency FROM company_settings WHERE id=1)='EUR';

-- ── Flip the app to RON (LAST — the guards above read the old 'EUR' value) ────
UPDATE company_settings SET default_currency='RON' WHERE id=1;
