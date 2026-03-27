-- CAN-258: Kill-switch — Global circuit breaker for v3 features
-- Single-row design: id=1 is the only row, toggled via API

CREATE TABLE IF NOT EXISTS kill_switch (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 0,
  triggered_at TEXT,
  triggered_by TEXT,
  reason TEXT
);

-- Seed the single row (disabled by default)
INSERT INTO kill_switch (id, enabled) VALUES (1, 0);
