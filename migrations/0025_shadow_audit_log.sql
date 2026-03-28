-- Shadow mode audit log for v3 parallel-run comparison (CAN-249 / CAN-259)
-- Records what v3 would have done without actually executing
CREATE TABLE IF NOT EXISTS shadow_audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  bridge_mode TEXT    NOT NULL DEFAULT 'shadow',  -- 'shadow' | 'active'
  action_type TEXT    NOT NULL,                    -- e.g. 'task_dispatch', 'escrow_create'
  payload     TEXT,                                -- JSON of would-be action
  result      TEXT,                                -- JSON of what would have happened
  agent_id    TEXT,
  user_id     TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shadow_audit_created ON shadow_audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_shadow_audit_action ON shadow_audit_log (action_type);

-- Bridge mode configuration (single-row design)
CREATE TABLE IF NOT EXISTS bridge_config (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  bridge_mode TEXT    NOT NULL DEFAULT 'shadow',  -- 'shadow' | 'active'
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_by  TEXT
);

INSERT OR IGNORE INTO bridge_config (id, bridge_mode) VALUES (1, 'shadow');
