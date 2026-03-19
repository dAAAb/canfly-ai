-- Migration 0005: World ID verification records
-- Stores World ID proof-of-personhood verifications linked to users

CREATE TABLE IF NOT EXISTS world_id_verifications (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  username            TEXT NOT NULL,                       -- FK → users
  wallet              TEXT,                                -- wallet address used during verification
  nullifier_hash      TEXT NOT NULL UNIQUE,                -- World ID nullifier (one per human per action)
  verification_level  TEXT NOT NULL,                       -- 'orb' | 'device'
  world_id_version    TEXT,                                -- protocol version (e.g. 'v2')
  basemail_handle     TEXT,                                -- optional Basemail handle
  verified_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

-- ── Indexes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_world_id_wallet ON world_id_verifications(wallet);
