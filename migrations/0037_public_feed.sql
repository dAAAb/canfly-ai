-- Live feed table for homepage real-time events (CAN-300)
CREATE TABLE IF NOT EXISTS public_feed (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  emoji TEXT NOT NULL,
  actor TEXT NOT NULL,
  target TEXT,
  link TEXT,
  message_en TEXT NOT NULL,
  message_zh_tw TEXT,
  message_zh_cn TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_feed_created ON public_feed(created_at DESC);
