-- Migration 0004: Add owner_invite_code to users table
-- Allows users to generate an invite code that agents use during self-registration

ALTER TABLE users ADD COLUMN owner_invite_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_owner_invite_code ON users(owner_invite_code);
