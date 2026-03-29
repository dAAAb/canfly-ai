-- Add Privy user ID column to users table for cryptographic auth verification
-- Privy DID format: "did:privy:cmm..." — unique per user
ALTER TABLE users ADD COLUMN privy_user_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_privy_user_id ON users(privy_user_id) WHERE privy_user_id IS NOT NULL;
