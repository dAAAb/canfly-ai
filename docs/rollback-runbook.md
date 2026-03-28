# Migration Rollback Runbook

## Overview

Every migration in `migrations/` has a corresponding DOWN script in `migrations/rollback/`.
This runbook documents how to perform rollbacks on staging and production.

## Prerequisites

- `wrangler` CLI installed and authenticated
- Access to the D1 database `canfly-community`

## Rollback a Single Migration

```bash
# Preview what will be executed
./scripts/migrate-rollback.sh 0026 --dry-run

# Execute the rollback
./scripts/migrate-rollback.sh 0026
```

## Staging Drill: Full v2 → v3(shadow) → rollback → v2

### Step 1: Verify v2 Baseline

```bash
# Confirm all existing endpoints work
./scripts/verify-production.sh
```

### Step 2: Apply v3 Migrations (shadow mode)

```bash
# Apply feature flags, shadow audit log, kill-switch
npx wrangler d1 execute canfly-community --file=migrations/0024_feature_flags.sql
npx wrangler d1 execute canfly-community --file=migrations/0025_shadow_audit_log.sql
npx wrangler d1 execute canfly-community --file=migrations/0026_kill_switch.sql

# Verify flags are OFF and bridge_mode = 'shadow'
curl -H "Authorization: Bearer $CRON_SECRET" https://staging.canfly.ai/api/feature-flags?all=1
curl -H "Authorization: Bearer $CRON_SECRET" https://staging.canfly.ai/api/admin/shadow-mode
```

### Step 3: Verify v2 Still Works

```bash
# All v2 endpoints should be unaffected
./scripts/verify-production.sh
```

### Step 4: Rollback to v2

```bash
# Roll back in reverse order
./scripts/migrate-rollback.sh 0026
./scripts/migrate-rollback.sh 0025
./scripts/migrate-rollback.sh 0024

# Verify v2 baseline restored
./scripts/verify-production.sh
```

## Kill-switch Emergency Procedure

If v3 causes issues in production:

```bash
# 1. Activate kill-switch (immediate — stops all v3 mutating operations)
curl -X POST https://canfly.ai/api/admin/kill-switch \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "reason": "Production incident — reverting to v2"}'

# 2. Verify kill-switch is active
curl -H "Authorization: Bearer $CRON_SECRET" https://canfly.ai/api/admin/kill-switch

# 3. If needed, roll back migrations
./scripts/migrate-rollback.sh 0026
./scripts/migrate-rollback.sh 0025
./scripts/migrate-rollback.sh 0024
```

## Notes

- SQLite `DROP COLUMN` requires ≥ 3.35.0 (Cloudflare D1 supports this)
- Migration 0014 was a data fix (UPDATE), not schema — its rollback requires manual review
- Migrations 0015–0021 were previously rolled back (see ROLLBACK-SPRINT14.md)
- Always rollback in reverse migration order
