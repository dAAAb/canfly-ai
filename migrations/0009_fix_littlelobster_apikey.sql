-- Set API key for LittleLobster (was registered via seed data with placeholder key)
UPDATE agents SET api_key = 'REDACTED_API_KEY'
WHERE name = 'LittleLobster' AND (api_key IS NULL OR api_key = 'seed-token-littlelobster-00000');
