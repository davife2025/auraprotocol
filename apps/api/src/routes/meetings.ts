import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { meetingService } from '../services/meetingService.js'

const CreateMeetingSchema = z.object({
  title:       z.string().min(1).max(100),
  agenda:      z.string().max(2000).optional(),
  mode:        z.enum(['FULL_AGENT', 'HYBRID', 'OBSERVER']),
  scheduledAt: z.string().datetime(),
  invitees:    z.array(z.object({ auraId: z.string(), role: z.string() })),
  rules: z.object({
    agentsCanMakeBindingCommitments: z.boolean().default(false),
    recordOnchain:                   z.boolean().default(true),
  }),
})

export async function meetingRoutes(server: FastifyInstance) {
  server.get('/', { preHandler: [server.authenticate] }, async (request) => {
    const { userId } = request.user as { userId: string }

    const { data: agentIds } = await server.supabase
      .from('agents')
      .select('id')
      .eq('user_id', userId)

    const ids = (agentIds ?? []).map((a: { id: string }) => a.id)

    const { data: participantRows } = await server.supabase
      .from('meeting_participants')
      .select('meeting_id')
      .in('agent_id', ids)

    const meetingIds = [...new Set((participantRows ?? []).map((r: { meeting_id: string }) => r.meeting_id))]

    const { data: meetings, error } = await server.supabase
      .from('meetings')
      .select('*, meeting_participants(count), meeting_commitments(count), transcript_entries(count)')
      .in('id', meetingIds)
      .order('scheduled_at', { ascending: false })

   if (error) throw new Error(error.message)
    return { meetings }
  })

  server.post('/', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const body    = CreateMeetingSchema.parse(request.body)
    const meeting = await meetingService.createMeeting(userId, body)
    return reply.status(201).send({ meeting })
  })

  server.get('/:id', { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string }
    const { data, error } = await server.supabase
      .from('meetings')
      .select(`
        *,
        meeting_participants(*, agents(id, name, reputation_score)),
        meeting_commitments(*),
        transcript_entries(* order by turn_number asc)
      `)
      .eq('id', id)
      .single()

    if (error) throw new Error(error.message)
    return data
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
    const { id }                                   = request.params as { id: string }
    const { agentId, commitment, commitmentType }  = request.body as any
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
          await meetingService.addTranscriptEntry(id, msg.agentId, msg.message, msg.turnNumber)
          socket.send(JSON.stringify({ type: 'transcript_entry', ...msg }))
        }

        if (msg.type === 'commitment') {
          await meetingService.logCommitment(id, msg.agentId, msg.commitment, msg.commitmentType ?? 'general')
          socket.send(JSON.stringify({ type: 'commitment_logged', commitment: msg.commitment }))
        }
      } catch {
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
      }
    })

    socket.on('close', () => {
      server.log.info({ meetingId: id }, 'Meeting stream disconnected')
    })
  })
}