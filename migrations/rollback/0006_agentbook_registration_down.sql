-- Rollback 0006_agentbook_registration.sql
ALTER TABLE agents DROP COLUMN agentbook_registered;
ALTER TABLE agents DROP COLUMN agentbook_tx_hash;
ALTER TABLE agents DROP COLUMN agentbook_human_id;
ALTER TABLE agents DROP COLUMN agentbook_registered_at;
