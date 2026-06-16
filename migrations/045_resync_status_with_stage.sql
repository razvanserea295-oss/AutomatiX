-- Resync project.status and piece.status with stage_id.
--
-- Background: status and stage_id were two parallel fields that drifted apart
-- because Kanban drag-drop used to update only stage_id while leaving status
-- alone. Result: a project at stage "Debitare" (3) could still show
-- status='ofertă'. KPIs that count `WHERE status='finalizat'` returned 0
-- even when 4 projects were visibly in the "Finalizat" Kanban column.
--
-- This migration runs ONCE to fix all rows already saved with bad status.
-- Going forward, projectService.update / pieceService.update auto-derive
-- status from stage_id at every write.
--
-- 'blocat' and 'anulat' are flags that can't be expressed by a stage —
-- they're preserved as-is.

-- ── Projects ─────────────────────────────────────────────────────────────
UPDATE projects SET status = CASE
  WHEN status IN ('blocat', 'blocked', 'anulat') THEN status
  WHEN stage_id = 1                              THEN 'ofertă'
  WHEN stage_id = 2                              THEN 'aprobat'
  WHEN stage_id = 8                              THEN 'livrare'
  WHEN stage_id = 9                              THEN 'finalizat'
  WHEN stage_id IS NULL                          THEN status
  ELSE 'în producție'
END
WHERE stage_id IS NOT NULL;

-- ── Pieces ───────────────────────────────────────────────────────────────
UPDATE project_pieces SET status = CASE
  WHEN status IN ('anulat')                      THEN status
  WHEN stage_id = 1                              THEN 'planificat'
  WHEN stage_id = 8                              THEN 'livrat'
  WHEN stage_id = 9                              THEN 'testat'
  WHEN stage_id IN (18, 19)                      THEN 'montat'
  WHEN stage_id IS NULL                          THEN status
  ELSE 'in_productie'
END
WHERE stage_id IS NOT NULL;
