-- Rollback 0013_agent_webhook_url.sql
ALTER TABLE agents DROP COLUMN webhook_url;
