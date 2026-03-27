-- Rollback 0014_cancel_pending_payment.sql — restore cancelled tasks to pending_payment
-- NOTE: This is a best-effort data revert. Tasks cancelled by 0014 cannot be
-- perfectly identified, so this restores ALL cancelled tasks that have no reject_reason
-- (0014 only cancelled pending_payment tasks, which never had reject_reason set).
-- Manual review is recommended after running this rollback.
UPDATE tasks
SET status = 'pending_payment',
    completed_at = NULL
WHERE status = 'cancelled'
  AND reject_reason IS NULL;
