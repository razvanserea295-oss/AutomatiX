-- Daily briefing — store structured breakdown alongside the text summary so
-- the widget can render rich sections (counts, lists, deadlines).
ALTER TABLE daily_briefings ADD COLUMN details_json TEXT;
