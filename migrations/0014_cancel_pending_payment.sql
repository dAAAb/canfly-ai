-- CAN-237: Cancel all pending_payment zombie tasks
-- After CAN-232, POST /tasks creates tasks as 'paid' directly.
-- Any remaining pending_payment tasks are stale and should be cancelled.
UPDATE tasks
SET status = 'cancelled',
    completed_at = datetime('now')
WHERE status = 'pending_payment';
