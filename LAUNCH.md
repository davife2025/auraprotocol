# Aura Protocol — Launch Checklist

## Pre-Launch (Session 8)

### Smart Contracts
- [ ] All contracts audited (Hardhat tests passing: `pnpm --filter @aura/contracts test`)
- [ ] Deploy to Monad testnet: `pnpm contracts:deploy:testnet`
- [ ] Verify on MonadVision block explorer
- [ ] Deploy to Monad mainnet: `pnpm contracts:deploy:mainnet`
- [ ] Update all contract addresses in `.env` production
- [ ] Authorise API wallet as minter/writer on all contracts
- [ ] Test mint identity on mainnet with test wallet

### Backend
- [ ] Run DB migrations on production: `pnpm db:migrate`
- [ ] Seed default Aura Rooms: auto-runs on API startup
- [ ] Verify Redis connection (BullMQ queues)
- [ ] Set all production env vars (see `.env.example`)
- [ ] API health check passing: `GET /health`

### Frontend
- [ ] `NEXT_PUBLIC_*` env vars set for production build
- [ ] `next build` passes with zero errors
- [ ] Test full onboarding flow end-to-end
- [ ] Test wallet connect (MetaMask + WalletConnect)
- [ ] Test meeting creation and agent attendance

### Stripe Billing
- [ ] Stripe webhook endpoint registered: `POST /api/v1/billing/webhook`
- [ ] Test Pro checkout flow in Stripe test mode
- [ ] Switch to live Stripe keys for production
- [ ] Verify subscription status updates in DB

### $AURA Token
- [ ] Token deployed on Monad mainnet
- [ ] Token listed on Monad-native DEX
- [ ] Token address published in docs
- [ ] Staking UI tested end-to-end
- [ ] Verify founder allocation lock-up (7-day minimum)

### Security
- [ ] All secrets rotated for production (JWT_SECRET, NEXTAUTH_SECRET)
- [ ] CORS origin set to production domain only
- [ ] Rate limiting confirmed active
- [ ] Input validation tested on all API routes
- [ ] No `console.log` of secrets in production logs

### Infrastructure
- [ ] Docker images built and pushed to registry
- [ ] Kubernetes/ECS deployment configs updated
- [ ] Health check endpoints monitored
- [ ] Redis persistence enabled (AOF)
- [ ] PostgreSQL backups configured

### Monitoring
- [ ] Error tracking configured (Sentry/Axiom)
- [ ] Uptime monitoring (Better Uptime/Checkly)
- [ ] Onchain event monitoring (Tenderly/Alchemy Notify)
- [ ] BullMQ dashboard accessible for queue monitoring

### Community
- [ ] Monad AI Blueprint application submitted
- [ ] Twitter/X announcement ready
- [ ] Discord/Telegram community set up
- [ ] Docs deployed (Mintlify)
- [ ] GitHub repo public

## Environment Variables — Production Checklist

```bash
# Must be set before launch
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
MONAD_RPC_URL=https://rpc.monad.xyz
MONAD_CHAIN_ID=...
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=<64-char random>
NEXTAUTH_SECRET=<64-char random>
NEXTAUTH_URL=https://app.auraprotocol.xyz
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PINECONE_API_KEY=...

# All contract addresses (after mainnet deploy)
AURA_IDENTITY_CONTRACT=0x...
AURA_REGISTRY_CONTRACT=0x...
AURA_REPUTATION_CONTRACT=0x...
AURA_PERMISSIONS_CONTRACT=0x...
AURA_MEETING_FACTORY_CONTRACT=0x...
AURA_TOKEN_CONTRACT=0x...
```

## Post-Launch

### Week 1
- Monitor BullMQ queues for job failures
- Watch Monad gas usage per interaction
- Track onboarding conversion rate
- Monitor meeting settlement success rate

### Month 1
- Apply for Monad ecosystem grants
- Begin VC outreach with traction data
- Publish $AURA tokenomics publicly
- Open beta for Aura Rooms to first 1,000 users
