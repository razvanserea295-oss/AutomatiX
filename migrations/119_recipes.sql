-- Restaurant module: rețete (recipes) — ingredient list per menu item, for food-cost & margin.
CREATE TABLE IF NOT EXISTS recipe_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_item_id  INTEGER NOT NULL,
  material_id   INTEGER,
  name          TEXT NOT NULL,
  quantity      REAL NOT NULL DEFAULT 0,
  unit          TEXT NOT NULL DEFAULT 'buc',
  unit_cost     REAL NOT NULL DEFAULT 0,
  line_cost     REAL NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_recipe_items_menu ON recipe_items(menu_item_id);
