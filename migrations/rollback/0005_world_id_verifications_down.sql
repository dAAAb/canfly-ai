-- Rollback 0005_world_id_verifications.sql — drop world ID table
DROP INDEX IF EXISTS idx_world_id_wallet;
DROP TABLE IF EXISTS world_id_verifications;
