-- 090: Piece order tracking — workflow for parts that must come from
-- an external supplier.
--
-- Workflow:
--   requested  — engineer flagged the piece (auto on supplier_code OR
--                manual via "Adaugă cerere"). Procurement sees it as a
--                new request and is expected to act.
--   ordered    — procurement clicked "Confirmă comandă" and (optionally)
--                linked a purchase_order. Engineering sees "în comandă".
--   arrived    — procurement clicked "Confirmă sosire" on goods receipt.
--                Engineering sees "gata de montat".
--   installed  — set either manually OR automatically when the parent
--                `project_pieces.status` advances to 'montat'/'finalizat'.
--
-- Each piece has AT MOST one tracking row at a time (UNIQUE on piece_id).
-- When the supplier_code on the piece changes / is removed, the engineer
-- can clear or re-create the tracking row from the UI; we don't cascade
-- automatically because procurement may have already invested work into
-- an "ordered" row.

CREATE TABLE piece_order_tracking (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    piece_id             INTEGER NOT NULL UNIQUE REFERENCES project_pieces(id) ON DELETE CASCADE,
    status               TEXT    NOT NULL DEFAULT 'requested',
                                 -- 'requested' | 'ordered' | 'arrived' | 'installed' | 'cancelled'
    supplier_code        TEXT,   -- snapshot at the moment of request
    quantity             REAL    NOT NULL DEFAULT 1,
    notes                TEXT,

    -- Who/when each step happened
    requested_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    requested_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    ordered_by_user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ordered_at           TEXT,
    purchase_order_id    INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
    arrived_by_user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    arrived_at           TEXT,
    installed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    installed_at         TEXT,

    created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_pot_status         ON piece_order_tracking(status);
CREATE INDEX idx_pot_supplier_code  ON piece_order_tracking(supplier_code) WHERE supplier_code IS NOT NULL;
CREATE INDEX idx_pot_po             ON piece_order_tracking(purchase_order_id) WHERE purchase_order_id IS NOT NULL;
