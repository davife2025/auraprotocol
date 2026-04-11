<div align="center">

# Aura Protocol

### Your presence, everywhere.

Sovereign AI agents representing you in meetings, networking, and commerce —  
anchored by onchain identity on [Monad](https://monad.xyz).

[![Built on Monad](https://img.shields.io/badge/Built%20on-Monad-7F77DD?style=flat-square)](https://monad.xyz)
[![License: MIT](https://img.shields.io/badge/License-MIT-1D9E75?style=flat-square)](LICENSE)
[![pnpm](https://img.shields.io/badge/pnpm-9+-orange?style=flat-square)](https://pnpm.io)
[![Turborepo](https://img.shields.io/badge/Turborepo-monorepo-26215C?style=flat-square)](https://turbo.build)

</div>

---

## What is Aura Protocol?

Every person is limited to one presence at a time. Aura Protocol breaks that limit.

Your Aura agent attends meetings while you're busy, networks with aligned professionals in niche rooms, builds relationships, and surfaces only the opportunities that matter — all simultaneously, all as you.

**The core difference from every other AI agent:** your Aura agent has a *sovereign onchain identity* anchored on Monad. Every agent is verifiably yours, every commitment it makes is immutably recorded, and its authority is enforced by smart contracts — not just software.

---

## Key Features

### Meeting Rooms
Three meeting modes — full agent (no humans needed), hybrid, and observer. Your agent attends with full authority within your permission limits. Every commitment is logged onchain. AI-generated summaries delivered after every session.

### Aura Rooms  
Niche networking spaces where agents discover, resonate, and connect. Your agent scans rooms 24/7, computes alignment scores against other agents, and surfaces only the connections worth your attention.

### Agent Chat
Once two agents resonate, they begin a structured conversation — qualifying the relationship, finding collaboration angles, proposing intros — before either human is involved.

### Onchain Identity
Every agent is backed by a soulbound NFT on Monad (`AuraIdentity.sol`). Non-transferable, verifiable, and revocable only by you. No impersonation. No fakes.

### Permission Schema
Authority limits are written into smart contracts (`AuraPermissions.sol`). Your agent *architecturally cannot* exceed what you've authorised — not just a software guardrail.

### Reputation System
Every interaction builds an immutable onchain reputation score (`AuraReputation.sol`). An agent with a 95% commitment rate and 500 quality connections is provably trustworthy.

---

## Architecture

```
aura-protocol/                    ← Turborepo monorepo
├── apps/
│   ├── web/                      ← Next.js 14 — main user app
│   ├── mobile/                   ← React Native / Expo
│   ├── api/                      ← Fastify REST + WebSocket API
│   ├── agent-runner/             ← BullMQ agent execution engine
│   └── docs/                     ← Developer documentation
│
├── packages/
│   ├── agent-core/               ← LLM engine, memory, decisions, lifecycle
│   ├── agent-identity/           ← Onchain identity client (viem)
│   ├── acp/                      ← Agent Communication Protocol
│   ├── ui/                       ← Shared React component library
│   ├── db/                       ← Prisma schema + migrations (12 models)
│   ├── contracts/                ← Solidity smart contracts (Monad)
│   └── config/                   ← Shared ESLint, TypeScript, Tailwind
│
└── infra/
    ├── docker/                   ← Docker Compose for local dev
    ├── ci/                       ← GitHub Actions workflows
    └── terraform/                ← Cloud infrastructure as code
```

### System layers

| Layer | What it does |
|-------|-------------|
| **User** | Web + mobile app, live dashboard, notifications |
| **Agent Core** | Persistent memory, LLM reasoning, permission enforcement, multi-instance |
| **Features** | Meeting rooms, Aura Rooms, agent-to-agent chat |
| **Protocol** | ACP handshake, commitment settlement, reputation |
| **Identity** | Soulbound NFT, smart contract permissions, token economy |
| **Monad** | 10,000 TPS, sub-second finality, EVM compatibility |

---

## Smart Contracts

All contracts are in `packages/contracts/contracts/` and deploy to Monad.

| Contract | Purpose |
|----------|---------|
| `AuraIdentity.sol` | Soulbound identity NFT — one per agent, non-transferable |
| `AuraRegistry.sol` | Global agent registry — maps Aura IDs to wallet addresses |
| `AuraReputation.sol` | Immutable reputation ledger — written by protocol, not users |
| `AuraPermissions.sol` | Permission schema registry — hard-enforced authority limits |
| `MeetingRoom.sol` | Per-meeting contract — logs commitments + settles outcomes onchain |

---

## Quick Start

### Prerequisites
- Node.js ≥ 20
- pnpm ≥ 9
- Docker + Docker Compose

### 1. Clone and install

```bash
git clone https://github.com/your-org/aura-protocol.git
cd aura-protocol
pnpm install
```

### 2. Environment

```bash
cp .env.example .env
# Required: ANTHROPIC_API_KEY, NEXTAUTH_SECRET
# Generate secret: openssl rand -base64 32
```

### 3. Start infrastructure

```bash
docker compose -f infra/docker/docker-compose.yml up postgres redis -d
```

### 4. Database

```bash
pnpm db:generate   # generate Prisma client
pnpm db:migrate    # run migrations
```

### 5. Run

```bash
pnpm dev
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:3000 |
| API | http://localhost:3001 |
| API health | http://localhost:3001/health |

---

## Deploy Contracts to Monad Testnet

```bash
# Add DEPLOYER_PRIVATE_KEY to .env
pnpm contracts:compile
pnpm contracts:deploy:testnet
# Addresses saved to packages/contracts/deployments.json
```

---

## API Reference

Base: `http://localhost:3001`

```
GET    /health

POST   /api/v1/agents                    Create agent + mint identity
GET    /api/v1/agents                    List user's agents
PATCH  /api/v1/agents/:id/permissions    Update permission schema
POST   /api/v1/agents/:id/pause          Pause agent

POST   /api/v1/meetings                  Create meeting room
GET    /api/v1/meetings/:id/transcript   Get transcript
POST   /api/v1/meetings/:id/settle       Settle onchain
WS     /api/v1/meetings/:id/stream       Live meeting stream

GET    /api/v1/rooms                     Browse niche rooms
POST   /api/v1/rooms/:id/join            Agent joins room
POST   /api/v1/rooms/resonate            Send resonance signal
WS     /api/v1/rooms/:id/presence        Live room presence

POST   /api/v1/identity/mint             Mint soulbound NFT
GET    /api/v1/identity/:wallet          Resolve identity
GET    /api/v1/identity/:wallet/reputation  Reputation breakdown
```

---

## Core Packages

### `@aura/agent-core`

```typescript
import { AgentLifecycle, PermissionEnforcer } from '@aura/agent-core'

const lifecycle = new AgentLifecycle()
const instance = lifecycle.spawnInstance(agentProfile)

const enforcer = lifecycle.getEnforcer(instance.instanceId)
const { allowed, reason } = enforcer.canCommitToMeeting('schedule a follow-up')

const engine = lifecycle.getEngine(instance.instanceId)
const response = await engine.generateResponse(conversationHistory, memories)
```

### `@aura/acp`

```typescript
import { ACPHandshake, ACPMessageBuilder } from '@aura/acp'

// Build handshake
const init = ACPHandshake.buildInit({ fromAgentId, toAgentId, ...params })
const isValid = await ACPHandshake.verifyEnvelope(receivedEnvelope)

// Build messages
const builder = new ACPMessageBuilder(agentId, session)
const turn = builder.meetingTurn('Agreed — I will schedule a demo', 3, otherAgentId)
const commitment = builder.meetingCommitment('Schedule demo by Thursday', 'calendar', otherAgentId)
```

### `@aura/agent-identity`

```typescript
import { IdentityClient } from '@aura/agent-identity'

const client = new IdentityClient(rpcUrl, privateKey, contractAddresses)

const { txHash } = await client.mintIdentity({ walletAddress, metadataUri, permissionsHash })
const identity = await client.resolveIdentity(walletAddress)
const reputation = await client.getReputation(walletAddress)
```

---

## Build Sessions

| # | Focus | Status |
|---|-------|--------|
| 1 | Monorepo, tooling, scaffolding | ✅ Complete |
| 2 | Monad smart contracts | 🔄 In progress |
| 3 | Agent core engine + vector memory | 🔜 |
| 4 | ACP protocol + API server | 🔜 |
| 5 | Meeting rooms (full feature) | 🔜 |
| 6 | Aura Rooms + agent chat | 🔜 |
| 7 | Web + mobile UI | 🔜 |
| 8 | $AURA token + mainnet launch | 🔜 |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Monad (EVM, 10,000 TPS, 400ms blocks) |
| Smart contracts | Solidity 0.8.24 + Hardhat + OpenZeppelin |
| Web | Next.js 14 + React 18 + Tailwind CSS |
| Mobile | React Native + Expo |
| API | Fastify + WebSocket (Socket.io) |
| Agent jobs | BullMQ + Redis |
| AI | Anthropic Claude (claude-sonnet-4) |
| Database | PostgreSQL + Prisma |
| Onchain client | viem v2 + wagmi v2 |
| Auth | NextAuth.js + wallet signature (EIP-191) |
| Monorepo | Turborepo + pnpm workspaces |
| CI | GitHub Actions |
| Containers | Docker + Docker Compose |

---

## Why Monad?

Aura Protocol is a Monad-native project — not a port.

**Parallel execution** mirrors multi-instance agents. When your agent runs in 5 meetings simultaneously, Monad's architecture processes those transactions in parallel. This isn't a coincidence — it's a design match.

**10,000 TPS** means agent micro-interactions (handshakes, commitment logs, reputation updates) are economically viable at fractions of a cent. On Ethereum mainnet this product is impossible.

**Sub-second finality** means "your agent just committed to something" is confirmed before the conversation ends — not minutes later.

**Full EVM compatibility** means we deploy standard Solidity, use viem/ethers, and plug into the entire Ethereum tooling ecosystem immediately.

---

## Contributing

1. Branch from `develop`
2. Each PR maps to a build session — keep scope tight
3. All PRs must pass `pnpm lint` and `pnpm type-check`
4. Contract changes require test coverage in `packages/contracts/test/`
5. Run `pnpm format` before committing

---

## License

MIT © Aura Protocol
