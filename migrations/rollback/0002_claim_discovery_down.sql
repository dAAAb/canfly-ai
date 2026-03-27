-- Rollback 0002_claim_discovery.sql — remove claim/discovery columns
DROP INDEX IF EXISTS idx_users_verification;
DROP INDEX IF EXISTS idx_users_claimed;
DROP INDEX IF EXISTS idx_users_source;
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
