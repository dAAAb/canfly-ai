# CAN-167: World Agent Kit + AgentBook Integration Research

## Executive Summary

World's AgentKit (beta, launched 2026-03-17) lets AI agents carry cryptographic proof they're backed by a World ID-verified human. AgentBook is the on-chain registry (on Base & Worldchain) where agent wallets are registered. CanFly already has deep World ID integration — AgentKit is the natural next step for our AI agent ecosystem.

**Key finding**: Registration CAN be done programmatically via relay API (not just CLI), but still requires an interactive World App scan to generate the ZK proof.

---

## 1. Architecture Overview

```
Human (World App) ──► World ID Proof ──► AgentBook (on-chain registry)
                                              │
Agent Wallet ◄─────── registered ◄────────────┘
     │
     ▼
Service (CanFly) ──► agentBook.lookupHuman(address) ──► humanId or null
```

**Three-step flow:**
1. **Register**: Human verifies via World App → agent wallet recorded in AgentBook
2. **Challenge**: Service sends CAIP-122 challenge via x402 `402 Payment Required`
3. **Verify**: Agent signs challenge → service checks AgentBook → grants access

---

## 2. AgentBook Contract Details

| Network | Address | Status |
|---------|---------|--------|
| **Base mainnet** | `0xE1D1D3526A6FAa37eb36bD10B933C1b77f4561a4` | Production |
| Base Sepolia | `0xA23aB2712eA7BBa896930544C7d6636a96b944dA` | Testnet |
| Worldchain | `0xA23aB2712eA7BBa896930544C7d6636a96b944dA` | Production |

### Contract Interface

```solidity
register(
  address agent,        // Agent wallet address
  uint256 root,         // World ID Merkle root
  uint256 nonce,        // Sequential nonce (prevents replay)
  uint256 nullifierHash,// Anonymous human identifier (ZK)
  uint256[8] proof      // Groth16 ZK proof
)
```

- Nonce is sequential per agent address (re-registration needs next nonce)
- Proof is bound to `(agent address, nonce)` — cannot reuse old proofs
- nullifierHash links multiple agents to one anonymous human

---

## 3. Registration Methods

### Method A: CLI (Interactive)

```bash
npx @worldcoin/agentkit-cli register <agent-address>
# Defaults to Base mainnet + hosted relay
```

Flow: reads nonce → shows QR code → World App scan → submits via relay

### Method B: CLI Manual Mode (Get calldata)

```bash
npx @worldcoin/agentkit-cli register <address> --manual
# Returns raw calldata for self-submission
```

### Method C: Relay API (Programmatic submission)

```bash
POST https://x402-worldchain.vercel.app/register
{
  "agent": "0x...",
  "root": "123456789",
  "nonce": "0",
  "nullifierHash": "987654321",
  "proof": ["0x...", ...8 elements],
  "contract": "0xE1D1D3526A6FAa37eb36bD10B933C1b77f4561a4",
  "network": "base"
}
# Response: { "txHash": "0x..." }
```

### Can we skip the CLI entirely?

**Partially.** The proof generation requires a World App scan (QR code / deep link). The CLI handles this interactively. To go fully programmatic, we'd need to:

1. Read nonce from AgentBook contract directly (via viem)
2. Generate World ID verification request (need World ID bridge API)
3. Present QR/deep link in our own UI (we already do this with IDKit!)
4. Receive proof callback
5. Submit to relay API or call contract directly

**This is feasible for CanFly** because we already have World ID IDKit v4 integration with RP signature flow. We could extend our existing `WorldIdVerify` component to support agent registration.

---

## 4. Server-Side Verification (CanFly as Service Provider)

### NPM Package

```bash
npm install @worldcoin/agentkit
```

### Verify an Agent

```typescript
import { createAgentBookVerifier } from '@worldcoin/agentkit'

const agentBook = createAgentBookVerifier() // Base mainnet default

// Check if an agent wallet is backed by a verified human
const humanId = await agentBook.lookupHuman(
  walletAddress,
  'eip155:8453' // Base
)
// Returns anonymous human ID string, or null if unregistered
```

### x402 Integration (Full)

```typescript
import {
  declareAgentkitExtension,
  createAgentkitHooks,
  createAgentBookVerifier,
  InMemoryAgentKitStorage,
} from '@worldcoin/agentkit'

const agentBook = createAgentBookVerifier()
const storage = new InMemoryAgentKitStorage() // Use D1/KV in prod

const hooks = createAgentkitHooks({
  storage,
  agentBook,
  mode: { type: 'free-trial', uses: 5 }, // 5 free requests for verified agents
})
```

### Access Modes

| Mode | Behavior |
|------|----------|
| `free` | Human-backed agents always bypass payment |
| `free-trial` | First N requests free, then pay |
| `discount` | N% off for first N requests |

Usage counters are per-human per-endpoint (multiple agents sharing one human share quotas).

---

## 5. CanFly Integration Opportunities

### 5A: Register CanFly User Agents in AgentBook

**Use case**: Users who create AI agents on CanFly can register them in AgentBook, proving they're human-backed.

**Implementation**:
1. Extend `WorldIdVerify.tsx` with agent registration flow
2. User provides agent wallet address
3. Use existing IDKit v4 integration with modified action for agent registration
4. Submit proof to AgentBook via relay API
5. Store registration status in `world_id_verifications` table (add `agentbook_registered` column)

**Challenge**: The World ID action for AgentBook registration is different from our current `real-human-canfly` action. We'd need to use the AgentKit CLI's verification flow or replicate its World ID bridge interaction.

### 5B: Verify External Agents Hitting CanFly APIs

**Use case**: External AI agents accessing CanFly's API endpoints get verified as human-backed.

**Implementation**:
1. Add `@worldcoin/agentkit` to dependencies
2. Create Cloudflare Pages middleware that checks `agentkit` header
3. Use `createAgentBookVerifier()` to verify agent registration
4. Grant free-trial access to verified agents

**Fits perfectly** with our existing trust badge system:
- `orb` → Orb Verified
- `world` → World ID Verified
- `agentbook` → **AgentBook Verified** (new tier)

### 5C: List CanFly on AgentBook Registry

**Use case**: Register CanFly itself as an AgentKit-compatible service on agentbook.world.

**Implementation**: Register via CLI, then add x402 + AgentKit headers to our protected API endpoints.

---

## 6. Recommended Integration Plan

### Phase 1: Verify Incoming Agents (Low effort, high value)
- Install `@worldcoin/agentkit`
- Add `createAgentBookVerifier()` to API middleware
- Add `agentbook` trust level to TrustBadge system
- Protect premium API endpoints with free-trial mode

### Phase 2: Agent Registration UI (Medium effort)
- Build agent wallet registration flow in profile page
- Reuse existing IDKit v4 + RP signature infrastructure
- Submit proofs via relay API
- Track registration in D1 database

### Phase 3: x402 Payment Integration (Higher effort)
- Full x402 payment protocol on protected endpoints
- USDC micropayments for API access
- AgentKit discount/free-trial for verified agents

---

## 7. Existing CanFly Assets That Accelerate Integration

| Asset | Location | Reuse For |
|-------|----------|-----------|
| IDKit v4 widget | `src/components/WorldIdVerify.tsx` | Agent registration UI |
| RP signature | `functions/api/world-id/_rp-sign.ts` | Challenge signing |
| Trust badges | `src/components/TrustBadge.tsx` | Add `agentbook` level |
| Wallet auth | `src/hooks/useAuth.ts` | Agent wallet management |
| World ID verify API | `functions/api/world-id/verify.ts` | Extend for agent proofs |
| D1 verifications table | `migrations/0005_*` | Store AgentBook status |

---

## 8. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AgentKit is beta (launched 3 days ago) | API changes | Pin version, monitor releases |
| Relay may be rate-limited | Registration failures | Self-host relay (example in repo) |
| World App required for every registration | UX friction | Clear onboarding flow |
| x402 adoption is nascent | Low agent traffic initially | Phase 1 is standalone value |
| InMemoryStorage not production-ready | Data loss on restart | Implement D1/KV-backed storage |

---

## 9. Key Dependencies

```json
{
  "@worldcoin/agentkit": "latest",
  "@worldcoin/agentkit-cli": "latest (dev only)",
  "@x402/hono": "for x402 middleware (Phase 3)",
  "@x402/core": "for facilitator client (Phase 3)",
  "@x402/evm": "for EVM payment scheme (Phase 3)"
}
```

---

## 10. References

- [World AgentKit Docs](https://docs.world.org/agents/agent-kit/integrate)
- [AgentKit GitHub](https://github.com/worldcoin/agentkit)
- [AgentBook Registry](https://www.agentbook.world/)
- [CLI Registration Guide](https://github.com/worldcoin/agentkit/blob/main/cli/REGISTRATION.md)
- [SDK Reference](https://github.com/worldcoin/agentkit/blob/main/agentkit/DOCS.md)
- [World Blog Announcement](https://world.org/blog/announcements/now-available-agentkit-proof-of-human-for-the-agentic-web)
