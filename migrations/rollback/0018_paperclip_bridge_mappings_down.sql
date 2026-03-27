-- Rollback: CAN-253 Paperclip Bridge Mappings
DROP INDEX IF EXISTS idx_bridge_unique_mapping;
DROP INDEX IF EXISTS idx_bridge_sync_status;
DROP INDEX IF EXISTS idx_bridge_paperclip_issue;
DROP INDEX IF EXISTS idx_bridge_canfly_task;
DROP TABLE IF EXISTS paperclip_bridge_mappings;
