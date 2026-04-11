import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const CreateMeetingSchema = z.object({
  title: z.string().min(1).max(100),
  agenda: z.string().max(1000),
  mode: z.enum(['full_agent', 'hybrid', 'observer']),
  scheduledAt: z.string().datetime(),
  invitees: z.array(z.object({
    auraId: z.string(),
    role: z.enum(['participant', 'observer']),
  })),
  rules: z.object({
    agentsCanAttendSolo: z.boolean().default(true),
    agentsCanMakeBindingCommitments: z.boolean().default(false),
    recordOnchain: z.boolean().default(true),
    quorum: z.number().min(1).optional(),
  }),
})

export async function meetingRoutes(server: FastifyInstance) {
  // GET /meetings — list all meetings for user
  server.get('/', {
    preHandler: [server.authenticate],
  }, async (request) => {
    const userId = (request.user as any).userId
    // TODO: session 5
    return { meetings: [], userId }
  })

  // POST /meetings — create meeting room (deploys smart contract instance)
  server.post('/', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    const body = CreateMeetingSchema.parse(request.body)
    // TODO: session 5 — deploy MeetingRoom contract on Monad, invite agents
    return reply.status(201).send({
      message: 'Meeting room deploying on Monad',
      contractAddress: null, // filled after deployment
      body,
    })
  })

  // GET /meetings/:id — get meeting details + live transcript
  server.get('/:id', {
    preHandler: [server.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string }
    // TODO: session 5
    return { id, status: 'not_implemented_yet' }
  })

  // GET /meetings/:id/transcript — get live or recorded transcript
  server.get('/:id/transcript', {
    preHandler: [server.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string }
    return { id, transcript: [] }
  })

  // POST /meetings/:id/settle — settle meeting outcome onchain
  server.post('/:id/settle', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as {
      transcriptEntries?: Array<{ agentId: string; message: string; timestamp: string }>
      commitments?: string[]
      participantWallets?: string[]
      participantScores?: number[]
    }
    const { isOnchainConfigured, getMeetingClient } = await import('../services/onchain.js')
    if (!isOnchainConfigured()) {
      return reply.status(200).send({ id, settled: false, txHash: null, onchain: false })
    }
    try {
      const txHash = await getMeetingClient().settleMeeting({
        meetingId: id,
        transcriptEntries: body.transcriptEntries ?? [],
        commitments: body.commitments ?? [],
        participantWallets: (body.participantWallets ?? []) as `0x${string}`[],
        participantScores: body.participantScores ?? [],
      })
      return reply.status(200).send({ id, settled: true, txHash, onchain: true })
    } catch (err: any) {
      server.log.error({ err }, 'Meeting settlement failed')
      return reply.status(500).send({ error: 'Settlement failed', message: err.message })
    }
  })

  // WebSocket — live meeting stream
  server.get('/:id/stream', { websocket: true }, (socket, request) => {
    const { id } = request.params as { id: string }
    socket.send(JSON.stringify({ type: 'connected', meetingId: id }))

    socket.on('message', (message: Buffer) => {
      // TODO: session 5 — relay agent messages, broadcast to all participants
      const data = JSON.parse(message.toString())
      socket.send(JSON.stringify({ type: 'ack', ...data }))
    })

    socket.on('close', () => {
      server.log.info(`Meeting stream closed: ${id}`)
    })
  })
}
