-- 095: One-time cleanup of orphan rows referencing deleted projects.
--
-- Background: the user deleted all projects through the UI, but the
-- dashboard still reported 1023 pieces "in production" and 18,500 EUR
-- "revenue this month". An inspection script showed the rows were
-- completely orphaned — their project_id values point to project IDs
-- that no longer exist in the `projects` table.
--
-- Root cause: SQLite enforces `ON DELETE CASCADE` only for DELETE
-- operations issued while `PRAGMA foreign_keys = ON`. The migration
-- runner toggles FK OFF before each migration and ON afterward. The
-- legacy deletes that left these orphans happened during an OFF
-- window. `ProjectService.delete` is also patched in this commit to
-- do an explicit cascade, so future deletes won't repeat the issue.
--
-- This migration targets ONLY tables that exist in this database
-- variant. Optional tables that may not exist (project_activities,
-- project_documents, etc.) are intentionally omitted — adding them
-- would crash the whole migration because SQL doesn't have a portable
-- "DELETE IF TABLE EXISTS". If those tables get added later, write a
-- follow-up migration with their own cleanup.

-- ---- direct children of projects ------------------------------------
DELETE FROM project_pieces
 WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = project_pieces.project_id);

DELETE FROM project_custom_stages
 WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = project_custom_stages.project_id);

DELETE FROM project_revenues
 WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = project_revenues.project_id);

DELETE FROM project_expenses
 WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = project_expenses.project_id);

DELETE FROM project_handoffs
 WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = project_handoffs.project_id);

DELETE FROM project_briefings
 WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = project_briefings.project_id);

DELETE FROM project_finance_overrides
 WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = project_finance_overrides.project_id);

-- ---- transitive (via piece_id → project_pieces, cleaned above) -------
DELETE FROM piece_assignments
 WHERE NOT EXISTS (SELECT 1 FROM project_pieces pp WHERE pp.id = piece_assignments.piece_id);

DELETE FROM piece_order_tracking
 WHERE NOT EXISTS (SELECT 1 FROM project_pieces pp WHERE pp.id = piece_order_tracking.piece_id);

-- ---- material_consumptions has optional project_id ------------------
DELETE FROM material_consumptions
 WHERE project_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = material_consumptions.project_id);

-- ---- sales_leads.converted_project_id back-reference ----------------
-- Don't delete the leads; they're independent entities. Just null-out the
-- broken project pointer so the lead detail page doesn't show a ghost
-- "convertit în proiect XXX" link to nowhere.
UPDATE sales_leads
   SET converted_project_id = NULL
 WHERE converted_project_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = sales_leads.converted_project_id);
