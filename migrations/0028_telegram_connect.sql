-- CAN-274: Telegram bot connection support
-- Stores Telegram bot token and connection status per agent.
-- Uses v3_* namespace; does NOT modify v2 core tables.

-- ── Telegram Connections ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS v3_telegram_connections (
  id              TEXT PRIMARY KEY,              -- UUID
  agent_name      TEXT NOT NULL,                 -- FK → agents(name)
  owner_username  TEXT NOT NULL,                 -- FK → users(username); who initiated
  bot_token_hash  TEXT NOT NULL,                 -- SHA-256 hash of bot token (for dedup)
  bot_username    TEXT,                          -- @bot_username from Telegram getMe
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'active' | 'failed' | 'disconnected'
  error_message   TEXT,                          -- human-readable error on failure
  connected_at    TEXT,                          -- when gateway confirmed success
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (agent_name) REFERENCES agents(name) ON DELETE CASCADE,
  FOREIGN KEY (owner_username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_v3_telegram_connections_agent
  ON v3_telegram_connections(agent_name);
CREATE INDEX IF NOT EXISTS idx_v3_telegram_connections_owner
  ON v3_telegram_connections(owner_username);
CREATE INDEX IF NOT EXISTS idx_v3_telegram_connections_status
  ON v3_telegram_connections(status);

-- ── Feature flag: v3_tg_connect (OFF by default) ──────────────────────
INSERT OR IGNORE INTO feature_flags (flag_name, scope, scope_id, enabled) VALUES
  ('v3_tg_connect', 'global', NULL, 0);
