# Rollback & Blast-Protection — VC/YC Security Audit Fixes

Branch: `fix/vc-audit-p0-p4`
Rollback point: `main @ 6171e3ea9d9e20696fdf0a0ccce9f7e89bcbfbdf`
Baseline tests at fork: **55 passed / 6 failed** (all 6 pre-existing: `AuthButton.test.tsx` ×6, `contracts/TaskEscrow` missing `hardhat`).

## Instant rollback

```bash
# Code: main is untouched — just switch back.
git checkout main

# Or drop the branch entirely:
git branch -D fix/vc-audit-p0-p4
```

All code changes live on the branch; `main` is the clean rollback target. No history was rewritten.

## Database migration (the ONLY stateful change)

One new migration was added. It is **additive and non-destructive** (creates an index only):

| Migration | Effect | Rollback |
|---|---|---|
| `0039_tasks_payment_tx_unique` | Partial `UNIQUE INDEX` on `tasks(payment_tx) WHERE payment_tx IS NOT NULL` (payment-replay protection, H2) | `wrangler d1 execute canfly-community --file=migrations/rollback/0039_tasks_payment_tx_unique_down.sql` |

⚠️ **Before applying in prod**: if any pre-existing rows share a non-null `payment_tx`, the unique index creation will fail. Check first:
```sql
SELECT payment_tx, COUNT(*) c FROM tasks WHERE payment_tx IS NOT NULL GROUP BY payment_tx HAVING c > 1;
```
(Expected: 0 rows. Each on-chain tx should fund exactly one task.)

No columns were dropped or altered; no data is mutated by deploying this branch.

## Fail-safe design (blast protection)

- **Auth changes fail CLOSED**: `requireCronSecret` denies when `CRON_SECRET` is unset (was: open); claim/confirm/reject deny by default and only allow on positive verification.
- **No destructive ops added**: the agent-rename fix INSERTs the new row and re-points child FKs *before* deleting the old row (safe regardless of D1 FK enforcement).
- **CORS** is tightened only for cross-origin/non-canfly callers; first-party (same-origin / `*.canfly.ai` / localhost) is unaffected.
- **Replay/idempotency** guards return clean 409/200 instead of throwing.

## What changed, by finding

### P0 (critical)
- **C1** `functions/api/community/users/[username]/claim.ts`, `src/components/ClaimProfileButton.tsx`, `functions/api/_auth.ts` (new `verifyPrivyToken`) — claim now requires a verified Privy JWT; verification level derived server-side; wallet-ownership gate; binds `privy_user_id`.
- **C2** `functions/api/_auth.ts` — removed spoofable bare `X-Wallet-Address` auth (Method 3).
- **C3** `functions/api/community/_helpers.ts` (new `requireCronSecret`) + `admin/diagnose.ts`, `admin/fix-config.ts`, `cron/{escrow-auto-release,sla-timeout,deploy-cleanup,pending-cleanup}.ts` — fail-closed admin/cron auth.
- **C4** `functions/api/agents/[name]/index.ts` — rename now copies ALL columns dynamically and re-points all 9 child FK tables (no data loss / orphans).

### P1 (high)
- **H1** `confirm.ts`, `reject.ts`, `src/pages/TaskManagerPage.tsx` — escrow confirm/reject accept the buyer agent's owner (Privy JWT/edit-token); UI now sends auth headers.
- **H2** `tasks/index.ts` + migration `0039` — payment-tx replay protection.
- **H3** `tasks/index.ts`, `cron/escrow-auto-release.ts` — extract + store on-chain `sla_deadline`; coordinate auto-release with SLA.
- **H4** `functions/api/tasks/[id]/index.ts` — IDOR fix: verified-identity (Privy JWT → `privy_user_id`) replaces spoofable wallet headers.
- **H5** `bind-zeabur.ts` — parameterized Zeabur GraphQL (`ObjectID!` variables).
- **H6** `functions/api/_middleware.ts` — origin-allowlisted CORS (replaces blanket `*`).
- **H7** `community/agents/index.ts`, `community/publish.ts` — generate `api_key`/`pairing_code` so community agents can self-update.
- **H8/H9** `tasks/index.ts` (MPP success-status check), `confirm.ts`/`reject.ts` (idempotency).
- **H10/H13** `DeployPinataWizardPage.tsx`, `AgentSettingsPage.tsx` — surface finalize failure → prompt re-apply.
- **H11** `DeployWizardPage.tsx` — bounded deploy polling (max attempts + timeout).
- **H12** `connect-telegram.ts` — surface unconfirmed gateway restart.
- **H14/H15/H16** `HeroSection.tsx`, `Navbar.tsx`, `CommunityPage.tsx`, i18n `en/zh-TW/zh-CN.json` — nav i18n, Chinese translations, `/api/docs`→`/api/openapi.json`.

### P2/P3 (selected)
- `tasks/[id]/result/file.ts` — neutralize active content-types + `nosniff` (stored-XSS).
- `agent-card.json.ts` — block `canfly*` user `_extensions` masquerade.
- `register.ts` — race → clean 409.
- `agent-card.ts` — MIME validation; `telegram-approve.ts` — reject leading-zero IDs.
- `src/utils/tutorials.ts` (new) + `AgentCardPage.tsx`, `UserShowcasePage.tsx` — gate skill tutorial links to existing tutorials (no 404s).
- `FreeAgentsPage.tsx` — lang-prefixed register link.
- `AgentCardPage.tsx` — removed "Video call coming soon" placeholder.
- `PaperclipDashboardPage.tsx` — honest "preview/sample data" notice.

## Deferred (documented, not changed — would need broader/architectural work)
- Edit-token rotation/expiry (needs an expiry column + multi-device session handling).
- `localStorage` edit-token storage (design — would require httpOnly-cookie auth refactor).
- `authenticateRequest` Method-1 `X-Wallet-Address` hint lookup (verified-JWT path) — recommend Privy server-side wallet verification (needs app secret).
