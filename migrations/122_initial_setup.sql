-- 110: Initial-setup wizard fields — company profile, branding & document series.
--
-- Additive & non-destructive. Extends the `company_settings` singleton (id=1,
-- created in 027) with the fields the first-login admin setup wizard collects
-- and the PDF export layer consumes (logo on document headers, fiscal series &
-- numbering). All columns carry safe defaults so historical rows and every
-- existing consumer (Fiscal settings section, PdfService) keep working unchanged.
--
-- The `initial_setup_completed` flag itself lives in the generic key/value
-- `app_settings` table (109) — see SetupService — rather than widening this
-- singleton for a single boolean.

-- Contact details (used on invoice/offer/contract headers).
ALTER TABLE company_settings ADD COLUMN phone TEXT NOT NULL DEFAULT '';
ALTER TABLE company_settings ADD COLUMN email TEXT NOT NULL DEFAULT '';

-- Branding: base64-encoded PNG/JPEG data URIs. Empty = no image (PDF falls back
-- to a text-only header, exactly as today).
ALTER TABLE company_settings ADD COLUMN logo_base64 TEXT NOT NULL DEFAULT '';
ALTER TABLE company_settings ADD COLUMN seal_base64 TEXT NOT NULL DEFAULT '';

-- Fiscal document series + running numbers + a render template. The template
-- placeholders {serie} and {nr} are substituted at issue time; {nr} is the
-- zero-padded running counter.
ALTER TABLE company_settings ADD COLUMN invoice_series TEXT NOT NULL DEFAULT 'FAC';
ALTER TABLE company_settings ADD COLUMN invoice_next_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE company_settings ADD COLUMN offer_series TEXT NOT NULL DEFAULT 'OFR';
ALTER TABLE company_settings ADD COLUMN offer_next_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE company_settings ADD COLUMN aviz_series TEXT NOT NULL DEFAULT 'AVZ';
ALTER TABLE company_settings ADD COLUMN aviz_next_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE company_settings ADD COLUMN number_format TEXT NOT NULL DEFAULT '{serie}-{nr}';
