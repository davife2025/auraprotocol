import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const MintIdentitySchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  agentId: z.string(),
  metadataUri: z.string().url().optional(),
})

export async function identityRoutes(server: FastifyInstance) {
  // POST /identity/mint — mint soulbound identity NFT on Monad
  server.post('/mint', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    const body = MintIdentitySchema.parse(request.body)
    // TODO: session 2 — call AuraIdentity.sol mint function
    return reply.status(202).send({
      message: 'Identity minting queued on Monad',
      walletAddress: body.walletAddress,
      txHash: null, // returned after Monad confirms
    })
  })

  // GET /identity/:walletAddress — resolve onchain identity
  server.get('/:walletAddress', async (request) => {
    const { walletAddress } = request.params as { walletAddress: string }
    // TODO: session 2 — read from AuraRegistry.sol
    return {
      walletAddress,
      auraId: null,
      identityTokenId: null,
      reputationScore: null,
      onchain: false,
    }
  })

  // GET /identity/:walletAddress/reputation — get reputation breakdown
  server.get('/:walletAddress/reputation', async (request) => {
    const { walletAddress } = request.params as { walletAddress: string }
    // TODO: session 2 — read from AuraReputation.sol
    return {
      walletAddress,
      overall: null,
      commitmentRate: null,
      meetingQuality: null,
      networkingScore: null,
      totalInteractions: 0,
    }
  })

  // POST /identity/verify — verify agent handshake signature
  server.post('/verify', async (request) => {
    const { signature, message, walletAddress } = request.body as any
    // TODO: session 4 — ACP handshake verification
    return { verified: false, walletAddress }
  })
}
