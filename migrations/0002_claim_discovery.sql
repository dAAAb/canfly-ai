-- Migration 0002: User claiming, verification levels, and scraping fields
-- Adds discovery/claim workflow support for scraped community profiles

-- ── Users: claiming & verification ────────────────────────────────────
ALTER TABLE users ADD COLUMN source             TEXT NOT NULL DEFAULT 'seed';       -- 'seed' | 'scraped' | 'registered'
ALTER TABLE users ADD COLUMN claimed            INTEGER NOT NULL DEFAULT 1;         -- 0 = unclaimed scraped profile, 1 = claimed
ALTER TABLE users ADD COLUMN claimed_at         TEXT;                               -- datetime when user claimed their profile
ALTER TABLE users ADD COLUMN scraped_at         TEXT;                               -- datetime when profile was scraped
ALTER TABLE users ADD COLUMN scrape_ref         TEXT;                               -- source URL or reference for scraped data
ALTER TABLE users ADD COLUMN external_ids       TEXT NOT NULL DEFAULT '{}';         -- JSON: { github?, discord?, clawhub?, x? }
ALTER TABLE users ADD COLUMN verification_level TEXT NOT NULL DEFAULT 'none';       -- 'worldid' | 'wallet' | 'github' | 'email' | 'none'

-- ── Agents: discovery tracking ────────────────────────────────────────
ALTER TABLE agents ADD COLUMN source            TEXT NOT NULL DEFAULT 'seed';       -- 'seed' | 'scraped' | 'registered'
ALTER TABLE agents ADD COLUMN discovered_at     TEXT;                               -- datetime when agent was discovered

-- ── Indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_source     ON users(source);
CREATE INDEX IF NOT EXISTS idx_users_claimed    ON users(claimed);
CREATE INDEX IF NOT EXISTS idx_users_verification ON users(verification_level);
CREATE INDEX IF NOT EXISTS idx_agents_source    ON agents(source);
