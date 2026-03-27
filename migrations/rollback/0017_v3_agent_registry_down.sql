-- CAN-250: Rollback v3 Agent Registry Schema
-- Drops all v3_* tables and the v3_agent_registry feature flag

-- Remove feature flag
DELETE FROM feature_flags WHERE flag_name = 'v3_agent_registry';

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS v3_agent_permissions;
DROP TABLE IF EXISTS v3_ownership_records;
DROP TABLE IF EXISTS v3_team_memberships;
DROP TABLE IF EXISTS v3_agent_profiles;
DROP TABLE IF EXISTS v3_teams;
