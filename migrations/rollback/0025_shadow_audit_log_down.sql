-- Rollback 0025_shadow_audit_log.sql
DROP TABLE IF EXISTS bridge_config;
DROP INDEX IF EXISTS idx_shadow_audit_created;
DROP INDEX IF EXISTS idx_shadow_audit_action;
DROP TABLE IF EXISTS shadow_audit_log;
