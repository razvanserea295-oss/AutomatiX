-- 073: Per-user dashboard widget configuration.
--
-- The Dashboard renders ~10 widgets (KPI strip, time range, nav grid, AI
-- summary, briefing, revenue chart, inbox, projects table, alerts, stock,
-- production stages, activity). Admins want to tailor what each user sees
-- — e.g. hide the financiar KPI for the hala foreman, hide nav grid for
-- power users who use keyboard shortcuts.
--
-- Storage shape: JSON object mapping widget id → boolean (visible).
-- Missing keys default to TRUE so existing users keep seeing everything.
-- Example:
--   { "kpi_strip": true, "ai_summary": false, "alerts": true }
--
-- Admin updates via the Sistem → Utilizatori page; the dashboard reads
-- `user.dashboard_config` and conditionally renders each widget.

ALTER TABLE users ADD COLUMN dashboard_config TEXT;
