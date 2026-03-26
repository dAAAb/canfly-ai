-- Rollback 0012: Remove buyer reputation columns
-- SQLite doesn't support DROP COLUMN before 3.35.0, so recreate if needed.
-- For D1 (SQLite 3.41+), DROP COLUMN works:

ALTER TABLE trust_scores DROP COLUMN buyer_total_purchases;
ALTER TABLE trust_scores DROP COLUMN buyer_reject_count;
ALTER TABLE trust_scores DROP COLUMN buyer_reject_rate;
ALTER TABLE trust_scores DROP COLUMN buyer_avg_pay_speed_hrs;
ALTER TABLE trust_scores DROP COLUMN buyer_trust_score;
