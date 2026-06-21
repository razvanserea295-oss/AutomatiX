-- 123: Optional time range and recurrence for personal calendar events.

ALTER TABLE personal_calendar_events ADD COLUMN start_time TEXT;
ALTER TABLE personal_calendar_events ADD COLUMN end_time TEXT;
ALTER TABLE personal_calendar_events ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'none';
