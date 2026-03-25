-- Rollback 0011: Escrow fields + Ratings & Trust Scores tables
-- ⚠️ SQLite doesn't support DROP COLUMN before 3.35.0
-- Use ALTER TABLE ... DROP COLUMN if CF D1 supports it, otherwise recreate table

-- 1. Drop trust_scores table
DROP TABLE IF EXISTS trust_scores;

-- 2. Drop ratings table and indexes
DROP INDEX IF EXISTS idx_ratings_task;
DROP INDEX IF EXISTS idx_ratings_rated;
DROP INDEX IF EXISTS idx_ratings_rater;
DROP TABLE IF EXISTS ratings;

-- 3. Remove escrow columns from tasks (CF D1 supports DROP COLUMN)
ALTER TABLE tasks DROP COLUMN escrow_tx;
ALTER TABLE tasks DROP COLUMN escrow_status;
ALTER TABLE tasks DROP COLUMN sla_deadline;
ALTER TABLE tasks DROP COLUMN confirmed_at;
ALTER TABLE tasks DROP COLUMN rejected_at;
ALTER TABLE tasks DROP COLUMN reject_reason;
