-- CAN-250: Seed data for v3 Agent Registry
-- Creates a default team and verifies schema integrity

-- ── Default team for existing agents ──────────────────────────────────
INSERT OR IGNORE INTO v3_teams (id, name, slug, description, metadata)
VALUES (
  'default-team-001',
  'CanFly Default',
  'canfly-default',
  'Default team for migrated v2 agents',
  '{"migrated_from": "v2", "auto_created": true}'
);

-- ── Data Integrity Checks ─────────────────────────────────────────────
-- Verify all v3 tables exist and are queryable
SELECT 'v3_teams' AS table_name, COUNT(*) AS row_count FROM v3_teams
UNION ALL
SELECT 'v3_agent_profiles', COUNT(*) FROM v3_agent_profiles
UNION ALL
SELECT 'v3_team_memberships', COUNT(*) FROM v3_team_memberships
UNION ALL
SELECT 'v3_ownership_records', COUNT(*) FROM v3_ownership_records
UNION ALL
SELECT 'v3_agent_permissions', COUNT(*) FROM v3_agent_permissions;

-- Verify feature flag exists
SELECT flag_name, enabled FROM feature_flags WHERE flag_name = 'v3_agent_registry';
