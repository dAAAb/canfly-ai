-- Rollback 0004_owner_invite_code.sql
DROP INDEX IF EXISTS idx_users_owner_invite_code;
ALTER TABLE users DROP COLUMN owner_invite_code;
