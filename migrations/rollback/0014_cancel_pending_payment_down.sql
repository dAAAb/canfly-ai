-- Rollback 0014_cancel_pending_payment.sql
-- This was a data fix (UPDATE), not a schema change.
-- Cannot be reversed without a backup of original task statuses.
-- Manual intervention required if rollback is needed.
SELECT 'WARNING: 0014 was a data fix — manual review required to restore original task statuses' AS rollback_note;
