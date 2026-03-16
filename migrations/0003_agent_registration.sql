-- Migration 0003: Agent self-registration API support
-- Adds api_key, pairing_code, registration_source to agents
-- Creates agent_pending_bindings table for owner invite pairing

-- ── Agents: registration fields ─────────────────────────────────────
ALTER TABLE agents ADD COLUMN api_key                TEXT;          -- Agent's own API key for self-update
ALTER TABLE agents ADD COLUMN pairing_code           TEXT;          -- 6-segment code (e.g. CLAW-8K2M-X9F3), 24hr validity
ALTER TABLE agents ADD COLUMN pairing_code_expires   TEXT;          -- datetime when pairing code expires
ALTER TABLE agents ADD COLUMN registration_source    TEXT;          -- 'self' | 'manual' | 'openclaw'

-- ── Indexes ─────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_api_key       ON agents(api_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_pairing_code  ON agents(pairing_code);

-- ── Agent Pending Bindings ──────────────────────────────────────────
-- Tracks owner_invite → agent pairing for confirmation workflow
CREATE TABLE IF NOT EXISTS agent_pending_bindings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name      TEXT NOT NULL,                       -- FK → agents
  owner_invite    TEXT NOT NULL,                       -- invite code provided by agent
  status          TEXT NOT NULL DEFAULT 'pending',     -- 'pending' | 'confirmed' | 'rejected'
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at    TEXT,
  FOREIGN KEY (agent_name) REFERENCES agents(name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pending_bindings_invite ON agent_pending_bindings(owner_invite);
CREATE INDEX IF NOT EXISTS idx_pending_bindings_agent  ON agent_pending_bindings(agent_name);
