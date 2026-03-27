-- CAN-253: Paperclip Bridge v1 — Shadow Mode First
-- Maps CanFly jobs/tasks to Paperclip issues for cross-system coordination.
-- Starts in shadow mode: records mappings without triggering real dispatch.

CREATE TABLE IF NOT EXISTS paperclip_bridge_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- CanFly side
  canfly_task_id INTEGER NOT NULL,
  canfly_task_type TEXT NOT NULL DEFAULT 'task',  -- 'task', 'epic', 'subtask'
  -- Paperclip side
  paperclip_issue_id TEXT,          -- Paperclip UUID (null in shadow mode)
  paperclip_identifier TEXT,        -- e.g. 'CAN-123'
  paperclip_parent_id TEXT,         -- parent issue UUID for subtask mapping
  -- Mapping metadata
  mapping_rule TEXT NOT NULL,       -- which rule created this: 'job_to_epic', 'step_to_subtask', 'manual'
  bridge_mode TEXT NOT NULL DEFAULT 'shadow',  -- 'shadow' | 'active'
  sync_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'synced', 'failed', 'skipped'
  sync_error TEXT,
  -- Payload snapshots for audit
  canfly_payload TEXT,              -- JSON snapshot of CanFly task at mapping time
  paperclip_payload TEXT,           -- JSON snapshot of what was/would-be sent to Paperclip
  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced_at TEXT                    -- when last successfully synced (active mode)
);

-- Lookup by CanFly task
CREATE INDEX IF NOT EXISTS idx_bridge_canfly_task
  ON paperclip_bridge_mappings (canfly_task_id);

-- Lookup by Paperclip issue
CREATE INDEX IF NOT EXISTS idx_bridge_paperclip_issue
  ON paperclip_bridge_mappings (paperclip_issue_id);

-- Filter by sync status for retry/monitoring
CREATE INDEX IF NOT EXISTS idx_bridge_sync_status
  ON paperclip_bridge_mappings (sync_status, bridge_mode);

-- Unique constraint: one CanFly task maps to one Paperclip mapping per rule
CREATE UNIQUE INDEX IF NOT EXISTS idx_bridge_unique_mapping
  ON paperclip_bridge_mappings (canfly_task_id, mapping_rule);
