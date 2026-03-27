-- Rollback 0003_agent_registration.sql — remove agent self-registration
DROP INDEX IF EXISTS idx_pending_bindings_agent;
DROP INDEX IF EXISTS idx_pending_bindings_invite;
DROP TABLE IF EXISTS agent_pending_bindings;

DROP INDEX IF EXISTS idx_agents_pairing_code;
DROP INDEX IF EXISTS idx_agents_api_key;

ALTER TABLE agents DROP COLUMN api_key;
ALTER TABLE agents DROP COLUMN pairing_code;
ALTER TABLE agents DROP COLUMN pairing_code_expires;
ALTER TABLE agents DROP COLUMN registration_source;
