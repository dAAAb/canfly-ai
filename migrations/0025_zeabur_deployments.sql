-- CAN-251: BYO Zeabur Deploy Callback + Lobster Registration
-- Tracks Zeabur deployment status and auto-registers lobster agents on success.
-- Uses v3_* namespace; does NOT modify v2 core tables.

-- ── Zeabur Deployments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS v3_zeabur_deployments (
  id              TEXT PRIMARY KEY,              -- UUID
  owner_username  TEXT NOT NULL,                 -- FK → users; who triggered the deploy
  agent_name      TEXT,                          -- FK → agents(name); set on successful registration
  zeabur_project_id   TEXT NOT NULL,             -- Zeabur project identifier
  zeabur_service_id   TEXT,                      -- Zeabur service identifier
  zeabur_environment  TEXT DEFAULT 'production', -- deployment environment
  template_id     TEXT,                          -- which template/image was deployed
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'deploying' | 'running' | 'failed' | 'stopped'
  deploy_url      TEXT,                          -- public URL once deployed
  error_code      TEXT,                          -- error code on failure
  error_message   TEXT,                          -- human-readable error detail
  retry_count     INTEGER NOT NULL DEFAULT 0,    -- number of retry attempts
  last_retry_at   TEXT,                          -- timestamp of last retry
  metadata        TEXT NOT NULL DEFAULT '{}',    -- JSON: Zeabur-specific payload data
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_username) REFERENCES users(username) ON DELETE CASCADE,
  FOREIGN KEY (agent_name) REFERENCES agents(name) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_v3_zeabur_deployments_owner
  ON v3_zeabur_deployments(owner_username);
CREATE INDEX IF NOT EXISTS idx_v3_zeabur_deployments_agent
  ON v3_zeabur_deployments(agent_name);
CREATE INDEX IF NOT EXISTS idx_v3_zeabur_deployments_status
  ON v3_zeabur_deployments(status);
CREATE INDEX IF NOT EXISTS idx_v3_zeabur_deployments_zeabur_project
  ON v3_zeabur_deployments(zeabur_project_id);

-- ── Feature flag: v3_zeabur_deploy (OFF by default) ─────────────────
INSERT OR IGNORE INTO feature_flags (flag_name, scope, scope_id, enabled) VALUES
  ('v3_zeabur_deploy', 'global', NULL, 0);
