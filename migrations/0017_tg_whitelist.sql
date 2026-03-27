-- Migration 0017: Telegram Command Gateway whitelist
-- CAN-254: V3-005 PM Telegram Command Gateway v1

CREATE TABLE IF NOT EXISTS tg_whitelist (
  telegram_user_id  TEXT PRIMARY KEY,          -- Telegram numeric user ID
  label             TEXT,                       -- human-readable label (e.g. "vitalik", "team-ops")
  team              TEXT DEFAULT 'default',     -- team grouping for scoped access
  added_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tg_whitelist_team ON tg_whitelist(team);
