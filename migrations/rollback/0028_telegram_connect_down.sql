-- Rollback: CAN-274 Telegram Connect
-- Drops v3_telegram_connections table and its feature flag.

DROP INDEX IF EXISTS idx_v3_telegram_connections_status;
DROP INDEX IF EXISTS idx_v3_telegram_connections_owner;
DROP INDEX IF EXISTS idx_v3_telegram_connections_agent;
DROP TABLE IF EXISTS v3_telegram_connections;

DELETE FROM feature_flags WHERE flag_name = 'v3_tg_connect';
