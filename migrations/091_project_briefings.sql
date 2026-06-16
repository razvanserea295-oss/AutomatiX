-- 091: Project briefings + Q&A clarifications.
--
-- New "intake" channel for engineering work. Replaces the implicit
-- "the proiectant just figures it out from the project notes" workflow
-- with an explicit hand-off where:
--   - The author (sales / manager / proiectant — anyone, per Q9=c) writes
--     up scope + technical requirements + client expectations
--   - The recipient (the proiectant, picked explicitly via dropdown per
--     Q20=a) reads it, can ASK CLARIFICATIONS, then accepts or rejects
--   - On accept the recipient can hit "Create fișa" (Q10=a) to start
--     the actual design work
--
-- Standalone briefings are allowed (project_id NULL, Q21) for cases
-- where sales is preparing a proposal for a lead that hasn't become
-- a project yet. The briefing gets attached when the project is created.
--
-- Clarifications form a Q&A thread per briefing. Per Q22:
--   - Anyone with access can answer (not just the author).
--   - Questions can be re-opened after answering.

CREATE TABLE project_briefings (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    title                 TEXT    NOT NULL,
    project_id            INTEGER REFERENCES projects(id) ON DELETE SET NULL,  -- nullable
    created_by_user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_to_user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    scope                 TEXT,           -- ce trebuie făcut (overview)
    technical_requirements TEXT,           -- specs tehnice, materiale, etc.
    client_expectations   TEXT,           -- ce așteaptă clientul ca rezultat

    deadline              TEXT,           -- YYYY-MM-DD
    priority              TEXT NOT NULL DEFAULT 'medium',  -- low | medium | high | critical
    attachments_json      TEXT,           -- array JSON cu URL-uri / nume fișiere

    -- Workflow status. Note that 'clarification_requested' is automatically
    -- set when the recipient creates a clarification with no answer yet —
    -- it draws the author's attention without requiring manual update.
    status                TEXT NOT NULL DEFAULT 'sent',
                                          -- draft | sent | acknowledged
                                          -- | clarification_requested | accepted
                                          -- | rejected | completed | cancelled
    rejection_reason      TEXT,
    completed_at          TEXT,

    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_briefings_assigned ON project_briefings(assigned_to_user_id, status);
CREATE INDEX idx_briefings_creator  ON project_briefings(created_by_user_id);
CREATE INDEX idx_briefings_project  ON project_briefings(project_id) WHERE project_id IS NOT NULL;

CREATE TABLE briefing_clarifications (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    briefing_id         INTEGER NOT NULL REFERENCES project_briefings(id) ON DELETE CASCADE,

    asked_by_user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question            TEXT    NOT NULL,
    asked_at            TEXT    NOT NULL DEFAULT (datetime('now')),

    answered_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    answer              TEXT,
    answered_at         TEXT,

    status              TEXT    NOT NULL DEFAULT 'pending',  -- pending | answered

    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_clarif_briefing ON briefing_clarifications(briefing_id, status);
