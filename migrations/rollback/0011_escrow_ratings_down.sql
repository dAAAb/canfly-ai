-- Rollback 0011_escrow_ratings.sql
DROP TABLE IF EXISTS trust_scores;
DROP TABLE IF EXISTS ratings;
ALTER TABLE tasks DROP COLUMN escrow_tx;
ALTER TABLE tasks DROP COLUMN escrow_status;
ALTER TABLE tasks DROP COLUMN sla_deadline;
ALTER TABLE tasks DROP COLUMN confirmed_at;
ALTER TABLE tasks DROP COLUMN rejected_at;
ALTER TABLE tasks DROP COLUMN reject_reason;
