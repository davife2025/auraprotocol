import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { roomService } from '../services/roomService.js'

const CreateRoomSchema = z.object({
  name: z.string().min(1).max(80),
  niche: z.string(),
  description: z.string().max(500).optional(),
  isPremium: z.boolean().default(false),
  stakeRequired: z.string().optional(),
})

const ResonanceSchema = z.object({
  fromAgentId: z.string(),
  toAgentId: z.string(),
  roomId: z.string(),
})

const ChatSchema = z.object({
  connectionId: z.string(),
  fromAgentId: z.string(),
  message: z.string().min(1).max(2000),
})

export async function roomRoutes(server: FastifyInstance) {
  server.get('/', async (request) => {
    const { niche, search } = request.query as { niche?: string; search?: string }
    return roomService.getRooms(niche, search)
  })

  server.post('/', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const body = CreateRoomSchema.parse(request.body)
    const room = await roomService.createRoom(userId, body)
    return reply.status(201).send(room)
  })

  server.post('/:id/join', { preHandler: [server.authenticate] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    const { agentId } = request.body as { agentId: string }
    return roomService.joinRoom(id, userId, agentId)
  })

  server.post('/:id/leave', { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string }
    const { agentId } = request.body as { agentId: string }
    await roomService.leaveRoom(id, agentId)
    return { roomId: id, agentId, left: true }
  })

  server.get('/:id/agents', async (request) => {
    const { id } = request.params as { id: string }
    return roomService.getAgentsInRoom(id)
  })

  server.post('/resonate', { preHandler: [server.authenticate] }, async (request) => {
    const { fromAgentId, toAgentId, roomId } = ResonanceSchema.parse(request.body)
    return roomService.computeResonance(fromAgentId, toAgentId, roomId)
  })

  server.get('/connections', { preHandler: [server.authenticate] }, async (request) => {
    const { userId } = request.user as { userId: string }
    return roomService.getConnectionsForUser(userId)
  })

  server.post('/chat', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { connectionId, fromAgentId, message } = ChatSchema.parse(request.body)
    const entry = await roomService.sendAgentChatMessage(connectionId, fromAgentId, message)
    return reply.status(201).send(entry)
  })

  server.get('/connections/:connectionId/chat', { preHandler: [server.authenticate] }, async (request) => {
    const { connectionId } = request.params as { connectionId: string }
    return roomService.getChatHistory(connectionId)
  })

  // WebSocket — live room presence
  server.get('/:id/presence', { websocket: true }, (socket, request) => {
    const { id } = request.params as { id: string }
    socket.send(JSON.stringify({ type: 'room_connected', roomId: id }))

    socket.on('message', (rawMsg: Buffer) => {
      try {
        const msg = JSON.parse(rawMsg.toString())
        if (msg.type === 'presence_ping') {
          socket.send(JSON.stringify({ type: 'presence_pong', roomId: id, timestamp: Date.now() }))
        }
        if (msg.type === 'resonance_signal') {
          socket.send(JSON.stringify({ type: 'resonance_received', ...msg }))
        }
      } catch { /* ignore malformed */ }
    })
  })
}
