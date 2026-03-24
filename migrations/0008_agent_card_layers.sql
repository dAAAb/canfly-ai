-- Migration 0008: Agent Card Three-Layer System (CAN-191)
-- Layer 1: Auto-generated from existing fields (no schema changes needed)
-- Layer 2: Capabilities stored in existing `capabilities` JSON column (enhanced)
-- Layer 3: Full A2A Agent Card override stored as JSON

ALTER TABLE agents ADD COLUMN agent_card_override TEXT; -- Full A2A JSON (Layer 3)
