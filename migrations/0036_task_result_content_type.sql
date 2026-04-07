-- CAN-289: Add result_content_type column to tasks
-- Stores MIME type of the result file for frontend preview rendering
ALTER TABLE tasks ADD COLUMN result_content_type TEXT;
