-- CAN-256: Feature Flag Matrix for v3 functionality gating
-- Supports global, per-user, and per-team scopes

CREATE TABLE IF NOT EXISTS feature_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global',
  scope_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Each flag+scope+scope_id combination must be unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_flags_unique
  ON feature_flags (flag_name, scope, COALESCE(scope_id, ''));

-- Seed v3 flags (all OFF by default)
INSERT INTO feature_flags (flag_name, scope, scope_id, enabled) VALUES
  ('v3_routing', 'global', NULL, 0),
  ('v3_paperclip_bridge', 'global', NULL, 0),
  ('v3_escrow', 'global', NULL, 0),
  ('v3_marketplace', 'global', NULL, 0),
  ('v3_tg_pm', 'global', NULL, 0);
