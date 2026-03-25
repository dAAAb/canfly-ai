-- Rollback Migration 0011: Escrow fields + Ratings & Trust Scores
-- CAN-225

-- Drop new tables
DROP TABLE IF EXISTS trust_scores;
DROP TABLE IF EXISTS ratings;

-- SQLite doesn't support DROP COLUMN directly.
-- To rollback escrow columns, recreate tasks table without them:
--
-- 1. CREATE TABLE tasks_backup AS SELECT
--      id, buyer_agent, buyer_email, seller_agent, skill_name, params,
--      status, payment_method, payment_chain, payment_tx, amount, currency,
--      result_url, result_data, channel, created_at, paid_at, completed_at, started_at
--    FROM tasks;
-- 2. DROP TABLE tasks;
-- 3. Recreate tasks with original schema (see 0009 + 0010)
-- 4. INSERT INTO tasks SELECT * FROM tasks_backup;
-- 5. DROP TABLE tasks_backup;
-- 6. Recreate indexes
--
-- ⚠️ Manual rollback required for ALTER TABLE columns in SQLite.
-- The new columns (escrow_tx, escrow_status, sla_deadline, confirmed_at,
-- rejected_at, reject_reason) will remain as nullable columns if not rolled back.
