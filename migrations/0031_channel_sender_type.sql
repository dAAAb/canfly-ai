-- CAN-276: Channel Identity + Sender Type 區分
-- Adds channel and sender_type to chat sessions so the agent can
-- distinguish owner conversations (CanFly UI) from PM dispatches
-- (Paperclip Bridge) and peer collaboration.

-- ── Add channel + sender_type to chat sessions ──────────────────────
ALTER TABLE v3_chat_sessions ADD COLUMN channel TEXT NOT NULL DEFAULT 'canfly';
-- channel: 'canfly' (owner via UI), 'canfly-pm' (PM via Paperclip Bridge)

ALTER TABLE v3_chat_sessions ADD COLUMN sender_type TEXT NOT NULL DEFAULT 'owner';
-- sender_type: 'owner' | 'pm' | 'peer'

CREATE INDEX IF NOT EXISTS idx_v3_chat_sessions_channel
  ON v3_chat_sessions(channel);
CREATE INDEX IF NOT EXISTS idx_v3_chat_sessions_sender_type
  ON v3_chat_sessions(sender_type);
