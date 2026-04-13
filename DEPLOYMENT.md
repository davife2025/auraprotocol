# Aura Protocol — Deployment Guide

> **Blockchain:** Stellar (Soroban smart contracts)  
> **Web app:** Vercel  
> **API + agent-runner:** Render  
> **Database:** Render PostgreSQL  
> **Queue:** Render Redis  

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Stellar Contract Deployment](#2-stellar-contract-deployment)
3. [Database Setup](#3-database-setup)
4. [Deploy API to Render](#4-deploy-api-to-render)
5. [Deploy Agent-Runner to Render](#5-deploy-agent-runner-to-render)
6. [Deploy Web App to Vercel](#6-deploy-web-app-to-vercel)
7. [Post-Deployment Checklist](#7-post-deployment-checklist)
8. [Environment Variables Reference](#8-environment-variables-reference)
9. [Monitoring & Troubleshooting](#9-monitoring--troubleshooting)

---

## 1. Prerequisites

### Tools to install locally

```bash
# Rust (required for Soroban contracts)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Soroban CLI
cargo install soroban-cli --locked

# Node.js 20+
node --version   # must be >= 20

# pnpm
npm install -g pnpm@9

# Stellar CLI (optional, for account management)
# https://github.com/stellar/stellar-cli
```

### Accounts you need

| Service | URL | Purpose |
|---------|-----|---------|
| Stellar | stellar.org | Blockchain |
| Render  | render.com  | API + worker + DB + Redis |
| Vercel  | vercel.com  | Web frontend |
| Anthropic | console.anthropic.com | AI (Claude) |
| Stripe  | dashboard.stripe.com | Payments |
| Pinecone | pinecone.io | Vector memory |

---

## 2. Stellar Contract Deployment

### 2a. Create a Stellar deployer account

```bash
# Generate a new keypair
soroban keys generate deployer --network testnet

# Fund it on testnet (free)
curl https://friendbot.stellar.org?addr=$(soroban keys address deployer)

# For mainnet — fund with real XLM via any exchange
# You need ~100 XLM for all contract deployments
```

### 2b. Set your secret key

```bash
# Get your secret key
soroban keys show deployer

# Add to .env
echo "STELLAR_SECRET_KEY=S..." >> .env
```

### 2c. Build and deploy all contracts

```bash
cd aura-protocol

# Install dependencies
pnpm install

# Deploy to testnet
npx tsx packages/contracts/scripts/deploy-stellar.ts --network testnet

# Deploy to mainnet (production)
npx tsx packages/contracts/scripts/deploy-stellar.ts --network mainnet
```

The script will:
1. Build each Rust contract to WASM
2. Upload WASM to Stellar
3. Deploy each contract and get its contract ID
4. Initialise each contract with your admin key
5. Print all contract IDs and save to `deployments-stellar-{network}.json`

### 2d. Manual deployment (if the script fails)

```bash
cd packages/contracts/contracts-stellar

# Build one contract manually
cd aura-identity
cargo build --target wasm32-unknown-unknown --release

# Upload WASM
soroban contract upload \
  --wasm target/wasm32-unknown-unknown/release/aura_identity.wasm \
  --source deployer \
  --network testnet

# Deploy
soroban contract deploy \
  --wasm-hash <WASM_HASH_FROM_ABOVE> \
  --source deployer \
  --network testnet

# Initialise
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- init \
  --admin <YOUR_STELLAR_PUBLIC_KEY>
```

Repeat for `aura-reputation`, `aura-permissions`, `aura-meeting-factory`, `aura-token`.

### 2e. Authorise the API as writer/minter

After all contracts are deployed and your API's Stellar key is set:

```bash
# Authorise API key as identity minter
soroban contract invoke \
  --id <IDENTITY_CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- authorise_minter \
  --caller <DEPLOYER_PUBLIC_KEY> \
  --minter <API_STELLAR_PUBLIC_KEY>

# Authorise API as reputation writer
soroban contract invoke \
  --id <REPUTATION_CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- authorise_writer \
  --caller <DEPLOYER_PUBLIC_KEY> \
  --writer <API_STELLAR_PUBLIC_KEY>

# Authorise API as permissions writer
soroban contract invoke \
  --id <PERMISSIONS_CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- authorise_writer \
  --caller <DEPLOYER_PUBLIC_KEY> \
  --writer <API_STELLAR_PUBLIC_KEY>
```

### 2f. Verify contracts

```bash
# Check identity contract is live
soroban contract invoke \
  --id <IDENTITY_CONTRACT_ID> \
  --network testnet \
  -- total_supply

# Should return 0 (no identities minted yet)
```

View on Stellar Explorer:
- Testnet: `https://stellar.expert/explorer/testnet/contract/<CONTRACT_ID>`
- Mainnet: `https://stellar.expert/explorer/public/contract/<CONTRACT_ID>`

---

## 3. Database Setup

### Option A — Render PostgreSQL (recommended)

1. Go to [render.com](https://render.com) → **New +** → **PostgreSQL**
2. Settings:
   - Name: `aura-protocol-db`
   - Region: `Oregon (US West)` or closest to your users
   - PostgreSQL version: `16`
   - Plan: `Starter ($7/mo)` for dev, `Standard ($20/mo)` for production
3. Click **Create Database**
4. Copy the **Internal Database URL** (for Render services) and **External Database URL** (for local dev)

### Option B — Supabase (alternative)

1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings → Database → Connection string (URI mode)
3. Use the connection pooling URL for production

### Run migrations

```bash
# Set DATABASE_URL in your .env
DATABASE_URL=postgresql://...

# Generate Prisma client
pnpm db:generate

# Run all migrations
pnpm db:migrate
```

---

## 4. Deploy API to Render

### 4a. Create a Redis instance first

1. Render → **New +** → **Redis**
2. Settings:
   - Name: `aura-protocol-redis`
   - Plan: `Starter`
3. Copy the **Internal Redis URL**

### 4b. Create the API web service

1. Render → **New +** → **Web Service**
2. Connect your GitHub repo
3. Settings:

| Field | Value |
|-------|-------|
| Name | `aura-protocol-api` |
| Region | Same as your DB |
| Branch | `main` |
| Runtime | `Node` |
| Build Command | `pnpm install && pnpm --filter @aura/db generate && pnpm --filter @aura/api build` |
| Start Command | `node apps/api/dist/index.js` |
| Plan | `Starter ($7/mo)` or `Standard ($25/mo)` |

4. Add environment variables (see Section 8)

5. Under **Advanced** → add a health check path: `/health`

### 4c. Environment variables for API on Render

```
NODE_ENV=production
DATABASE_URL=<Render internal PostgreSQL URL>
REDIS_HOST=<Render internal Redis host>
REDIS_PORT=6379
STELLAR_NETWORK=mainnet
STELLAR_RPC_URL=https://mainnet.sorobanrpc.com
STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
STELLAR_SECRET_KEY=<Your API Stellar secret key>
STELLAR_IDENTITY_CONTRACT=<from deployment>
STELLAR_REPUTATION_CONTRACT=<from deployment>
STELLAR_PERMISSIONS_CONTRACT=<from deployment>
STELLAR_MEETING_FACTORY_CONTRACT=<from deployment>
STELLAR_TOKEN_CONTRACT=<from deployment>
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=<openssl rand -base64 32>
APP_URL=https://app.auraprotocol.xyz
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4d. Post-deploy DB migration

After first deploy, run in Render Shell:

```bash
npx prisma migrate deploy
```

---

## 5. Deploy Agent-Runner to Render

The agent-runner is a background worker — it does NOT need a public URL.

1. Render → **New +** → **Background Worker**
2. Connect same GitHub repo
3. Settings:

| Field | Value |
|-------|-------|
| Name | `aura-protocol-agent-runner` |
| Branch | `main` |
| Build Command | `pnpm install && pnpm --filter @aura/agent-runner build` |
| Start Command | `node apps/agent-runner/dist/index.js` |
| Plan | `Starter` (scale up as agents grow) |

4. Add the **same environment variables** as the API service, plus:

```
REDIS_HOST=<same Render Redis host>
REDIS_PORT=6379
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 6. Deploy Web App to Vercel

### 6a. Connect to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# From the repo root
cd aura-protocol
vercel
```

Or via the Vercel dashboard:
1. [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Framework preset: **Next.js**
4. Root directory: `apps/web`

### 6b. Build configuration

In Vercel project settings → **Build & Development Settings**:

| Field | Value |
|-------|-------|
| Framework Preset | Next.js |
| Root Directory | `apps/web` |
| Build Command | `cd ../.. && pnpm install && pnpm --filter @aura/web build` |
| Output Directory | `.next` |
| Install Command | `pnpm install` |

Or add a `vercel.json` at the repo root:

```json
{
  "buildCommand": "pnpm --filter @aura/web build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

### 6c. Environment variables for Vercel

In Vercel project → **Settings** → **Environment Variables**:

```
NEXTAUTH_SECRET=<same as API>
NEXTAUTH_URL=https://app.auraprotocol.xyz
DATABASE_URL=<External PostgreSQL URL from Render>
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_API_URL=https://aura-protocol-api.onrender.com
NEXT_PUBLIC_WS_URL=wss://aura-protocol-api.onrender.com
NEXT_PUBLIC_STELLAR_NETWORK=mainnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://mainnet.sorobanrpc.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 6d. Custom domain

1. Vercel project → **Settings** → **Domains**
2. Add `app.auraprotocol.xyz`
3. Update DNS: add CNAME pointing to `cname.vercel-dns.com`

### 6e. Stripe webhook for production

Register the Stripe webhook pointing to your API:

```
Endpoint: https://aura-protocol-api.onrender.com/api/v1/billing/webhook
Events: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
```

---

## 7. Post-Deployment Checklist

### Immediately after deploy

```bash
# 1. Verify API health
curl https://aura-protocol-api.onrender.com/health
# Expected: { "status": "ok", ... }

# 2. Verify DB connection (check Render logs)
# Look for: "Aura Protocol API running on port 3001"

# 3. Verify default rooms are seeded
curl https://aura-protocol-api.onrender.com/api/v1/rooms
# Should return 10 niche rooms

# 4. Test onboarding flow
# Visit https://app.auraprotocol.xyz/onboarding
# Connect Freighter wallet, create an agent
```

### Within first week

- [ ] Monitor Render service logs for errors
- [ ] Set up Render alerts (CPU, memory, request errors)
- [ ] Verify Stellar contract interactions in explorer
- [ ] Test full meeting creation → agent attendance → settlement
- [ ] Test Stripe checkout in live mode with real card
- [ ] Confirm Pinecone vector storage working (agent memory)
- [ ] Apply for Stellar Community Fund (SCF) grant — up to $150K XLM

---

## 8. Environment Variables Reference

### Complete variable list

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` in prod |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_HOST` | Yes | Redis host |
| `REDIS_PORT` | Yes | Redis port (default 6379) |
| `STELLAR_NETWORK` | Yes | `testnet` or `mainnet` |
| `STELLAR_RPC_URL` | Yes | Soroban RPC endpoint |
| `STELLAR_NETWORK_PASSPHRASE` | Yes | Network passphrase |
| `STELLAR_SECRET_KEY` | Yes | API admin Stellar secret |
| `STELLAR_IDENTITY_CONTRACT` | Yes | Deployed contract ID |
| `STELLAR_REPUTATION_CONTRACT` | Yes | Deployed contract ID |
| `STELLAR_PERMISSIONS_CONTRACT` | Yes | Deployed contract ID |
| `STELLAR_MEETING_FACTORY_CONTRACT` | Yes | Deployed contract ID |
| `STELLAR_TOKEN_CONTRACT` | Yes | Deployed contract ID |
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `ANTHROPIC_MODEL` | No | Default: `claude-sonnet-4-20250514` |
| `JWT_SECRET` | Yes | 32+ char random string |
| `NEXTAUTH_SECRET` | Yes | 32+ char random string |
| `NEXTAUTH_URL` | Yes | Full URL of web app |
| `STRIPE_SECRET_KEY` | Yes | `sk_live_...` in production |
| `STRIPE_WEBHOOK_SECRET` | Yes | `whsec_...` from Stripe |
| `STRIPE_PRO_PRICE_ID` | Yes | Stripe price ID |
| `STRIPE_BUSINESS_PRICE_ID` | Yes | Stripe price ID |
| `PINECONE_API_KEY` | No | For vector memory |
| `PINECONE_ENVIRONMENT` | No | Pinecone region |
| `PINECONE_INDEX` | No | Index name |
| `APP_URL` | Yes | API's allowed CORS origin |

### Stellar RPC endpoints

| Network | RPC URL |
|---------|---------|
| Mainnet | `https://mainnet.sorobanrpc.com` |
| Testnet | `https://soroban-testnet.stellar.org` |
| Mainnet (SDF) | `https://soroban.stellar.org` |

---

## 9. Monitoring & Troubleshooting

### Useful commands

```bash
# Check API logs on Render
# Dashboard → aura-protocol-api → Logs

# Check agent-runner queue health
# Render Shell → node -e "require('bullmq')...." (or use BullMQ dashboard)

# Verify Stellar contract state
soroban contract invoke \
  --id <IDENTITY_CONTRACT_ID> \
  --network mainnet \
  -- total_supply

# Check Stellar account balance
curl https://horizon.stellar.org/accounts/<YOUR_PUBLIC_KEY>

# Fund testnet account
curl "https://friendbot.stellar.org?addr=<PUBLIC_KEY>"
```

### Common issues

**`Identity mint failed: insufficient XLM`**
→ Fund your deployer account. Each contract call costs ~0.00001 XLM.

**`Freighter not detected` in web app**
→ User needs to install [Freighter](https://www.freighter.app/) browser extension.

**`Contract not initialised`**
→ Run the `init` function on the contract with your admin key.

**`BullMQ connection refused`**
→ Check REDIS_HOST/REDIS_PORT env vars. Render Redis uses an internal hostname only accessible from other Render services.

**Render API cold starts (Starter plan)**
→ Upgrade to Standard plan to avoid sleep. Alternatively, add an uptime monitoring ping every 5 minutes.

**Vercel build fails: `Cannot find module '@aura/ui'`**
→ Set the root directory to `apps/web` AND set the build command to `cd ../.. && pnpm install && pnpm --filter @aura/web build` so workspace packages are installed first.

**NextAuth `NEXTAUTH_URL` mismatch**
→ Must exactly match your Vercel deployment URL including `https://`.

---

## Quick Reference — All Service URLs

| Service | URL pattern |
|---------|-------------|
| Web app | `https://app.auraprotocol.xyz` |
| API | `https://aura-protocol-api.onrender.com` |
| API health | `https://aura-protocol-api.onrender.com/health` |
| Stellar Testnet explorer | `https://stellar.expert/explorer/testnet` |
| Stellar Mainnet explorer | `https://stellar.expert/explorer/public` |
| Stellar Testnet horizon | `https://horizon-testnet.stellar.org` |
| Stellar Mainnet horizon | `https://horizon.stellar.org` |

---

## Stellar Developer Resources

- Docs: https://developers.stellar.org
- Soroban SDK: https://docs.rs/soroban-sdk
- Soroban CLI: `cargo install soroban-cli --locked`
- Freighter wallet: https://www.freighter.app
- Community fund (grants): https://communityfund.stellar.org
- Discord: https://discord.gg/stellar
- Stellar Quest (tutorials): https://quest.stellar.org
