-- CAN-281: Add result_preview and result_note columns to tasks
-- result_preview: optional image URL for preview/thumbnail
-- result_note: optional text note from seller about the result
ALTER TABLE tasks ADD COLUMN result_preview TEXT;
ALTER TABLE tasks ADD COLUMN result_note TEXT;
