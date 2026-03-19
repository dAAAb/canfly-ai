-- Migration 0006: AgentBook on-chain registration tracking
-- Stores AgentBook registration status per agent wallet

ALTER TABLE agents ADD COLUMN agentbook_registered INTEGER NOT NULL DEFAULT 0;  -- 0 = not registered, 1 = registered
ALTER TABLE agents ADD COLUMN agentbook_tx_hash    TEXT;                         -- on-chain tx hash from registration
ALTER TABLE agents ADD COLUMN agentbook_human_id   TEXT;                         -- anonymous human identifier from AgentBook
ALTER TABLE agents ADD COLUMN agentbook_registered_at TEXT;                      -- datetime of registration
