-- Rollback 0007_agent_history_skills_pricing.sql — remove milestones, history, skill pricing
DROP INDEX IF EXISTS idx_milestones_date;
DROP INDEX IF EXISTS idx_milestones_agent;
DROP TABLE IF EXISTS milestones;

ALTER TABLE agents DROP COLUMN birthday;
ALTER TABLE agents DROP COLUMN birthday_verified;
ALTER TABLE agents DROP COLUMN last_heartbeat;
ALTER TABLE agents DROP COLUMN heartbeat_status;

ALTER TABLE skills DROP COLUMN type;
ALTER TABLE skills DROP COLUMN price;
ALTER TABLE skills DROP COLUMN currency;
ALTER TABLE skills DROP COLUMN payment_methods;
ALTER TABLE skills DROP COLUMN sla;
