-- Rollback 0002_claim_discovery.sql — remove discovery columns
-- Note: SQLite does not support DROP COLUMN before 3.35.0
-- These ALTER TABLE DROP COLUMN statements require SQLite ≥ 3.35.0
DROP INDEX IF EXISTS idx_users_source;
DROP INDEX IF EXISTS idx_users_claimed;
DROP INDEX IF EXISTS idx_users_verification;
DROP INDEX IF EXISTS idx_agents_source;
ALTER TABLE users DROP COLUMN source;
ALTER TABLE users DROP COLUMN claimed;
ALTER TABLE users DROP COLUMN claimed_at;
ALTER TABLE users DROP COLUMN scraped_at;
ALTER TABLE users DROP COLUMN scrape_ref;
ALTER TABLE users DROP COLUMN external_ids;
ALTER TABLE users DROP COLUMN verification_level;
ALTER TABLE agents DROP COLUMN source;
ALTER TABLE agents DROP COLUMN discovered_at;
