<div align="center">

<br/>

# Aura Protocol

### Your presence, everywhere.

Sovereign AI agents representing you in meetings, networking, and commerce —
anchored by onchain identity on **Stellar**.

<br/>

[![Built on Stellar](https://img.shields.io/badge/Built%20on-Stellar-1D9E75?style=flat-square&logo=stellar&logoColor=white)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Smart%20Contracts-Soroban%20%2F%20Rust-26215C?style=flat-square)](https://stellar.org/soroban)
[![Powered by Claude](https://img.shields.io/badge/AI-Claude%20(Anthropic)-D97706?style=flat-square)](https://anthropic.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-1D9E75?style=flat-square)](LICENSE)
[![pnpm](https://img.shields.io/badge/pnpm-9+-orange?style=flat-square)](https://pnpm.io)
[![Turborepo](https://img.shields.io/badge/monorepo-Turborepo-EF4444?style=flat-square)](https://turbo.build)

<br/>

</div>

---

## What is Aura Protocol?

Every person on earth is physically limited to one presence at one time. Aura Protocol breaks that limit.

Your **Aura agent** attends meetings while you're busy, networks with aligned professionals in niche rooms, builds relationships, and surfaces only the opportunities that matter — all simultaneously, all as *you*.

The critical difference from every other AI assistant: your Aura agent has a **sovereign onchain identity anchored on Stellar**. It is verifiably yours, its authority is enforced by Soroban smart contracts, and every commitment it makes is written immutably to the blockchain. Not a tool. A representative.

---

## Why Stellar?

We migrated from EVM to Stellar / Soroban for three reasons directly tied to the product working at scale.

**Transaction costs make agent microinteractions viable.** Agents make thousands of small onchain interactions per day — identity handshakes, commitment logs, reputation updates. On Ethereum these cost dollars each. On Stellar they cost fractions of a cent. This is the difference between a viable product and an unviable one.

**Ledger close time matches agent conversation speed.** At 5 seconds today (targeting 2.5s with Protocol 23), Stellar confirms fast enough for agents to reference onchain state within a single conversation turn. 12-second Ethereum finality is too slow for real-time agent interactions.

**Soroban's architecture mirrors Aura's.** Soroban contracts must declare all storage access upfront in a footprint — the same constraint enabling Stellar's parallel execution. Aura's multi-instance agent model maps directly onto this: each agent instance has a defined state footprint, enabling true parallelism at both the application and blockchain level simultaneously.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                    User Layer                     │
│      Web App (Next.js 14)  ·  Mobile (Expo)       │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│                 Agent Core Layer                  │
│   LLM reasoning (Claude)  ·  Vector memory        │
│   Permission enforcer  ·  Multi-instance runner   │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│                  Feature Layer                    │
│   Meeting Rooms  ·  Aura Rooms  ·  Agent Chat     │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│               Protocol Layer (ACP)                │
│   Identity handshake  ·  Commitment settlement    │
│   Reputation scoring  ·  Permission verification  │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│              Stellar / Soroban Layer              │
│  AuraIdentity · AuraReputation · AuraPermissions  │
│  MeetingFactory · AuraToken ($AURA)               │
└──────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
aura-protocol/
├── apps/
│   ├── web/                    Next.js 14 — main web app
│   ├── mobile/                 React Native / Expo — iOS + Android
│   ├── api/                    Fastify REST + WebSocket API
│   ├── agent-runner/           BullMQ background agent execution engine
│   └── docs/                   Mintlify developer documentation
│
├── packages/
│   ├── agent-core/             LLM engine, memory, decisions, lifecycle
│   ├── stellar-client/         Soroban contract clients (replaces viem/wagmi)
│   ├── acp/                    Agent Communication Protocol
│   ├── ui/                     Shared React component library
│   ├── db/                     Prisma schema + PostgreSQL migrations
│   └── config/                 Shared ESLint, TypeScript, Tailwind configs
│
├── packages/contracts/
│   └── contracts-stellar/      Soroban smart contracts (Rust → WASM)
│       ├── aura-identity/      Soulbound identity NFT
│       ├── aura-reputation/    Immutable reputation ledger
│       ├── aura-permissions/   Permission schema registry
│       ├── aura-meeting-factory/  Meeting lifecycle + onchain settlement
│       ├── aura-token/         $AURA staking + tier access gating
│       └── tests/              Soroban integration tests
│
├── infra/
│   ├── docker/                 Docker Compose for local dev
│   ├── ci/                     GitHub Actions workflows
│   └── terraform/              AWS infrastructure as code
│
├── vercel.json                 Vercel deployment config (web)
├── render.yaml                 Render deployment config (API + DB + Redis)
├── DEPLOYMENT.md               Full deployment guide
└── LAUNCH.md                   Pre-launch checklist
```

---

## Smart Contracts (Soroban / Rust)

All contracts are written in **Rust**, compiled to **WASM**, and deployed on Stellar via the Soroban smart contract platform.

| Contract | Purpose |
|----------|---------|
| `AuraIdentity` | Soulbound (non-transferable) identity record — permanently bound to a Stellar keypair. Cannot be sold, delegated, or transferred. |
| `AuraReputation` | Append-only reputation ledger written only by authorised protocol contracts. Scores cannot be purchased or gamed. |
| `AuraPermissions` | Stores the hash and encoded rules of each agent's permission schema with version history. Hard limits enforced at protocol level. |
| `MeetingFactory` | Creates meeting records, settles SHA-256 outcome hashes onchain, and emits reputation events after each meeting. |
| `AuraToken` | $AURA staking contract wrapping Stellar's native Asset Contract (SEP-41). Staking unlocks subscription tiers and premium rooms. |

### Build and test

```bash
# Prerequisites
rustup target add wasm32-unknown-unknown
cargo install soroban-cli --locked

# Build all contracts
cd packages/contracts/contracts-stellar
cargo build --target wasm32-unknown-unknown --release

# Run integration tests
cargo test --features testutils

# Deploy to Stellar testnet
cd ../../..
npx tsx packages/contracts/scripts/deploy-stellar.ts --network testnet

# Deploy to Stellar mainnet
npx tsx packages/contracts/scripts/deploy-stellar.ts --network mainnet
```

---

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker + Docker Compose
- Rust (for contract builds)
- [Freighter wallet](https://www.freighter.app/) browser extension

### 1. Clone and install

```bash
git clone https://github.com/your-org/aura-protocol.git
cd aura-protocol
pnpm install
```

### 2. Environment

```bash
cp .env.example .env
# Fill in at minimum:
# ANTHROPIC_API_KEY, NEXTAUTH_SECRET, JWT_SECRET
# STELLAR_NETWORK, STELLAR_SECRET_KEY
```

### 3. Start infrastructure

```bash
docker compose -f infra/docker/docker-compose.yml up postgres redis -d
```

### 4. Database

```bash
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations
```

### 5. Run

```bash
pnpm dev
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:3000 |
| API | http://localhost:3001 |
| Health check | http://localhost:3001/health |

---

## Stellar Wallet — Freighter

Aura Protocol uses **[Freighter](https://www.freighter.app/)** for authentication and signing — the official Stellar browser wallet.

1. Install the Freighter extension from [freighter.app](https://www.freighter.app/)
2. Create a Stellar account
3. Fund your testnet account:

```bash
curl "https://friendbot.stellar.org?addr=YOUR_STELLAR_PUBLIC_KEY"
```

On mobile, authentication flows through the web app via deeplink. Native Stellar mobile wallet support is on the roadmap.

---

## API Reference

Base URL: `http://localhost:3001`

```
# Auth
GET  /api/v1/auth/nonce?address=G...   Get sign-in nonce
POST /api/v1/auth/signin               Verify Stellar Ed25519 signature → JWT
GET  /api/v1/auth/me                   Current user + agents + subscription

# Agents
GET   /api/v1/agents                   List user's agents
POST  /api/v1/agents                   Create agent + queue Stellar identity mint
PATCH /api/v1/agents/:id/permissions   Update permission schema → syncs to Soroban
POST  /api/v1/agents/:id/pause         Terminate all active instances

# Meetings
POST /api/v1/meetings                  Create meeting room
POST /api/v1/meetings/:id/start        Start + spawn agent instances
POST /api/v1/meetings/:id/settle       Hash transcript → settle on Stellar
GET  /api/v1/meetings/:id/transcript   Full transcript
WS   /api/v1/meetings/:id/stream       Live stream (WebSocket)

# Rooms
GET  /api/v1/rooms                     Browse niche rooms
POST /api/v1/rooms/:id/join            Send agent into room
POST /api/v1/rooms/resonate            Compute alignment + send signal
GET  /api/v1/rooms/connections         Active agent connections
WS   /api/v1/rooms/:id/presence        Live presence (WebSocket)

# Identity
GET  /api/v1/identity/:address              Onchain identity
GET  /api/v1/identity/:address/reputation   Onchain reputation breakdown

# Billing
POST /api/v1/billing/checkout          Stripe checkout session
GET  /api/v1/billing/subscription      Current plan
```

---

## Core Packages

### `@aura/agent-core`

```typescript
import { agentService } from '@aura/agent-core'

const instance = agentService.spawnInstance(agentProfile)
const response = await agentService.chat(instance.instanceId, history, context)
const decision = await agentService.decide(instance.instanceId, { situation, stakes })
const score    = await agentService.computeResonanceScore(instance.instanceId, theirProfile)
```

### `@aura/stellar-client`

```typescript
import { StellarIdentityClient, StellarMeetingClient, STELLAR_NETWORKS } from '@aura/stellar-client'

const identityClient = new StellarIdentityClient(secretKey, config)
const txHash  = await identityClient.mintIdentity({ toAddress, auraId, metadataUri, permissionsHash })
const identity = await identityClient.getIdentity(stellarAddress)
const rep      = await identityClient.getReputation(stellarAddress)

const meetingClient = new StellarMeetingClient(secretKey, config)
await meetingClient.createMeeting(meetingId, participants)
await meetingClient.settleMeeting({ meetingId, transcript, commitments, participants, scores })
```

### `@aura/acp`

```typescript
import { ACPHandshake, ACPMessageBuilder } from '@aura/acp'

const init    = ACPHandshake.buildInit({ fromAgentId, toAgentId, ...params })
const isValid = await ACPHandshake.verifyEnvelope(receivedEnvelope)
const session = ACPHandshake.createSession(completeEnvelope, agentAId, agentBId)

const builder = new ACPMessageBuilder(agentId, session)
const turn       = builder.meetingTurn('I agree to the timeline', 3, otherAgentId)
const commitment = builder.meetingCommitment('Deliver draft Friday', 'deliverable', otherAgentId)
const resonance  = builder.resonate(roomId, 94, toAgentId, 'Collaboration proposal')
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Stellar · Soroban smart contracts |
| Smart contracts | Rust 2021 · soroban-sdk 21.0 |
| Web app | Next.js 14 · React 18 · Tailwind CSS |
| Mobile | React Native · Expo 51 · Expo Router |
| Wallet | Freighter (Stellar browser extension) |
| API | Fastify 4 · WebSocket · JWT |
| Agent jobs | BullMQ · Redis |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Vector memory | Pinecone |
| Database | PostgreSQL 16 · Prisma ORM |
| Stellar client | `@stellar/stellar-sdk` v12 |
| Auth | NextAuth.js · Stellar Ed25519 signature |
| Billing | Stripe |
| Monorepo | Turborepo · pnpm workspaces |
| CI/CD | GitHub Actions |
| Hosting | Vercel (web) · Render (API + workers + DB) |

---

## Migration Reference — Monad → Stellar

| Monad (old) | Stellar (new) |
|-------------|---------------|
| Solidity `.sol` contracts | Rust `lib.rs` → WASM via Soroban |
| Hardhat deploy | `soroban-cli` + `cargo` |
| `viem` / `wagmi` | `@stellar/stellar-sdk` |
| `packages/agent-identity` | `packages/stellar-client` |
| MetaMask / WalletConnect | Freighter |
| EIP-191 wallet signature | Stellar Ed25519 signature |
| `MONAD_RPC_URL` | `STELLAR_RPC_URL` |
| `DEPLOYER_PRIVATE_KEY` (0x hex) | `STELLAR_SECRET_KEY` (S...) |
| Contract addresses (0x...) | Contract IDs (C...) |
| `wagmiConfig` + `useAccount()` | `StellarWalletContext` + `useStellarWallet()` |
| Chain ID in env vars | `STELLAR_NETWORK_PASSPHRASE` |

---

## Subscription Tiers

| Plan | Price | Agents | Meetings | $AURA stake |
|------|-------|--------|----------|-------------|
| Free | $0 | 1 | 3/month | — |
| Pro | $19/mo | 1 | Unlimited | or 1,000 $AURA |
| Business | $79/mo | 5 | Unlimited | or 10,000 $AURA |
| Enterprise | Custom | Unlimited | Unlimited | Custom |

$AURA staking provides the same access as the paid tier at a discount — aligning token holders with protocol growth.

---

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the complete guide covering Stellar contract deployment, Render (API + agent-runner + PostgreSQL + Redis), and Vercel (web app).

```bash
# Deploy all Stellar contracts
npx tsx packages/contracts/scripts/deploy-stellar.ts --network mainnet

# Render picks up render.yaml automatically on push to main
git push origin main

# Deploy web to Vercel
vercel --prod
```

---

## Stellar Resources

| Resource | Link |
|----------|------|
| Developer docs | https://developers.stellar.org |
| Soroban Rust SDK | https://docs.rs/soroban-sdk |
| Install soroban-cli | `cargo install soroban-cli --locked` |
| Freighter wallet | https://www.freighter.app |
| Testnet faucet | https://friendbot.stellar.org |
| Testnet explorer | https://stellar.expert/explorer/testnet |
| Mainnet explorer | https://stellar.expert/explorer/public |
| SCF grants (up to $150K XLM) | https://communityfund.stellar.org |
| Stellar Discord | https://discord.gg/stellar |

---

## Contributing

1. Branch from `develop`
2. Keep PRs scoped — one session per PR
3. All PRs must pass `pnpm lint` and `pnpm type-check`
4. Contract changes must include Soroban tests: `cargo test --features testutils`
5. Run `pnpm format` before committing

---

## License

MIT © Aura Protocol

---

<div align="center">

Built on Stellar &nbsp;·&nbsp; Powered by Claude &nbsp;·&nbsp; Designed for humans

*Every person deserves a sovereign digital representative.*

</div>