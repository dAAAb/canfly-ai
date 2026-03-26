-- Rollback migration 0001: Drop all Flight Community tables
-- Run with: wrangler d1 execute canfly-community --file=migrations/0001_initial_down.sql

DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS rankings_history;
DROP TABLE IF EXISTS rankings_cache;
DROP TABLE IF EXISTS hardware;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS users;
