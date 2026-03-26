-- Migration 0012: Buyer reputation — reject rate + payment speed tracking
-- CAN-223: Buyer trust score columns on trust_scores table

-- Add buyer-side metrics to trust_scores (same table, buyer_ prefix)
ALTER TABLE trust_scores ADD COLUMN buyer_total_purchases INTEGER DEFAULT 0;
ALTER TABLE trust_scores ADD COLUMN buyer_reject_count INTEGER DEFAULT 0;
ALTER TABLE trust_scores ADD COLUMN buyer_reject_rate REAL DEFAULT 0;
ALTER TABLE trust_scores ADD COLUMN buyer_avg_pay_speed_hrs REAL DEFAULT 0;
ALTER TABLE trust_scores ADD COLUMN buyer_trust_score REAL DEFAULT 0;
