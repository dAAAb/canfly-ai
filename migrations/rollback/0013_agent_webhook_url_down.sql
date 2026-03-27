-- Rollback 0013_agent_webhook_url.sql — remove webhook_url from agents
ALTER TABLE agents DROP COLUMN webhook_url;
