-- Rollback 0010_task_completion.sql — remove started_at from tasks
ALTER TABLE tasks DROP COLUMN started_at;
