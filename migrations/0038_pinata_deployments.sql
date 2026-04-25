-- CAN-302: Pinata Agents deployment tracking + featured free model curation
-- Mirrors v3_zeabur_deployments shape so the wizard can run as a parallel BYO flow.
-- The Pinata wizard differs from Zeabur in two ways:
--   1. AI key is auto-provisioned via the OpenRouter management API (limit=0, free-only).
--   2. The user pastes a Pinata JWT instead of a Zeabur API key — the JWT lives encrypted
--      in metadata, used to call agents.pinata.cloud on the user's behalf.

-- ── Pinata Deployments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS v3_pinata_deployments (
  id                  TEXT PRIMARY KEY,                  -- UUID
  owner_username      TEXT NOT NULL,                     -- FK → users
  agent_name          TEXT,                              -- FK → agents(name); set after registration
  pinata_agent_id     TEXT,                              -- e.g. 'xobr1q73'
  pinata_workspace    TEXT,                              -- Pinata workspace id (from JWT scope, if exposed)
  status              TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'creating' | 'running' | 'failed' | 'stopped'
  deploy_url          TEXT,                              -- Pinata agent URL once running
  free_model_id       TEXT NOT NULL,                     -- e.g. 'nvidia/nemotron-3-super-120b-a12b:free'
  openrouter_key_hash TEXT,                              -- Hash returned by /api/v1/keys (for PATCH/DELETE)
  error_code          TEXT,
  error_message       TEXT,
  metadata            TEXT NOT NULL DEFAULT '{}',        -- JSON: encrypted pinataJwt, encrypted OR key, plan, runtime caps
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_username) REFERENCES users(username) ON DELETE CASCADE,
  FOREIGN KEY (agent_name)     REFERENCES agents(name)   ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_v3_pinata_deployments_owner
  ON v3_pinata_deployments(owner_username);
CREATE INDEX IF NOT EXISTS idx_v3_pinata_deployments_agent
  ON v3_pinata_deployments(agent_name);
CREATE INDEX IF NOT EXISTS idx_v3_pinata_deployments_status
  ON v3_pinata_deployments(status);
CREATE INDEX IF NOT EXISTS idx_v3_pinata_deployments_pinata_id
  ON v3_pinata_deployments(pinata_agent_id);

-- ── Featured Free Models ───────────────────────────────────────────
-- CanFly editorial curation of OpenRouter free models. Reviewed monthly,
-- and a daily cron disables any entry whose source model has gained an
-- expiration_date or non-zero pricing (see /api/cron/openrouter-model-health).
CREATE TABLE IF NOT EXISTS featured_free_models (
  id                TEXT PRIMARY KEY,                    -- e.g. 'nvidia/nemotron-3-super-120b-a12b:free'
  display_name      TEXT NOT NULL,
  provider_logo_url TEXT,
  context_length    INTEGER,
  use_case_zh       TEXT,                                -- '通用 / 程式 / 視覺...'
  rank              INTEGER NOT NULL,                    -- editor sort order (1 = best)
  active            INTEGER NOT NULL DEFAULT 1,
  reviewed_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_featured_free_models_active_rank
  ON featured_free_models(active, rank);

-- Seed Top 5 (verified 2026-04-25; all without expiration_date)
INSERT OR IGNORE INTO featured_free_models (id, display_name, context_length, use_case_zh, rank) VALUES
  ('nvidia/nemotron-3-super-120b-a12b:free', 'NVIDIA Nemotron 3 Super',  262144, '通用、程式、推理（推薦）', 1),
  ('google/gemma-4-31b-it:free',             'Google Gemma 4 31B',       262144, '一般對話、寫作',           2),
  ('google/gemma-4-26b-a4b-it:free',         'Google Gemma 4 26B',       262144, '輕量對話',                 3),
  ('qwen/qwen3-next-80b-a3b-instruct:free',  'Qwen3 Next 80B',           262144, '中文、程式、長文',         4),
  ('openai/gpt-oss-120b:free',               'OpenAI GPT-OSS 120B',      131072, '通用、開源',               5);

-- ── Feature flag (OFF until verified) ──────────────────────────────
INSERT OR IGNORE INTO feature_flags (flag_name, scope, scope_id, enabled) VALUES
  ('v3_pinata_deploy', 'global', NULL, 0);
