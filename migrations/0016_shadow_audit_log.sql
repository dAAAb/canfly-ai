-- CAN-259: Shadow Mode — Audit logging for v3 bridge operations
-- Logs what v3 WOULD do without executing, enabling safe comparison with v2

CREATE TABLE IF NOT EXISTS shadow_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT NOT NULL,
  input_payload TEXT,
  expected_output TEXT,
  actual_v2_output TEXT,
  diff TEXT,
  bridge_mode TEXT NOT NULL DEFAULT 'shadow',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for querying by operation type and time
CREATE INDEX IF NOT EXISTS idx_shadow_audit_operation
  ON shadow_audit_log (operation, created_at DESC);

-- Seed bridge_mode feature flag (OFF by default)
INSERT INTO feature_flags (flag_name, scope, scope_id, enabled) VALUES
  ('v3_bridge_mode', 'global', NULL, 0);
