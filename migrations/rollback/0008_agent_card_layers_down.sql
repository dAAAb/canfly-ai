-- Rollback 0008_agent_card_layers.sql
ALTER TABLE agents DROP COLUMN agent_card_override;
ALTER TABLE agents DROP COLUMN basemail_handle;
ALTER TABLE agents DROP COLUMN basemail_cached_at;
