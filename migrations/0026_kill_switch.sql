-- Kill-switch table for global v3 circuit breaker (CAN-249 / CAN-258)
-- Single-row design: id=1 is the global switch
CREATE TABLE IF NOT EXISTS kill_switch (
  id           INTEGER PRIMARY KEY CHECK (id = 1),
  enabled      INTEGER NOT NULL DEFAULT 0,   -- 0 = off, 1 = on (v3 killed)
  triggered_at TEXT,
  triggered_by TEXT,
  reason       TEXT
);

-- Seed the single row as OFF
INSERT OR IGNORE INTO kill_switch (id, enabled) VALUES (1, 0);
