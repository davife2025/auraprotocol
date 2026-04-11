import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const CreateAgentSchema = z.object({
  name: z.string().min(1).max(50),
  personalityProfile: z.object({
    communicationStyle: z.enum(['formal', 'casual', 'professional']),
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']),
    timezone: z.string(),
    language: z.string().default('en'),
  }),
  permissions: z.object({
    meetings: z.object({
      canCommitTo: z.array(z.string()),
      cannotCommitTo: z.array(z.string()),
      escalateIf: z.array(z.string()),
    }),
    shopping: z.object({
      dailyBudgetCap: z.number().optional(),
      preferredCategories: z.array(z.string()),
      neverBuy: z.array(z.string()),
    }).optional(),
  }),
})

export async function agentRoutes(server: FastifyInstance) {
  // GET /agents — list agents for authenticated user
  server.get('/', {
    preHandler: [server.authenticate],
  }, async (request) => {
    const userId = (request.user as any).userId
    // TODO: implement in session 3
    return { agents: [], userId }
  })

  // POST /agents — create a new agent
  server.post('/', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    const body = CreateAgentSchema.parse(request.body)
    // TODO: implement in session 3 — mint identity NFT + create agent
    return reply.status(201).send({
      message: 'Agent creation queued — identity minting on Monad',
      body,
    })
  })

  // GET /agents/:id — get single agent
  server.get('/:id', {
    preHandler: [server.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string }
    // TODO: implement in session 3
    return { id, status: 'not_implemented_yet' }
  })

  // PATCH /agents/:id/permissions — update permissions
  server.patch('/:id/permissions', {
    preHandler: [server.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string }
    // TODO: implement in session 3 — update smart contract permissions
    return { id, updated: true }
  })

  // POST /agents/:id/pause — pause agent
  server.post('/:id/pause', {
    preHandler: [server.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string }
    return { id, status: 'paused' }
  })
}
