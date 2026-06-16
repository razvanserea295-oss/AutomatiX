-- ============================================================================
-- 038: Tip piese + operatii config (per tip)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tip_piese (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tip_piesa_operatii (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tip_piesa_id INTEGER NOT NULL,
    nume TEXT NOT NULL,
    ordine INTEGER NOT NULL DEFAULT 1,
    durata_estimata_ore REAL NOT NULL DEFAULT 1,
    um_materiale TEXT NOT NULL DEFAULT 'buc',
    obligatorie INTEGER NOT NULL DEFAULT 0,
    blocker INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tip_piesa_id) REFERENCES tip_piese(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tip_piesa_op_tip ON tip_piesa_operatii(tip_piesa_id);
CREATE INDEX IF NOT EXISTS idx_tip_piesa_op_ordine ON tip_piesa_operatii(tip_piesa_id, ordine);

-- Seed default tipuri (matches UI DEFAULT_TIP_PIESE)
INSERT OR IGNORE INTO tip_piese (slug, label) VALUES
  ('structura_metalica',    'Structura metalica'),
  ('componenta_mecanica',   'Componenta mecanica'),
  ('subansamblu',           'Subansamblu'),
  ('piesa_debitata',        'Piesa debitata'),
  ('piesa_achizitionata',   'Piesa achizitionata'),
  ('echipament_electric',   'Echipament electric'),
  ('panou_comanda',         'Panou de comanda');
