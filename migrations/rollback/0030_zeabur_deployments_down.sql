-- Rollback: CAN-251 Zeabur Deployments
-- Drops v3_zeabur_deployments table and its feature flag.

DROP INDEX IF EXISTS idx_v3_zeabur_deployments_zeabur_project;
DROP INDEX IF EXISTS idx_v3_zeabur_deployments_status;
DROP INDEX IF EXISTS idx_v3_zeabur_deployments_agent;
DROP INDEX IF EXISTS idx_v3_zeabur_deployments_owner;
DROP TABLE IF EXISTS v3_zeabur_deployments;

DELETE FROM feature_flags WHERE flag_name = 'v3_zeabur_deploy';
