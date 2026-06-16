-- 076: Track "clarification pending" on personal_tasks.
--
-- An assignee can ask the delegator for clarifications BEFORE marking
-- the task complete (via `request_task_clarification`). The task stays
-- OPEN, but the assignee is effectively blocked until the delegator
-- responds. We need an explicit flag so the Statusuri tab can show those
-- tasks under "Aștept răspuns" without parsing free-form notes.
--
-- Lifecycle:
--   • requestClarification()  → clarification_pending = 1
--   • reopen() (delegator response) → clarification_pending = 0
--   • update() with status='done' → clarification_pending = 0 (cleared)

ALTER TABLE personal_tasks ADD COLUMN clarification_pending INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_personal_tasks_clarification_pending
  ON personal_tasks(clarification_pending);
