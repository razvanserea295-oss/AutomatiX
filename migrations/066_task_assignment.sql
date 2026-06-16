-- 066: Allow manager/admin to assign tasks to other users
-- The existing user_id column = the ASSIGNEE (who must do the task)
-- New assigned_by_user_id = who delegated it (NULL = self-created)

ALTER TABLE personal_tasks ADD COLUMN assigned_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_personal_tasks_assigned_by ON personal_tasks(assigned_by_user_id);
