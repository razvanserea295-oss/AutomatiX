-- Restaurant module: floor plan / tables (mese) for restaurant-type tenants
-- (e.g. ZET Burgers). Tracks each table's zone, seats and live status.
-- Manufacturing tenants simply never surface this page.
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  zone        TEXT NOT NULL DEFAULT 'Salon',
  seats       INTEGER NOT NULL DEFAULT 2,
  status      TEXT NOT NULL DEFAULT 'libera',
  notes       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_zone ON restaurant_tables(zone, sort_order);
