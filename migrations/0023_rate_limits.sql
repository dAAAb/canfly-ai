-- Rate limiting table for API abuse prevention (CAN-270)
-- Tracks request counts per key (IP or agent API key) per window
CREATE TABLE IF NOT EXISTS rate_limits (
  key       TEXT    NOT NULL,  -- IP address or "agent:<api_key_prefix>"
  window    INTEGER NOT NULL,  -- Unix epoch truncated to window start (hour)
  hits      INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window)
);

-- Index for cleanup of expired windows
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits (window);
