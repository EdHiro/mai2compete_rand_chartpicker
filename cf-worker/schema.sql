-- D1 schema for tournament check-in service
-- Run: npx wrangler d1 execute tournament-checkin --file cf-worker/schema.sql

CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_checkins_name ON checkins(name);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON checkins(created_at);
