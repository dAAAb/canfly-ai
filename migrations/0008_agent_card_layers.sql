-- Migration 0008: Agent Card Three-Layer System (CAN-191) + BaseMail Identity (CAN-198)
-- Layer 1: Auto-generated from existing fields (no schema changes needed)
-- Layer 2: Capabilities stored in existing `capabilities` JSON column (enhanced)
-- Layer 3: Full A2A Agent Card override stored as JSON

ALTER TABLE agents ADD COLUMN agent_card_override TEXT; -- Full A2A JSON (Layer 3)

-- ── BaseMail Identity (CAN-198) ───────────────────────────────────────
ALTER TABLE agents ADD COLUMN basemail_handle TEXT;     -- e.g. "littl3lobst3r"
ALTER TABLE agents ADD COLUMN basemail_cached_at TEXT;  -- ISO timestamp of last successful fetch
