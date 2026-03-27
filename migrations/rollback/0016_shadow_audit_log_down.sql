-- Rollback CAN-259: Shadow Mode audit logging

DROP INDEX IF EXISTS idx_shadow_audit_operation;
DROP TABLE IF EXISTS shadow_audit_log;

DELETE FROM feature_flags WHERE flag_name = 'v3_bridge_mode';
