-- Multi-phase state machine for clone & deploy flows
-- phase_data: JSON blob for inter-phase transient state (serviceId, envId, publicUrl, waitAttempts, etc.)
-- phase_started_at: timestamp for stall/timeout detection (15 min auto-fail)
ALTER TABLE v3_zeabur_deployments ADD COLUMN phase_data TEXT DEFAULT '{}';
ALTER TABLE v3_zeabur_deployments ADD COLUMN phase_started_at TEXT;
