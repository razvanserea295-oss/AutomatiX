-- Migration 024: Fix missing indexes on FK columns, normalize project status, add updated_at columns
-- All index statements are idempotent (IF NOT EXISTS)
-- All UPDATE statements only affect rows with non-canonical values

-- ============================================
-- SECTION 1: Missing indexes on FK columns
-- ============================================

-- piece_material_requirements.material_id (FK to materials, no index)
CREATE INDEX IF NOT EXISTS idx_piece_mat_req_material ON piece_material_requirements(material_id);

-- moderation_reports.reporter_user_id (FK to users, no index)
CREATE INDEX IF NOT EXISTS idx_moderation_reports_reporter ON moderation_reports(reporter_user_id);

-- moderation_reports.assigned_to_user_id (FK to users, no index)
CREATE INDEX IF NOT EXISTS idx_moderation_reports_assigned ON moderation_reports(assigned_to_user_id);

-- project_workers.worker_id (FK to workers — composite unique exists but single-column needed for worker-first JOINs)
CREATE INDEX IF NOT EXISTS idx_project_workers_worker_id ON project_workers(worker_id);

-- stage_transitions.user_id (FK to users, no index)
CREATE INDEX IF NOT EXISTS idx_stage_transitions_user_id ON stage_transitions(user_id);

-- stage_transitions.from_stage_id (FK to project_stages, no index)
CREATE INDEX IF NOT EXISTS idx_stage_transitions_from_stage ON stage_transitions(from_stage_id);

-- stage_transitions.to_stage_id (FK to project_stages, no index)
CREATE INDEX IF NOT EXISTS idx_stage_transitions_to_stage ON stage_transitions(to_stage_id);

-- material_consumptions.created_by (FK to users, no index)
CREATE INDEX IF NOT EXISTS idx_material_consumptions_created_by ON material_consumptions(created_by);

-- project_revenues.created_by (FK to users, no index)
CREATE INDEX IF NOT EXISTS idx_project_revenues_created_by ON project_revenues(created_by);

-- project_activity.user_id (FK to users, no index)
CREATE INDEX IF NOT EXISTS idx_project_activity_user_id ON project_activity(user_id);

-- time_entries.created_by (FK to users, no index)
CREATE INDEX IF NOT EXISTS idx_time_entries_created_by ON time_entries(created_by);

-- time_entries.stage_id (FK to project_stages, no index)
CREATE INDEX IF NOT EXISTS idx_time_entries_stage_id ON time_entries(stage_id);

-- bon_consums.created_by (FK to users, no index)
CREATE INDEX IF NOT EXISTS idx_bon_consums_created_by ON bon_consums(created_by);

-- bon_consums.stage_id (FK to project_stages, no index)
CREATE INDEX IF NOT EXISTS idx_bon_consums_stage_id ON bon_consums(stage_id);

-- avize.supplier_id (FK to suppliers, no index)
CREATE INDEX IF NOT EXISTS idx_avize_supplier_id ON avize(supplier_id);

-- avize.created_by (FK to users, no index)
CREATE INDEX IF NOT EXISTS idx_avize_created_by ON avize(created_by);

-- invoices.supplier_id (FK to suppliers, no index)
CREATE INDEX IF NOT EXISTS idx_invoices_supplier_id ON invoices(supplier_id);

-- invoices.created_by (FK to users, no index)
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);

-- station_change_requests.assignee_id (FK to users, no index)
CREATE INDEX IF NOT EXISTS idx_station_change_requests_assignee ON station_change_requests(assignee_id);

-- station_service_interventions.technician_id (FK to users, no index)
CREATE INDEX IF NOT EXISTS idx_station_interventions_technician ON station_service_interventions(technician_id);

-- station_maintenance_plans.assignee_id (FK to users, no index)
CREATE INDEX IF NOT EXISTS idx_station_maintenance_plans_assignee ON station_maintenance_plans(assignee_id);

-- station_parts_requests.material_id (FK to materials, no index)
CREATE INDEX IF NOT EXISTS idx_station_parts_requests_material ON station_parts_requests(material_id);

-- alerts.acknowledged_by (FK to users, no index)
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged_by ON alerts(acknowledged_by);

-- installed_stations.internal_manager_id (FK to users, no index)
CREATE INDEX IF NOT EXISTS idx_installed_stations_manager ON installed_stations(internal_manager_id);

-- project_comments.stage_id (no FK constraint defined — index compensates for query performance)
CREATE INDEX IF NOT EXISTS idx_project_comments_stage_id ON project_comments(stage_id);

-- ============================================
-- SECTION 2: Normalize project status values
-- ============================================
-- Canonical values (from validate_status in project_service.rs):
--   "ofertă", "aprobat", "în producție", "livrare", "finalizat", "blocat"

UPDATE projects SET status = 'în producție' WHERE status IN ('in_producție', 'in_productie', 'active', 'delayed');
UPDATE projects SET status = 'finalizat' WHERE status IN ('completed', 'fabricat');
UPDATE projects SET status = 'blocat' WHERE status = 'blocked';
UPDATE projects SET status = 'ofertă' WHERE status IN ('draft', 'planificat');

-- ============================================
-- SECTION 3: Add updated_at to frequently modified tables
-- ============================================

ALTER TABLE workers ADD COLUMN updated_at TEXT;
ALTER TABLE suppliers ADD COLUMN updated_at TEXT;
ALTER TABLE project_custom_stages ADD COLUMN updated_at TEXT;
ALTER TABLE piece_assignments ADD COLUMN updated_at TEXT;

-- Backfill existing rows with current timestamp
UPDATE workers SET updated_at = datetime('now') WHERE updated_at IS NULL;
UPDATE suppliers SET updated_at = datetime('now') WHERE updated_at IS NULL;
UPDATE project_custom_stages SET updated_at = datetime('now') WHERE updated_at IS NULL;
UPDATE piece_assignments SET updated_at = datetime('now') WHERE updated_at IS NULL;
