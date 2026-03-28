-- CAN-265: Add buyer_wallet column to tasks for wallet-based buyer task lookup
ALTER TABLE tasks ADD COLUMN buyer_wallet TEXT;

-- Index for querying buyer's tasks by wallet address
CREATE INDEX IF NOT EXISTS idx_tasks_buyer_wallet ON tasks(buyer_wallet);
