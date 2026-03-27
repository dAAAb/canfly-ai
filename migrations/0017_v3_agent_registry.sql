-- CAN-250: V3 Agent Registry Schema + Migration
-- New v3 agent/team/ownership tables in v3_* namespace
-- Does NOT modify v2 core tables (agents, skills, etc.)

-- ── V3 Teams ──────────────────────────────────────────────────────────
-- Organizational unit for grouping agents
CREATE TABLE IF NOT EXISTS v3_teams (
  id          TEXT PRIMARY KEY,              -- UUID
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,                 -- URL-safe identifier
  description TEXT,
  owner_username TEXT,                       -- FK → users; team creator
  avatar_url  TEXT,
  metadata    TEXT NOT NULL DEFAULT '{}',    -- JSON: extensible team config
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_username) REFERENCES users(username) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v3_teams_slug ON v3_teams(slug);
CREATE INDEX IF NOT EXISTS idx_v3_teams_owner ON v3_teams(owner_username);

-- ── V3 Agent Profiles ─────────────────────────────────────────────────
-- Extended agent metadata for v3 features (Paperclip bridge, marketplace, etc.)
-- Links to existing v2 agents table via agent_name FK
CREATE TABLE IF NOT EXISTS v3_agent_profiles (
  id              TEXT PRIMARY KEY,          -- UUID
  agent_name      TEXT NOT NULL,             -- FK → agents(name), the v2 agent
  team_id         TEXT,                      -- FK → v3_teams; NULL = unaffiliated
  role            TEXT NOT NULL DEFAULT 'member', -- 'owner' | 'admin' | 'member' | 'guest'
  display_name    TEXT,                      -- v3 display override
  status          TEXT NOT NULL DEFAULT 'active', -- 'active' | 'suspended' | 'archived'
  paperclip_agent_id TEXT,                   -- linked Paperclip agent ID (nullable)
  capabilities_v3 TEXT NOT NULL DEFAULT '{}', -- JSON: v3-specific caps
  billing_code    TEXT,                      -- cost attribution tag
  max_budget_cents INTEGER,                  -- monthly spending cap (NULL = unlimited)
  metadata        TEXT NOT NULL DEFAULT '{}', -- JSON: extensible
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (agent_name) REFERENCES agents(name) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES v3_teams(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v3_agent_profiles_agent ON v3_agent_profiles(agent_name);
CREATE INDEX IF NOT EXISTS idx_v3_agent_profiles_team ON v3_agent_profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_v3_agent_profiles_status ON v3_agent_profiles(status);
CREATE INDEX IF NOT EXISTS idx_v3_agent_profiles_paperclip ON v3_agent_profiles(paperclip_agent_id);

-- ── V3 Team Memberships ───────────────────────────────────────────────
-- Many-to-many: agents can belong to multiple teams with different roles
CREATE TABLE IF NOT EXISTS v3_team_memberships (
  id          TEXT PRIMARY KEY,              -- UUID
  team_id     TEXT NOT NULL,                 -- FK → v3_teams
  agent_name  TEXT NOT NULL,                 -- FK → agents(name)
  role        TEXT NOT NULL DEFAULT 'member', -- 'owner' | 'admin' | 'member' | 'guest'
  joined_at   TEXT NOT NULL DEFAULT (datetime('now')),
  invited_by  TEXT,                          -- agent_name or username who invited
  metadata    TEXT NOT NULL DEFAULT '{}',    -- JSON
  FOREIGN KEY (team_id) REFERENCES v3_teams(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_name) REFERENCES agents(name) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v3_team_memberships_unique
  ON v3_team_memberships(team_id, agent_name);
CREATE INDEX IF NOT EXISTS idx_v3_team_memberships_agent ON v3_team_memberships(agent_name);

-- ── V3 Ownership Records ──────────────────────────────────────────────
-- Tracks ownership chain: who owns/controls what agent, with transfer history
CREATE TABLE IF NOT EXISTS v3_ownership_records (
  id              TEXT PRIMARY KEY,          -- UUID
  agent_name      TEXT NOT NULL,             -- FK → agents(name)
  owner_type      TEXT NOT NULL,             -- 'user' | 'team' | 'agent'
  owner_id        TEXT NOT NULL,             -- username, team_id, or agent_name
  ownership_level TEXT NOT NULL DEFAULT 'full', -- 'full' | 'delegated' | 'temporary'
  granted_by      TEXT,                      -- who granted this ownership
  granted_at      TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at      TEXT,                      -- NULL = permanent
  revoked_at      TEXT,                      -- NULL = active
  metadata        TEXT NOT NULL DEFAULT '{}', -- JSON: transfer notes, conditions
  FOREIGN KEY (agent_name) REFERENCES agents(name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_v3_ownership_agent ON v3_ownership_records(agent_name);
CREATE INDEX IF NOT EXISTS idx_v3_ownership_owner ON v3_ownership_records(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_v3_ownership_active
  ON v3_ownership_records(agent_name) WHERE revoked_at IS NULL;

-- ── V3 Agent Permissions ──────────────────────────────────────────────
-- Granular permission grants for v3 operations
CREATE TABLE IF NOT EXISTS v3_agent_permissions (
  id          TEXT PRIMARY KEY,              -- UUID
  agent_name  TEXT NOT NULL,                 -- FK → agents(name)
  permission  TEXT NOT NULL,                 -- e.g. 'marketplace.list', 'escrow.create', 'team.invite'
  scope       TEXT NOT NULL DEFAULT 'global', -- 'global' | 'team' | 'project'
  scope_id    TEXT,                          -- team_id or project_id if scoped
  granted_by  TEXT,                          -- who granted
  granted_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT,                          -- NULL = permanent
  FOREIGN KEY (agent_name) REFERENCES agents(name) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v3_agent_permissions_unique
  ON v3_agent_permissions(agent_name, permission, scope, COALESCE(scope_id, ''));
CREATE INDEX IF NOT EXISTS idx_v3_agent_permissions_agent ON v3_agent_permissions(agent_name);

-- ── Seed: Add v3_agent_registry feature flag ──────────────────────────
INSERT INTO feature_flags (flag_name, scope, scope_id, enabled) VALUES
  ('v3_agent_registry', 'global', NULL, 0);

-- ── Data Integrity Checks (informational) ─────────────────────────────
-- These SELECTs validate schema was created correctly.
-- Run after migration to verify:
--   SELECT COUNT(*) FROM v3_teams;                    -- should be 0
--   SELECT COUNT(*) FROM v3_agent_profiles;           -- should be 0
--   SELECT COUNT(*) FROM v3_team_memberships;         -- should be 0
--   SELECT COUNT(*) FROM v3_ownership_records;        -- should be 0
--   SELECT COUNT(*) FROM v3_agent_permissions;        -- should be 0
--   SELECT COUNT(*) FROM feature_flags WHERE flag_name = 'v3_agent_registry'; -- should be 1
