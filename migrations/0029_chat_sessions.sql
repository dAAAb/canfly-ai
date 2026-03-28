-- CAN-273: Embedded Chat Proxy — chat sessions & message history
-- Users can chat with their agents directly within CanFly.
-- Uses v3_* namespace; does NOT modify v2 core tables.

-- ── Chat Sessions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS v3_chat_sessions (
  id              TEXT PRIMARY KEY,              -- UUID
  owner_username  TEXT NOT NULL,                 -- FK → users; the human chatting
  agent_name      TEXT NOT NULL,                 -- FK → agents(name); which agent
  title           TEXT,                          -- auto-generated from first message
  status          TEXT NOT NULL DEFAULT 'active', -- 'active' | 'archived'
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_username) REFERENCES users(username) ON DELETE CASCADE,
  FOREIGN KEY (agent_name) REFERENCES agents(name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_v3_chat_sessions_owner
  ON v3_chat_sessions(owner_username);
CREATE INDEX IF NOT EXISTS idx_v3_chat_sessions_agent
  ON v3_chat_sessions(agent_name);

-- ── Chat Messages ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS v3_chat_messages (
  id          TEXT PRIMARY KEY,                  -- UUID
  session_id  TEXT NOT NULL,                     -- FK → v3_chat_sessions
  role        TEXT NOT NULL,                     -- 'user' | 'assistant'
  content     TEXT NOT NULL,                     -- message text
  metadata    TEXT NOT NULL DEFAULT '{}',        -- JSON: token count, model info, etc.
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES v3_chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_v3_chat_messages_session
  ON v3_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_v3_chat_messages_created
  ON v3_chat_messages(created_at);

-- ── Feature flag: v3_chat_proxy (OFF by default) ─────────────────
INSERT OR IGNORE INTO feature_flags (flag_name, scope, scope_id, enabled) VALUES
  ('v3_chat_proxy', 'global', NULL, 0);
