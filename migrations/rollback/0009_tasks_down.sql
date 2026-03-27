-- Rollback 0009_tasks.sql — drop tasks table
DROP INDEX IF EXISTS idx_tasks_created;
DROP INDEX IF EXISTS idx_tasks_buyer;
DROP INDEX IF EXISTS idx_tasks_seller_status;
DROP INDEX IF EXISTS idx_tasks_seller;
DROP TABLE IF EXISTS tasks;
