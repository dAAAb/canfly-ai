-- Rollback migration 0013: Remove webhook_url from agents
-- Sprint 16 CAN-226

ALTER TABLE agents DROP COLUMN webhook_url;
