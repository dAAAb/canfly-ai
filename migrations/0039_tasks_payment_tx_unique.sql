-- Replay protection (security audit P1/H2): a single on-chain payment may fund
-- exactly ONE task. Without this, the same tx_hash could be submitted repeatedly
-- to mint multiple paid tasks from one payment (double-spend against sellers).
--
-- Partial index: MPP/Tempo tasks intentionally store payment_tx = NULL, and
-- SQLite treats every NULL as distinct, so the partial predicate keeps those
-- rows out of the uniqueness constraint while still de-duplicating real txs.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_payment_tx_unique
  ON tasks(payment_tx) WHERE payment_tx IS NOT NULL;
