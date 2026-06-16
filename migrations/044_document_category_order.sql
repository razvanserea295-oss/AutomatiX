-- Persist drag-reorder of document categories. Previously stored only in
-- localStorage which means the order was lost between machines/users.
ALTER TABLE document_categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Seed sort_order from current creation order so existing categories don't
-- jumble on first load after migration.
UPDATE document_categories
SET sort_order = (SELECT COUNT(*) FROM document_categories d2 WHERE d2.id <= document_categories.id);
