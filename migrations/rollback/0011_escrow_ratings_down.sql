-- Rollback 0011_escrow_ratings.sql — remove escrow fields, ratings, trust scores
DROP INDEX IF EXISTS idx_ratings_rater;
DROP INDEX IF EXISTS idx_ratings_rated;
DROP INDEX IF EXISTS idx_ratings_task;
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS trust_scores;

ALTER TABLE tasks DROP COLUMN escrow_tx;
ALTER TABLE tasks DROP COLUMN escrow_status;
ALTER TABLE tasks DROP COLUMN sla_deadline;
ALTER TABLE tasks DROP COLUMN confirmed_at;
ALTER TABLE tasks DROP COLUMN rejected_at;
ALTER TABLE tasks DROP COLUMN reject_reason;
