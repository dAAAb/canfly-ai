# CanFly v3 Release Gate Checklist

## Overview

This checklist must be completed before any v3 code goes to production. Automated checks run via `scripts/release-gate-check.sh` and the `release-gate.yml` GitHub Actions workflow. Manual items require human verification.

---

## Automated Checks (CI)

These are enforced by `scripts/release-gate-check.sh`:

- [ ] **Build succeeds** — `npx vite build` completes without errors
- [ ] **i18n key sync** — en.json, zh-TW.json, zh-CN.json have matching keys
- [ ] **Feature flags default OFF** — All v3 flags in seed data and TypeScript defaults are `false`/`0`
- [ ] **Migration rollback coverage** — Every `migrations/0*.sql` has a corresponding `rollback/*_down.sql`
- [ ] **No hardcoded v3 references** — v3 feature names only appear via `useFeatureFlag` or `V3_FLAGS`

### Running Automated Checks

```bash
# Local
./scripts/release-gate-check.sh

# CI — triggers on PRs labeled "v3" or via manual workflow_dispatch
```

---

## Manual Checks

### Database & Migrations

- [ ] **DB rollback verified** — Successfully ran rollback drill on staging:
  ```bash
  # Rollback the latest migration
  ./scripts/migrate-rollback.sh 0016
  # Verify tables reverted
  npx wrangler d1 execute canfly-community \
    --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  # Re-apply
  npx wrangler d1 execute canfly-community \
    --file migrations/0016_kill_switch.sql
  ```
- [ ] **Migration idempotency** — UP and DOWN scripts can be run multiple times without breaking data consistency
- [ ] **Data integrity** — No orphaned records after rollback/re-apply cycle

### Performance

- [ ] **Load test threshold** — Key API endpoints respond within acceptable latency under expected load
- [ ] **Bundle size check** — Production bundle size has not regressed significantly
  ```bash
  npx vite build
  # Check dist/ output sizes
  ls -lh dist/assets/
  ```

### Security

- [ ] **No privilege escalation** — v3 endpoints enforce proper auth/ownership checks
- [ ] **No injection vectors** — User inputs are sanitized in new v3 API handlers
- [ ] **No social engineering risks** — v3 features don't expose sensitive data in public views

### v2 Regression

- [ ] **v2 regression suite 100%** — All existing tests pass with v3 flags OFF
  ```bash
  npm test
  ```
- [ ] **v2 UI unchanged** — With all v3 flags OFF, the app looks and behaves identically to current production
- [ ] **Affiliate links intact** — All affiliate CTAs (Zeabur, ElevenLabs, HeyGen) still function correctly

---

## Staging Drill Procedure

Complete this drill on staging before production deployment:

### 1. Baseline — Verify v2 works

```bash
npm test
npx vite build
```

### 2. Enable v3 in shadow mode

```bash
# Set bridge_mode=shadow in staging env
# Enable v3 flags for a test user/team via D1
npx wrangler d1 execute canfly-community \
  --command "UPDATE feature_flags SET enabled=1 WHERE flag_name='v3_routing' AND scope='global'"
```

### 3. Verify shadow mode logging

- Confirm shadow audit log captures v3 actions without executing them
- Compare shadow results against expected behavior

### 4. Rollback to v2

```bash
# Disable all v3 flags
npx wrangler d1 execute canfly-community \
  --command "UPDATE feature_flags SET enabled=0 WHERE flag_name LIKE 'v3_%'"

# Verify v2 behavior is fully restored
npm test
```

### 5. Confirm kill-switch

```bash
# Activate kill-switch
npx wrangler d1 execute canfly-community \
  --command "UPDATE kill_switch SET enabled=1, triggered_at=datetime('now'), reason='staging drill'"

# Verify: new task creation blocked, reads still work
# Deactivate
npx wrangler d1 execute canfly-community \
  --command "UPDATE kill_switch SET enabled=0"
```

---

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Engineering | | | ⬜ |
| QA | | | ⬜ |
| Security | | | ⬜ |
| Product | | | ⬜ |
