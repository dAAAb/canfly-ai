-- Migration 0011: Escrow fields + Ratings & Trust Scores tables
-- CAN-225: D1 Migration for escrow, ratings, trust_scores

-- 1. Add escrow columns to tasks table
ALTER TABLE tasks ADD COLUMN escrow_tx TEXT;
ALTER TABLE tasks ADD COLUMN escrow_status TEXT DEFAULT 'none';
ALTER TABLE tasks ADD COLUMN sla_deadline TEXT;
ALTER TABLE tasks ADD COLUMN confirmed_at TEXT;
ALTER TABLE tasks ADD COLUMN rejected_at TEXT;
ALTER TABLE tasks ADD COLUMN reject_reason TEXT;

-- 2. Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id          TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL,
  rater_agent TEXT NOT NULL,
  rated_agent TEXT NOT NULL,
  role        TEXT NOT NULL,                -- 'buyer' | 'seller'
  score       INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
  comment     TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ratings_task ON ratings(task_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rated ON ratings(rated_agent);
CREATE INDEX IF NOT EXISTS idx_ratings_rater ON ratings(rater_agent);

-- 3. Trust scores table
CREATE TABLE IF NOT EXISTS trust_scores (
  agent_name      TEXT PRIMARY KEY,
  completion_rate REAL DEFAULT 0,
  avg_rating      REAL DEFAULT 0,
  total_tasks     INTEGER DEFAULT 0,
  total_ratings   INTEGER DEFAULT 0,
  reject_count    INTEGER DEFAULT 0,
  timeout_count   INTEGER DEFAULT 0,
  trust_score     REAL DEFAULT 0,
  updated_at      TEXT
);
