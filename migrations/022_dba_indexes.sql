-- DBA: indexi suplimentari pentru filtre / JOIN / ORDER BY frecvente
-- (SQLite: fără modificare FK aici — alterarea ON DELETE necesită recreare tabele)

-- Documente: listări ORDER BY uploaded_at (global și per proiect)
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_project_uploaded ON documents(project_id, uploaded_at DESC);

-- Compliance: JOIN pe project_id / owner (extensii viitoare de filtrare)
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_project_id ON compliance_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_owner_user_id ON compliance_tasks(owner_user_id);

-- Stații: căutări după proiect (FK există; lipsea index non-PK)
CREATE INDEX IF NOT EXISTS idx_installed_stations_project_id ON installed_stations(project_id);

-- Sub-tabele stații: filtre tipice după station_id (FK există fără index explicit)
CREATE INDEX IF NOT EXISTS idx_station_change_requests_station ON station_change_requests(station_id);
CREATE INDEX IF NOT EXISTS idx_station_interventions_station ON station_service_interventions(station_id);
CREATE INDEX IF NOT EXISTS idx_station_maintenance_plans_station ON station_maintenance_plans(station_id);
CREATE INDEX IF NOT EXISTS idx_station_parts_requests_station ON station_parts_requests(station_id);
CREATE INDEX IF NOT EXISTS idx_station_activity_log_station ON station_activity_log(station_id);
CREATE INDEX IF NOT EXISTS idx_station_parts_intervention ON station_parts_requests(intervention_id);

-- Comentarii proiect: rapoarte per utilizator
CREATE INDEX IF NOT EXISTS idx_project_comments_user_id ON project_comments(user_id);

-- Piese: sortare în listă pe proiect
CREATE INDEX IF NOT EXISTS idx_project_pieces_project_sort ON project_pieces(project_id, sort_order);
