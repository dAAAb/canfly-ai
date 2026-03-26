-- CAN-226: Add webhook_url to agents for instant post-payment notification
-- Rollback: ALTER TABLE agents DROP COLUMN webhook_url;

ALTER TABLE agents ADD COLUMN webhook_url TEXT;
