-- Seed data: dAAAb user + LittleLobster agent
-- Run with: wrangler d1 execute canfly-community --file=migrations/seed.sql

-- ── User: dAAAb ─────────────────────────────────────────────────────────
INSERT OR REPLACE INTO users (username, display_name, wallet_address, avatar_url, bio, links, is_public, edit_token)
VALUES (
  'dAAAb',
  '葛如鈞',
  '0x1234567890abcdef1234567890abcdef12345678',
  NULL,
  'AI 不會取代你，但擁有 AI 的人會。',
  '{"x":"https://x.com/dAAAb","website":"https://juchunko.com","basename":"littl3lobst3r.base.eth"}',
  1,
  'seed-token-daaab-change-me'
);

-- ── Agent: LittleLobster ────────────────────────────────────────────────
INSERT OR REPLACE INTO agents (name, owner_username, wallet_address, basename, platform, avatar_url, bio, model, hosting, capabilities, erc8004_url, is_public, edit_token)
VALUES (
  'LittleLobster',
  'dAAAb',
  '0xabcdef1234567890abcdef1234567890abcdef12',
  'littl3lobst3r.base.eth',
  'openclaw',
  NULL,
  '小龍蝦，dAAAb 的主力 AI Agent。',
  'claude-opus-4-6',
  'Mac Mini M4 Pro (local)',
  '{"videoCall":{"avatarId":"placeholder","connectUrl":"https://canfly.ai/@dAAAb/agent/LittleLobster/call"},"chat":{"endpoint":"https://canfly.ai/api/chat/LittleLobster"}}',
  NULL,
  1,
  'seed-token-littlelobster-change-me'
);

-- ── Skills for LittleLobster ────────────────────────────────────────────
INSERT OR REPLACE INTO skills (agent_name, name, slug, description)
VALUES
  ('LittleLobster', 'Ollama Local LLM', 'ollama', 'Local AI model inference via Ollama'),
  ('LittleLobster', 'ElevenLabs TTS', 'elevenlabs', 'Voice synthesis with ElevenLabs API'),
  ('LittleLobster', 'HeyGen Video', 'heygen', 'AI video generation with HeyGen'),
  ('LittleLobster', 'Brave Search', 'brave-search', 'Web search via Brave Search API');

-- ── Hardware for dAAAb ──────────────────────────────────────────────────
INSERT OR REPLACE INTO hardware (username, name, slug, role)
VALUES
  ('dAAAb', 'Mac Mini M4 Pro (128GB)', 'mac-mini-m4', '主要開發機 / AI 推理伺服器'),
  ('dAAAb', 'HDMI Dummy Plug', 'hdmi-dummy-plug', 'Headless display emulation');

-- ── Activity Log ────────────────────────────────────────────────────────
INSERT INTO activity_log (entity_type, entity_id, action, metadata)
VALUES
  ('user', 'dAAAb', 'joined', '{"source":"seed"}'),
  ('agent', 'LittleLobster', 'created', '{"owner":"dAAAb","source":"seed"}');
