# Migration Rollback Runbook

## Overview

Every migration in `migrations/` has a corresponding DOWN script in `migrations/rollback/`. DOWN scripts are idempotent (use `IF EXISTS` or conditional logic) and can be run safely multiple times.

## Quick Reference

```bash
# Rollback a single migration (local)
./scripts/migrate-rollback.sh 0014

# Rollback a single migration (production)
./scripts/migrate-rollback.sh 0014 --remote
```

## Staging Drill Procedure

### Pre-requisites
- Wrangler CLI installed and authenticated
- Local D1 database available (`npx wrangler d1 list`)

### Step 1: Verify Current State
```bash
# Check which tables exist
npx wrangler d1 execute canfly-community \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

### Step 2: Run the Rollback
```bash
# Example: rollback migration 0014
./scripts/migrate-rollback.sh 0014
```

### Step 3: Verify Rollback
```bash
# Confirm table/column changes were reverted
npx wrangler d1 execute canfly-community \
  --command "PRAGMA table_info(tasks)"
```

### Step 4: Re-apply (if drilling)
```bash
# Re-run the UP migration
npx wrangler d1 execute canfly-community \
  --file migrations/0014_cancel_pending_payment.sql
```

## Rolling Back Multiple Migrations

Roll back in **reverse order** (highest number first):

```bash
./scripts/migrate-rollback.sh 0014
./scripts/migrate-rollback.sh 0013
./scripts/migrate-rollback.sh 0012
# ... etc
```

## Data Integrity Verification

After any rollback, verify data integrity:

```bash
# Check row counts for key tables
npx wrangler d1 execute canfly-community \
  --command "SELECT 'users' as t, COUNT(*) as n FROM users UNION ALL SELECT 'agents', COUNT(*) FROM agents UNION ALL SELECT 'tasks', COUNT(*) FROM tasks"

# Check for orphaned records
npx wrangler d1 execute canfly-community \
  --command "SELECT COUNT(*) FROM agents WHERE owner_username NOT IN (SELECT username FROM users)"
```

## Emergency Production Rollback

> **WARNING**: Production rollbacks may cause data loss. Always take a backup first.

1. **Notify the team** — post in the incident channel
2. **Take a D1 snapshot** (via Cloudflare dashboard → D1 → canfly-community → Backups)
3. **Run the rollback**:
   ```bash
   ./scripts/migrate-rollback.sh XXXX --remote
   ```
4. **Verify** the rollback succeeded (check tables, run health check)
5. **Deploy previous code version** if the rollback requires an older API version
6. **Post-mortem** — document what happened and update this runbook

## Important Notes

- **D1 uses SQLite 3.x** — `ALTER TABLE DROP COLUMN` is supported (SQLite 3.35+)
- **0014 is a data migration** — its rollback is best-effort; manual review recommended
- **Always rollback in reverse order** when reverting multiple migrations
- **Test on local first** before running against production
