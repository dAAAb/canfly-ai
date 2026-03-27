-- Rollback 0012_buyer_reputation.sql — remove buyer trust columns
ALTER TABLE trust_scores DROP COLUMN buyer_total_purchases;
ALTER TABLE trust_scores DROP COLUMN buyer_reject_count;
ALTER TABLE trust_scores DROP COLUMN buyer_reject_rate;
ALTER TABLE trust_scores DROP COLUMN buyer_avg_pay_speed_hrs;
ALTER TABLE trust_scores DROP COLUMN buyer_trust_score;
