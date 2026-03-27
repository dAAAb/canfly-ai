-- Rollback 0001_initial.sql — drop all initial tables and indexes
DROP INDEX IF EXISTS idx_activity_log_created;
DROP INDEX IF EXISTS idx_activity_log_entity;
DROP INDEX IF EXISTS idx_rankings_history_recorded;
DROP INDEX IF EXISTS idx_rankings_history_key;
DROP INDEX IF EXISTS idx_rankings_cache_category;
DROP INDEX IF EXISTS idx_hardware_user;
DROP INDEX IF EXISTS idx_skills_agent;
DROP INDEX IF EXISTS idx_agents_owner;

DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS rankings_history;
DROP TABLE IF EXISTS rankings_cache;
DROP TABLE IF EXISTS hardware;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS users;
