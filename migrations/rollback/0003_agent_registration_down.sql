-- Rollback 0003_agent_registration.sql
DROP TABLE IF EXISTS agent_pending_bindings;
ALTER TABLE agents DROP COLUMN api_key;
ALTER TABLE agents DROP COLUMN pairing_code;
ALTER TABLE agents DROP COLUMN pairing_code_expires;
ALTER TABLE agents DROP COLUMN registration_source;
