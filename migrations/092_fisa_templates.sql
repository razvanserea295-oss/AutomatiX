-- 092: Fișa proiectant templates — schema customizable per produs.
--
-- Until now, every fișă a proiectantul ouvre is initialized from the
-- same hardcoded template (the "Stație betoane M60" form in
-- checklistService.defaultContent). That worked when there was one
-- product type. With multiple product types (cântar auto, linie
-- producție, structuri metalice, etc.) the proiectanții need to be
-- able to define their own templates.
--
-- Per user spec:
--   - Q7: anyone (admin + user) can create a template.
--   - Q18: templates are GLOBAL — every user sees everything anyone
--          else made. No private templates.
--   - Q19: when creating a fișă, the user must EXPLICITLY choose a
--          template every time (no last-used default).
--   - Q8:  schema is SNAPSHOTTED into the fișă at creation. Later
--          edits to the template DO NOT propagate. Each fișă keeps
--          its original schema for stability.
--
-- The default template (the current "Stație betoane M60" structure)
-- is seeded lazily by FisaTemplatesService.ensureDefaultTemplate()
-- on first request — we don't embed the giant JSON in this migration.

CREATE TABLE fisa_templates (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    name               TEXT    NOT NULL,
    description        TEXT,
    schema_json        TEXT    NOT NULL,   -- JSON: sections, fields, tracking grid
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_default         INTEGER NOT NULL DEFAULT 0,
    active             INTEGER NOT NULL DEFAULT 1,
    sort_order         INTEGER NOT NULL DEFAULT 0,
    created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_fisa_templates_active ON fisa_templates(active, sort_order);

-- Link existing checklists to the (eventually-seeded) default template.
-- NULL is fine for now — old fișe simply don't carry a template_id.
ALTER TABLE designer_checklists ADD COLUMN template_id INTEGER REFERENCES fisa_templates(id) ON DELETE SET NULL;
ALTER TABLE designer_checklists ADD COLUMN template_snapshot_name TEXT;
