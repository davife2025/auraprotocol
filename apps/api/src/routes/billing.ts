import type { FastifyInstance } from 'fastify'
import { billingService } from '../services/billingService.js'

// Augment FastifyRequest to include rawBody (added by fastify-raw-body plugin)
declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer
  }
}

export async function billingRoutes(server: FastifyInstance) {
  server.post('/checkout', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { plan } = request.body as { plan: 'PRO' | 'BUSINESS' }
    const origin = request.headers.origin ?? process.env.APP_URL ?? 'http://localhost:3000'

    const session = await billingService.createCheckoutSession(
      userId, plan,
      `${origin}/dashboard?upgraded=true`,
      `${origin}/dashboard`
    )
    return reply.send({ url: session.url })
  })

  server.post('/webhook', async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string
    const result = await billingService.handleWebhook(request.rawBody as Buffer, sig)
    return reply.send(result)
  })

  server.get('/subscription', { preHandler: [server.authenticate] }, async (request) => {
    const { userId } = request.user as { userId: string }
    return billingService.getSubscription(userId)
  })
}