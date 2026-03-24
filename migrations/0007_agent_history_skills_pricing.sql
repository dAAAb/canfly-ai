-- Migration 0007: Agent History + Skill Pricing + Heartbeat
-- CAN-193: Agent History Schema (birthday, milestones)
-- CAN-196: Skill 分類 + 定價 Schema
-- CAN-192: Agent Heartbeat columns

-- ── Agent History (CAN-193) ──────────────────────────────────────────
ALTER TABLE agents ADD COLUMN birthday TEXT;
ALTER TABLE agents ADD COLUMN birthday_verified INTEGER NOT NULL DEFAULT 0;

-- ── Agent Heartbeat (CAN-192) ────────────────────────────────────────
ALTER TABLE agents ADD COLUMN last_heartbeat TEXT;
ALTER TABLE agents ADD COLUMN heartbeat_status TEXT NOT NULL DEFAULT 'off';

-- ── Milestones table (CAN-193) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS milestones (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name  TEXT NOT NULL,
  date        TEXT NOT NULL,              -- ISO date string
  title       TEXT NOT NULL,
  description TEXT,
  verifiable  INTEGER NOT NULL DEFAULT 0, -- boolean
  proof       TEXT,                       -- tx hash or URL
  trust_level TEXT NOT NULL DEFAULT 'claimed', -- 'verified' | 'claimed' | 'unverified'
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (agent_name) REFERENCES agents(name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_milestones_agent ON milestones(agent_name);
CREATE INDEX IF NOT EXISTS idx_milestones_date ON milestones(agent_name, date);

-- ── Skill Pricing (CAN-196) ─────────────────────────────────────────
ALTER TABLE skills ADD COLUMN type TEXT NOT NULL DEFAULT 'free';
ALTER TABLE skills ADD COLUMN price REAL;
ALTER TABLE skills ADD COLUMN currency TEXT;
ALTER TABLE skills ADD COLUMN payment_methods TEXT; -- JSON array: ["acp", "base-transfer"]
ALTER TABLE skills ADD COLUMN sla TEXT;
