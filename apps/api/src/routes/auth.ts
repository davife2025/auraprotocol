import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { verifyMessage } from 'viem'
import { prisma } from '../plugins/prisma.js'

const SignInSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string(),
  message: z.string(),
})

export async function authRoutes(server: FastifyInstance) {
  // GET /auth/nonce — get a sign-in nonce
  server.get('/nonce', async (request) => {
    const { address } = request.query as { address: string }
    const nonce = crypto.randomUUID()
    const message = [
      'Sign in to Aura Protocol',
      '',
      `Address: ${address}`,
      `Nonce: ${nonce}`,
      `Issued: ${new Date().toISOString()}`,
    ].join('\n')
    return { nonce, message }
  })

  // POST /auth/signin — verify signature and return JWT
  server.post('/signin', async (request, reply) => {
    const { walletAddress, signature, message } = SignInSchema.parse(request.body)

    const isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    }).catch(() => false)

    if (!isValid) return reply.status(401).send({ error: 'Invalid signature' })

    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: { lastLoginAt: new Date() },
      create: { walletAddress, lastLoginAt: new Date() },
    })

    const token = server.jwt.sign(
      { userId: user.id, walletAddress },
      { expiresIn: '7d' }
    )

    return { token, user: { id: user.id, walletAddress } }
  })

  // GET /auth/me — get current user
  server.get('/me', { preHandler: [server.authenticate] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        agents: { select: { id: true, name: true, status: true, reputationScore: true } },
        subscriptions: { select: { plan: true, status: true } },
      },
    })
    return user
  })
}
