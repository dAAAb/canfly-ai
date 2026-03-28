-- Rollback 0022_buyer_wallet.sql
DROP INDEX IF EXISTS idx_tasks_buyer_wallet;
ALTER TABLE tasks DROP COLUMN buyer_wallet;
