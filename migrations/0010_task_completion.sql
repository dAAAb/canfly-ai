-- Migration 0010: Task completion & delivery enhancements
-- CAN-209: Task completion notification + delivery

-- Track when execution actually started (for execution_time metadata)
ALTER TABLE tasks ADD COLUMN started_at TEXT;
