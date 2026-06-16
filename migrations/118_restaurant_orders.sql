-- Restaurant module: comenzi (orders / POS) for restaurant-type tenants (ZET Burgers).
CREATE TABLE IF NOT EXISTS restaurant_orders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT NOT NULL UNIQUE,
  table_label   TEXT,
  order_type    TEXT NOT NULL DEFAULT 'dine_in',   -- dine_in | takeaway | delivery
  customer_name TEXT,
  status        TEXT NOT NULL DEFAULT 'noua',        -- noua | in_preparare | gata | livrata | anulata
  total         REAL NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'RON',
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS restaurant_order_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      INTEGER NOT NULL,
  menu_item_id  INTEGER,
  name          TEXT NOT NULL,
  unit_price    REAL NOT NULL DEFAULT 0,
  quantity      INTEGER NOT NULL DEFAULT 1,
  line_total    REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES restaurant_orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rorder_status ON restaurant_orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_roitem_order ON restaurant_order_items(order_id);
