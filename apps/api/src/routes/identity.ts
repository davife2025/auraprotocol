import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getIdentityClient, isOnchainConfigured } from '../services/onchain.js'
import { keccak256, toHex } from 'viem'

const MintIdentitySchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  agentId: z.string(),
  metadataUri: z.string().url().optional(),
  permissionsJson: z.record(z.unknown()).optional(),
})

export async function identityRoutes(server: FastifyInstance) {

  // POST /identity/mint — mint soulbound identity NFT on Monad
  server.post('/mint', {
    preHandler: [server.authenticate],
  }, async (request, _reply) => {
    const body = MintIdentitySchema.parse(request.body)

    if (!isOnchainConfigured()) {
      return _reply.status(202).send({
        message: 'Onchain not configured — contracts not yet deployed. Run pnpm contracts:deploy:testnet.',
        walletAddress: body.walletAddress,
        txHash: null,
        onchain: false,
      })
    }

    try {
      const client = getIdentityClient()
      const permissionsHash = body.permissionsJson
        ? keccak256(toHex(JSON.stringify(body.permissionsJson))) as `0x${string}`
        : '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`

      const { txHash } = await client.mintIdentity({
        walletAddress: body.walletAddress as `0x${string}`,
        metadataUri: body.metadataUri ?? `ipfs://aura/${body.agentId}`,
        permissionsHash,
      })

      return _reply.status(202).send({
        message: 'Identity minted on Monad',
        walletAddress: body.walletAddress,
        txHash,
        onchain: true,
      })
    } catch (err: any) {
      server.log.error({ err }, 'Identity mint failed')
      return _reply.status(500).send({ error: 'Mint failed', message: err.message })
    }
  })

  // GET /identity/:walletAddress — resolve onchain identity
  server.get('/:walletAddress', async (request) => {
    const { walletAddress } = request.params as { walletAddress: string }

    if (!isOnchainConfigured()) {
      return { walletAddress, onchain: false, identity: null }
    }

    try {
      const client = getIdentityClient()
      const identity = await client.resolveIdentity(walletAddress as `0x${string}`)
      return { walletAddress, onchain: true, identity }
    } catch (err: any) {
      server.log.error({ err }, 'Identity resolve failed')
      return { walletAddress, onchain: false, identity: null, error: err.message }
    }
  })

  // GET /identity/:walletAddress/reputation — get reputation breakdown
  server.get('/:walletAddress/reputation', async (request) => {
    const { walletAddress } = request.params as { walletAddress: string }

    if (!isOnchainConfigured()) {
      return { walletAddress, onchain: false, reputation: null }
    }

    try {
      const client = getIdentityClient()
      const reputation = await client.getReputation(walletAddress as `0x${string}`)
      return { walletAddress, onchain: true, reputation }
    } catch (err: any) {
      return { walletAddress, onchain: false, reputation: null, error: err.message }
    }
  })

  // GET /identity/:walletAddress/access — get subscription tier from staked $AURA
  // TODO: session 4 — wire up TokenClient.getAccessTier and getStakingInfo once deployed
  server.get('/:walletAddress/access', async (request) => {
    const { walletAddress } = request.params as { walletAddress: string }
    return { walletAddress, tier: 'free', onchain: false }
  })

  // POST /identity/verify — verify agent handshake signature
  server.post('/verify', async (request) => {
    const { walletAddress } = request.body as { signature?: string; message?: string; walletAddress: string }
    // TODO: session 4 — ACP handshake verification
    return { verified: false, walletAddress }
  })
}