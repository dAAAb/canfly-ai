-- Migration 0001: Initial schema for Flight Community
-- Tables: users, agents, skills, hardware, rankings_cache, rankings_history, activity_log

-- ── Users ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  username       TEXT PRIMARY KEY,           -- unique, URL-safe (e.g. "dAAAb")
  display_name   TEXT NOT NULL DEFAULT '',   -- 顯示名稱
  wallet_address TEXT,                       -- 0x... for gradient + verification
  avatar_url     TEXT,
  bio            TEXT,
  links          TEXT NOT NULL DEFAULT '{}', -- JSON: { x?, github?, website?, basename?, ens? }
  is_public      INTEGER NOT NULL DEFAULT 1, -- boolean
  edit_token     TEXT NOT NULL,              -- MVP auth token
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Agents ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  name             TEXT PRIMARY KEY,           -- "LittleLobster"
  owner_username   TEXT,                       -- FK → users; NULL = free agent
  wallet_address   TEXT,
  basename         TEXT,                       -- "littl3lobst3r.base.eth"
  platform         TEXT NOT NULL DEFAULT 'other', -- 'openclaw' | 'other'
  avatar_url       TEXT,
  bio              TEXT,
  model            TEXT,                       -- primary model used
  hosting          TEXT,                       -- "Mac Mini M4 Pro (local)"
  capabilities     TEXT NOT NULL DEFAULT '{}', -- JSON: { videoCall?, chat?, email? }
  erc8004_url      TEXT,                       -- BaseMail ERC-8004 page link
  is_public        INTEGER NOT NULL DEFAULT 1,
  edit_token       TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_username) REFERENCES users(username) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_agents_owner ON agents(owner_username);

-- ── Skills ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skills (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name  TEXT NOT NULL,
  name        TEXT NOT NULL,              -- "ElevenLabs TTS"
  slug        TEXT,                       -- links to CanFly product page
  description TEXT,
  FOREIGN KEY (agent_name) REFERENCES agents(name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_skills_agent ON skills(agent_name);

-- ── Hardware ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hardware (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  name     TEXT NOT NULL,                -- "Mac Mini M4 Pro"
  slug     TEXT,                         -- links to CanFly product page
  role     TEXT,                         -- "主要開發機"
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hardware_user ON hardware(username);

-- ── Rankings Cache ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rankings_cache (
  key        TEXT PRIMARY KEY,           -- unique cache key
  category   TEXT NOT NULL,              -- 'skills' | 'hardware' | 'models'
  data       TEXT NOT NULL DEFAULT '{}', -- JSON payload
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rankings_cache_category ON rankings_cache(category);

-- ── Rankings History ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rankings_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  key         TEXT NOT NULL,
  category    TEXT NOT NULL,              -- 'skills' | 'hardware' | 'models'
  data        TEXT NOT NULL DEFAULT '{}', -- JSON payload
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rankings_history_key ON rankings_history(key);
CREATE INDEX IF NOT EXISTS idx_rankings_history_recorded ON rankings_history(recorded_at);

-- ── Activity Log ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,              -- 'user' | 'agent'
  entity_id   TEXT NOT NULL,              -- username or agent name
  action      TEXT NOT NULL,              -- 'joined', 'added_skill', etc.
  metadata    TEXT NOT NULL DEFAULT '{}', -- JSON
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);
