-- ============================================================================
-- 062: Digital signatures (canvas) — for contracts and other documents
-- ============================================================================
--
-- Stores PNG image data (base64) along with signer name, role and
-- timestamp. Polymorphic: target_type/target_id can point to any entity.
-- ============================================================================

CREATE TABLE IF NOT EXISTS signatures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_type TEXT NOT NULL,         -- contract | invoice | aviz | bon_consum | quotation | other
    target_id INTEGER NOT NULL,
    role_label TEXT NOT NULL,          -- "Beneficiar", "Prestator", "Manager", "Proiectant", ...
    signer_name TEXT NOT NULL,
    image_base64 TEXT NOT NULL,        -- PNG data (no `data:image/png;base64,` prefix)
    signed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    signed_at TEXT NOT NULL DEFAULT (datetime('now')),
    ip_address TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_signatures_target ON signatures(target_type, target_id);
