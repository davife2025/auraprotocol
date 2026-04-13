import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { meetingService } from '../services/meetingService.js'
import { agentService } from '@aura/agent-core'

const CreateMeetingSchema = z.object({
  title: z.string().min(1).max(100),
  agenda: z.string().max(2000).optional(),
  mode: z.enum(['FULL_AGENT', 'HYBRID', 'OBSERVER']),
  scheduledAt: z.string().datetime(),
  invitees: z.array(z.object({ auraId: z.string(), role: z.string() })),
  rules: z.object({
    agentsCanMakeBindingCommitments: z.boolean().default(false),
    recordOnchain: z.boolean().default(true),
  }),
})

export async function meetingRoutes(server: FastifyInstance) {
  server.get('/', { preHandler: [server.authenticate] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const meetings = await server.prisma.meeting.findMany({
      where: { participants: { some: { agent: { userId } } } },
      include: {
        _count: { select: { participants: true, commitments: true, transcriptEntries: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    })
    return { meetings }
  })

  server.post('/', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const body = CreateMeetingSchema.parse(request.body)
    const meeting = await meetingService.createMeeting(userId, body)
    return reply.status(201).send({ meeting })
  })

  server.get('/:id', { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string }
    return server.prisma.meeting.findUniqueOrThrow({
      where: { id },
      include: {
        participants: { include: { agent: { select: { id: true, name: true, reputationScore: true } } } },
        commitments: true,
        transcriptEntries: { orderBy: { turnNumber: 'asc' }, take: 20 },
      },
    })
  })

  server.post('/:id/start', { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string }
    return meetingService.startMeeting(id)
  })

  server.post('/:id/settle', { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string }
    return meetingService.settleMeeting(id)
  })

  server.get('/:id/transcript', { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string }
    const entries = await meetingService.getTranscript(id)
    return { meetingId: id, entries }
  })

  server.post('/:id/commitments', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { agentId, commitment, commitmentType } = request.body as any
    const entry = await meetingService.logCommitment(id, agentId, commitment, commitmentType)
    return reply.status(201).send(entry)
  })

  // WebSocket — live meeting stream
  server.get('/:id/stream', { websocket: true }, (socket, request) => {
    const { id } = request.params as { id: string }
    socket.send(JSON.stringify({ type: 'connected', meetingId: id, timestamp: new Date().toISOString() }))

    socket.on('message', async (rawMsg: Buffer) => {
      try {
        const msg = JSON.parse(rawMsg.toString())

        if (msg.type === 'agent_turn') {
          // Record transcript entry
          await meetingService.addTranscriptEntry(id, msg.agentId, msg.message, msg.turnNumber)
          // Broadcast to all connected clients
          socket.send(JSON.stringify({ type: 'transcript_entry', ...msg }))
        }

        if (msg.type === 'commitment') {
          await meetingService.logCommitment(id, msg.agentId, msg.commitment, msg.commitmentType ?? 'general')
          socket.send(JSON.stringify({ type: 'commitment_logged', commitment: msg.commitment }))
        }
      } catch (err) {
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
      }
    })

    socket.on('close', () => {
      server.log.info({ meetingId: id }, 'Meeting stream disconnected')
    })
  })
}
