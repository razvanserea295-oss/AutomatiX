-- 107: BNR exchange-rate history.
--
-- Item #4 (upgrade): the *current* EUR/RON rate already lives in
-- company_settings.eur_to_ron_rate (refreshed daily from the official BNR feed
-- https://www.bnr.ro/nbrfxrates.xml). This table keeps the HISTORY of every
-- published rate so the Setări screen can show a trend and so historical
-- conversions can use the rate that was in force on a given day.
--
-- Additive & reversible: company_settings stays the source of truth for "the
-- rate right now"; this is a supplementary log written alongside each refresh.
-- One authoritative row per (currency, published_date) — re-fetching the same
-- BNR publishing day updates that row's value/fetched_at instead of piling up
-- duplicates (INSERT OR REPLACE on the UNIQUE index below).

CREATE TABLE IF NOT EXISTS bnr_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    currency TEXT NOT NULL DEFAULT 'EUR',
    rate REAL NOT NULL,
    published_date TEXT,                       -- BNR <PublishingDate> (may be NULL)
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    source TEXT NOT NULL DEFAULT 'bnr'          -- 'bnr' | 'manual' | 'seed'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bnr_rates_currency_day
    ON bnr_rates(currency, published_date);

CREATE INDEX IF NOT EXISTS idx_bnr_rates_fetched
    ON bnr_rates(currency, fetched_at DESC);

-- Seed the history with whatever rate is currently stored, so the screen isn't
-- empty before the first post-migration refresh. Guarded so it's a no-op when
-- there's no usable rate yet.
INSERT INTO bnr_rates (currency, rate, published_date, fetched_at, source)
SELECT 'EUR', eur_to_ron_rate, NULL,
       COALESCE(eur_to_ron_rate_updated_at, datetime('now')),
       COALESCE(eur_to_ron_rate_source, 'seed')
FROM company_settings
WHERE id = 1 AND eur_to_ron_rate IS NOT NULL AND eur_to_ron_rate > 0;
