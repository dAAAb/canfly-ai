-- Rollback migration 0014: Revert cancelled zombie tasks back to pending_payment
-- Sprint 17 CAN-237
-- NOTE: This cannot perfectly restore original state since we don't track which were zombies vs legitimate pending.
-- Use only if the migration was run in error.

UPDATE tasks SET status = 'pending_payment' WHERE status = 'cancelled' AND payment_tx IS NULL;
