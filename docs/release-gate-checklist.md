# Release Gate Checklist

Run `./scripts/release-gate-check.sh` before every release. All automated checks must pass.

## Automated Checks (via script)

- [ ] **Build**: `npx vite build` succeeds
- [ ] **i18n sync**: All 3 locale files (en, zh-TW, zh-CN) have matching key counts
- [ ] **Rollback coverage**: Every migration has a corresponding DOWN script
- [ ] **Feature flags**: All v3 flags default to OFF in `src/config/featureFlags.ts`
- [ ] **TypeScript**: `npx tsc --noEmit` passes (warning-only)

## Manual Checks (before production deploy)

- [ ] **DB rollback tested**: Migration up/down executed on staging without data loss
- [ ] **Kill-switch tested**: POST to `/api/admin/kill-switch` confirms 503 on v3 endpoints
- [ ] **Shadow mode verified**: Audit logs capture expected actions without side effects
- [ ] **v2 regression**: All existing API endpoints return expected results
- [ ] **Security review**: No new endpoints exposed without auth, no injection vectors
- [ ] **Performance**: No significant latency increase on critical paths
- [ ] **Escrow reconciliation**: Zero difference between expected and actual balances
