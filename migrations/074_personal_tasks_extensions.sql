-- 074: Personal tasks — instructions/notes + structured completion.
--
-- Q2 task management upgrade. Adds:
--   • instructions       — free-text "how to do this", separate from the
--                          short description so creators can paste full
--                          procedures without crowding the title bullet.
--   • notes              — free-text observations from the assignor.
--   • completion_note    — note left by whoever marked the task done.
--   • completion_status  — 'resolved' (default) | 'unresolved' |
--                          'needs_clarification' so the completer can flag
--                          that the task is stuck even when ticked off.
--   • completed_by_user_id — who actually clicked Done. On global/delegated
--                          tasks this is shown so the delegator sees who
--                          did the work (otherwise the user_id of the
--                          assignee was the only available signal, which
--                          becomes ambiguous as soon as anyone forwards or
--                          re-delegates the task).

ALTER TABLE personal_tasks ADD COLUMN instructions TEXT;
ALTER TABLE personal_tasks ADD COLUMN notes TEXT;
ALTER TABLE personal_tasks ADD COLUMN completion_note TEXT;
ALTER TABLE personal_tasks ADD COLUMN completion_status TEXT;
ALTER TABLE personal_tasks ADD COLUMN completed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_personal_tasks_completed_by
  ON personal_tasks(completed_by_user_id);
