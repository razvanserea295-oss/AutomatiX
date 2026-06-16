-- 105: Exchange-rate provenance for the EUR/RON rate in company_settings.
--
-- Item #5: the rate is auto-refreshed daily from the official BNR feed
-- (https://www.bnr.ro/nbrfxrates.xml). These columns let the UI show when it
-- was last updated and whether it came from BNR or a manual admin edit.

ALTER TABLE company_settings ADD COLUMN eur_to_ron_rate_updated_at TEXT;
ALTER TABLE company_settings ADD COLUMN eur_to_ron_rate_source TEXT;
