-- Add display_name column for human-readable agent names
-- The existing `name` column (PK) serves as the URL slug
ALTER TABLE agents ADD COLUMN display_name TEXT;

-- Backfill: set display_name = name for all existing agents
UPDATE agents SET display_name = name WHERE display_name IS NULL;
