-- Restaurant module: menu items (produse de meniu) for restaurant-type tenants
-- (e.g. ZET Burgers). Category groups: Burgeri, Garnituri, Băuturi, Deserturi.
-- Manufacturing tenants simply never surface this page.
CREATE TABLE IF NOT EXISTS menu_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'Burgeri',
  price       REAL NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'RON',
  available   INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_menu_items_cat ON menu_items(category, sort_order);
