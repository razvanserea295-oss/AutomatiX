-- Purge stale 'missing_document' alerts.
-- The trigger that generated them was removed in alertService.ts (it spammed
-- every project without docs in the first days), but rows already in the
-- alerts table stay until acknowledged or deleted. This one-time cleanup
-- removes them so Dashboard / AlertsPage stop showing them.

DELETE FROM alerts WHERE type = 'missing_document';
