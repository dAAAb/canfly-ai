-- Feature flags table for v3 gating (CAN-249 / CAN-256)
-- Supports global, per-team, and per-user scopes
CREATE TABLE IF NOT EXISTS feature_flags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_name  TEXT    NOT NULL,
  scope      TEXT    NOT NULL DEFAULT 'global',  -- 'global' | 'team' | 'user'
  scope_id   TEXT,                                -- NULL for global, team/user ID otherwise
  enabled    INTEGER NOT NULL DEFAULT 0,          -- 0 = off, 1 = on
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (flag_name, scope, scope_id)
);

-- Seed all v3 flags as globally OFF
INSERT OR IGNORE INTO feature_flags (flag_name, scope, scope_id, enabled) VALUES
  ('v3_routing',           'global', NULL, 0),
  ('v3_paperclip_bridge',  'global', NULL, 0),
  ('v3_escrow',            'global', NULL, 0),
  ('v3_marketplace',       'global', NULL, 0),
  ('v3_tg_pm',             'global', NULL, 0);
