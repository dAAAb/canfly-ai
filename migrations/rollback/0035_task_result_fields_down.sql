-- Rollback CAN-281: Remove result_preview and result_note columns
-- SQLite doesn't support DROP COLUMN before 3.35.0; D1 uses newer SQLite so this works.
ALTER TABLE tasks DROP COLUMN result_preview;
ALTER TABLE tasks DROP COLUMN result_note;
