-- Unified read-only view over both legacy `audit_logs` (plural, migration 001;
-- event-style: action + entity_type + ip_address + free-text details) and the
-- newer `audit_log` (singular, migration 041; diff-style: action + entity +
-- diff_json + denormalized username).
--
-- Both tables stay; their writers stay. This view is the single read surface
-- for compliance / activity reports so a query against it can never miss the
-- other table's events.
--
-- Cutover of writers (consolidating to one schema) is deliberately NOT in this
-- migration — that's a behavior change. This is a pure additive read shim.

DROP VIEW IF EXISTS audit_unified;

CREATE VIEW audit_unified AS
  SELECT
    'audit_logs' AS source,
    id,
    user_id,
    NULL        AS username,
    action,
    entity_type AS entity,
    entity_id,
    details,
    NULL        AS diff_json,
    ip_address,
    created_at
  FROM audit_logs
UNION ALL
  SELECT
    'audit_log' AS source,
    id,
    user_id,
    username,
    action,
    entity      AS entity,
    entity_id,
    NULL        AS details,
    diff_json,
    NULL        AS ip_address,
    created_at
  FROM audit_log;
