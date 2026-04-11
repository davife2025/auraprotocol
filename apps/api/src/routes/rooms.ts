import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const CreateRoomSchema = z.object({
  name: z.string().min(1).max(80),
  niche: z.string(),
  description: z.string().max(500),
  isPremium: z.boolean().default(false),
  stakeRequired: z.string().optional(), // MON amount in wei
})

const ResonanceSignalSchema = z.object({
  targetAgentId: z.string(),
  roomId: z.string(),
})

export async function roomRoutes(server: FastifyInstance) {
  // GET /rooms — list all rooms
  server.get('/', async (request) => {
    const { niche, search } = request.query as { niche?: string; search?: string }
    // TODO: session 6
    return {
      rooms: [
        { id: '1', name: 'Web3 Founders', niche: 'web3', memberCount: 0 },
        { id: '2', name: 'AI Builders', niche: 'ai', memberCount: 0 },
        { id: '3', name: 'Lagos Creatives', niche: 'creative', memberCount: 0 },
      ],
      niche,
      search,
    }
  })

  // POST /rooms — create a new niche room
  server.post('/', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    const body = CreateRoomSchema.parse(request.body)
    // TODO: session 6 — stake MON if premium, register onchain
    return reply.status(201).send({ message: 'Room created', body })
  })

  // POST /rooms/:id/join — agent joins a room
  server.post('/:id/join', {
    preHandler: [server.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string }
    const userId = (request.user as any).userId
    // TODO: session 6 — verify agent exists, check stake if premium room
    return { roomId: id, userId, joined: true }
  })

  // GET /rooms/:id/agents — list agents currently in a room
  server.get('/:id/agents', async (request) => {
    const { id } = request.params as { id: string }
    // TODO: session 6
    return { roomId: id, agents: [] }
  })

  // POST /rooms/resonate — send resonance signal to another agent
  server.post('/resonate', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    const { targetAgentId, roomId } = ResonanceSignalSchema.parse(request.body)
    // TODO: session 6 — calculate alignment score, check mutual resonance
    return reply.status(200).send({
      targetAgentId,
      roomId,
      alignmentScore: null,
      mutualMatch: false,
    })
  })

  // GET /rooms/connections — list all agent connections for user
  server.get('/connections', {
    preHandler: [server.authenticate],
  }, async (request) => {
    const userId = (request.user as any).userId
    // TODO: session 6
    return { connections: [], userId }
  })

  // WebSocket — live room presence feed
  server.get('/:id/presence', { websocket: true }, (socket, request) => {
    const { id } = request.params as { id: string }
    socket.send(JSON.stringify({ type: 'room_connected', roomId: id }))

    socket.on('message', (message: Buffer) => {
      const data = JSON.parse(message.toString())
      // TODO: session 6 — broadcast agent presence, resonance signals
      socket.send(JSON.stringify({ type: 'ack', ...data }))
    })
  })
}
