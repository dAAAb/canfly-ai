-- Rollback 0010_task_completion.sql
ALTER TABLE tasks DROP COLUMN started_at;
