-- Seed data: dAAAb user + LittleLobster agent
-- Run with: npm run db:seed:local

-- ── User: dAAAb ─────────────────────────────────────────────────────────
INSERT OR REPLACE INTO users (username, display_name, wallet_address, avatar_url, bio, links, is_public, edit_token)
VALUES (
  'dAAAb',
  '葛如鈞',
  '0xBF494BDa4bA9e5224EfF973d3923660A964338f6',
  NULL,
  'AI × Web3 立法委員。讓每個人都能擁有 AI Agent。',
  '{"x":"dAAAb","website":"juchunko.com","basename":"littl3lobst3r.base.eth"}',
  1,
  'seed-token-daaab-00000000000000'
);

-- ── Agent: LittleLobster ────────────────────────────────────────────────
INSERT OR REPLACE INTO agents (name, owner_username, wallet_address, basename, platform, avatar_url, bio, model, hosting, capabilities, erc8004_url, is_public, edit_token)
VALUES (
  'LittleLobster',
  'dAAAb',
  '0x4b039112Af5b46c9BC95b66dc8d6dCe75d10E689',
  'littl3lobst3r.base.eth',
  'openclaw',
  NULL,
  '🦞 寶博的 AI 小龍蝦助理。會說寶博的聲音、做數位人影片、交易加密貨幣、寫程式。',
  'Claude Opus 4.6',
  'Mac Mini M4 Pro (local)',
  '{"videoCall":{"avatarId":"47996119-0180-48cb-9e97-64e93e0478d8","connectUrl":"/api/avatar/connect"},"email":"littl3lobst3r@basemail.ai"}',
  NULL,
  1,
  'seed-token-littlelobster-00000'
);

-- ── Skills for LittleLobster (12 skills) ──────────────────────────────
DELETE FROM skills WHERE agent_name = 'LittleLobster';
INSERT INTO skills (agent_name, name, slug, description) VALUES
  ('LittleLobster', 'ElevenLabs TTS',           'elevenlabs',     'Voice synthesis — speaks in 寶博''s voice'),
  ('LittleLobster', 'HeyGen Digital Human',      'heygen',         'AI digital human video generation'),
  ('LittleLobster', 'BaseMail',                  NULL,             'Send/receive email via littl3lobst3r@basemail.ai'),
  ('LittleLobster', 'NadMail',                   NULL,             'NAD protocol email integration'),
  ('LittleLobster', 'WalletConnect',             NULL,             'Connect to dApps and sign transactions'),
  ('LittleLobster', 'Crypto Trading (CDC)',       NULL,             'Cryptocurrency trading via Crypto.com API'),
  ('LittleLobster', 'Whisper STT',               NULL,             'Speech-to-text transcription via OpenAI Whisper'),
  ('LittleLobster', 'nano-banana-pro',            NULL,             'AI image generation model'),
  ('LittleLobster', 'ZapCap',                    NULL,             'Automated subtitle generation for videos'),
  ('LittleLobster', 'Switchbot',                 NULL,             'Smart home device control'),
  ('LittleLobster', 'Weather',                   NULL,             'Real-time weather data queries'),
  ('LittleLobster', 'GitHub',                    NULL,             'Repository management and code operations');

-- ── Hardware for dAAAb ──────────────────────────────────────────────────
DELETE FROM hardware WHERE username = 'dAAAb';
INSERT INTO hardware (username, name, slug, role) VALUES
  ('dAAAb', 'Mac Mini M4 Pro 128GB', 'mac-mini-m4-pro', '主要開發機 / AI 推理伺服器'),
  ('dAAAb', 'HDMI Dummy Plug',       'hdmi-dummy-plug', 'Headless display emulation');

-- ── Activity Log ────────────────────────────────────────────────────────
INSERT INTO activity_log (entity_type, entity_id, action, metadata) VALUES
  ('user',  'dAAAb',          'joined',     '{"source":"seed"}'),
  ('agent', 'LittleLobster',  'registered', '{"owner":"dAAAb","source":"seed"}');
