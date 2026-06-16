-- Restaurant module: table reservations (rezervări) for restaurant-type tenants
-- (e.g. ZET Burgers). Front-of-house booking: who, when, how many, which table.
-- Manufacturing tenants simply never surface this page.
CREATE TABLE IF NOT EXISTS reservations (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  code             TEXT NOT NULL UNIQUE,
  customer_name    TEXT NOT NULL,
  phone            TEXT,
  party_size       INTEGER NOT NULL DEFAULT 2,
  reservation_date TEXT NOT NULL DEFAULT (date('now')),
  reservation_time TEXT NOT NULL DEFAULT '19:00',
  table_label      TEXT,
  status           TEXT NOT NULL DEFAULT 'confirmata',
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date, reservation_time);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
