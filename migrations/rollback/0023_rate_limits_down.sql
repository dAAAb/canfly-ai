-- Rollback 0023_rate_limits.sql
DROP INDEX IF EXISTS idx_rate_limits_window;
DROP TABLE IF EXISTS rate_limits;
