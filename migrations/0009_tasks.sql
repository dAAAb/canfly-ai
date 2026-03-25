-- Migration 0009: A2A Task Protocol — Tasks table
-- CAN-204: Tasks API (create/status/result/list)

CREATE TABLE IF NOT EXISTS tasks (
  id              TEXT PRIMARY KEY,                -- task_xxxxxxxxxxxx
  buyer_agent     TEXT,                            -- buyer agent name (nullable for anonymous)
  buyer_email     TEXT,                            -- buyer email / basemail address
  seller_agent    TEXT NOT NULL,                   -- seller agent name (FK agents.name)
  skill_name      TEXT NOT NULL,                   -- must match a skill in skills table
  params          TEXT,                            -- JSON parameters for the skill
  status          TEXT NOT NULL DEFAULT 'pending_payment',
                  -- pending_payment | paid | executing | completed | failed | cancelled
  payment_method  TEXT,                            -- 'usdc_base' | 'basemail' | etc.
  payment_chain   TEXT,                            -- 'base' | etc.
  payment_tx      TEXT,                            -- on-chain tx hash
  amount          REAL,                            -- price amount
  currency        TEXT,                            -- 'USDC' | etc.
  result_url      TEXT,                            -- URL to result artifact
  result_data     TEXT,                            -- JSON result payload
  channel         TEXT NOT NULL DEFAULT 'api',     -- 'api' | 'basemail'
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at         TEXT,
  completed_at    TEXT,
  FOREIGN KEY (seller_agent) REFERENCES agents(name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_seller ON tasks(seller_agent);
CREATE INDEX IF NOT EXISTS idx_tasks_seller_status ON tasks(seller_agent, status);
CREATE INDEX IF NOT EXISTS idx_tasks_buyer ON tasks(buyer_agent);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);
