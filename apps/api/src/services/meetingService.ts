import { prisma } from '../plugins/prisma.js'
import { agentService } from '@aura/agent-core'
import { MeetingClient } from '@aura/agent-identity'
import { Queue } from 'bullmq'
import { createHash } from 'crypto'
import pino from 'pino'

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })
const meetingQueue = new Queue('meeting-tasks', { connection: { host: process.env.REDIS_HOST ?? 'localhost', port: Number(process.env.REDIS_PORT ?? 6379) } })

export class MeetingService {
  private meetingClient?: MeetingClient

  constructor() {
    if (process.env.MONAD_RPC_URL && process.env.DEPLOYER_PRIVATE_KEY && process.env.AURA_MEETING_FACTORY_CONTRACT) {
      this.meetingClient = new MeetingClient(
        process.env.MONAD_RPC_URL,
        process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`,
        {
          identity: process.env.AURA_IDENTITY_CONTRACT as `0x${string}`,
          permissions: process.env.AURA_PERMISSIONS_CONTRACT as `0x${string}`,
          registry: process.env.AURA_REGISTRY_CONTRACT as `0x${string}`,
          reputation: process.env.AURA_REPUTATION_CONTRACT as `0x${string}`,
          meetingFactory: process.env.AURA_MEETING_FACTORY_CONTRACT as `0x${string}`,
        }
      )
    }
  }

  async createMeeting(creatorUserId: string, data: {
    title: string
    agenda?: string
    mode: 'FULL_AGENT' | 'HYBRID' | 'OBSERVER'
    scheduledAt: string
    invitees: Array<{ auraId: string; role: string }>
    rules: { agentsCanMakeBindingCommitments: boolean; recordOnchain: boolean }
  }) {
    const meeting = await prisma.meeting.create({
      data: {
        title: data.title,
        agenda: data.agenda,
        mode: data.mode,
        scheduledAt: new Date(data.scheduledAt),
        status: 'SCHEDULED',
      },
    })

    // Add participants
    const agents = await prisma.agent.findMany({
      where: { userId: creatorUserId },
      take: 1,
    })

    if (agents[0]) {
      await prisma.meetingParticipant.create({
        data: { meetingId: meeting.id, agentId: agents[0].id, role: 'participant' },
      })
    }

    // Queue onchain room deployment if enabled
    if (data.rules.recordOnchain) {
      await meetingQueue.add('start_meeting', {
        type: 'deploy_room',
        meetingId: meeting.id,
        payload: { participants: agents.map(a => a.walletAddress).filter(Boolean) },
      })
    }

    logger.info({ meetingId: meeting.id }, 'Meeting created')
    return meeting
  }

  async startMeeting(meetingId: string) {
    const meeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'ACTIVE', startedAt: new Date() },
      include: { participants: { include: { agent: true } } },
    })

    // Spawn agent instances for each participant
    for (const p of meeting.participants) {
      await meetingQueue.add('process_turn', {
        type: 'join_meeting',
        meetingId,
        agentId: p.agentId,
        payload: { agenda: meeting.agenda },
      })
    }

    return meeting
  }

  async addTranscriptEntry(meetingId: string, agentId: string, message: string, turnNumber: number) {
    return prisma.transcriptEntry.create({
      data: { meetingId, agentId, message, turnNumber },
    })
  }

  async logCommitment(meetingId: string, agentId: string, commitment: string, commitmentType: string) {
    const entry = await prisma.meetingCommitment.create({
      data: { meetingId, agentId, commitment, commitmentType },
    })

    logger.info({ meetingId, agentId, commitment }, 'Commitment logged')
    return entry
  }

  async settleMeeting(meetingId: string) {
    const meeting = await prisma.meeting.findUniqueOrThrow({
      where: { id: meetingId },
      include: {
        participants: { include: { agent: true } },
        transcriptEntries: { orderBy: { turnNumber: 'asc' } },
        commitments: true,
      },
    })

    // Generate outcome hash
    const outcomeData = {
      meetingId,
      transcript: meeting.transcriptEntries.map(t => ({ agentId: t.agentId, message: t.message, timestamp: t.timestamp })),
      commitments: meeting.commitments.map(c => c.commitment),
      settledAt: new Date().toISOString(),
    }
    const outcomeHash = `0x${createHash('sha256').update(JSON.stringify(outcomeData)).digest('hex')}`

    // Write to Monad if client available
    let txHash: string | null = null
    if (this.meetingClient && meeting.participants.length > 0) {
      try {
        const wallets = meeting.participants
          .map(p => p.agent.walletAddress)
          .filter(Boolean) as `0x${string}`[]

        if (wallets.length >= 2) {
          txHash = await this.meetingClient.settleMeeting({
            meetingId,
            transcript: outcomeData.transcript,
            commitments: outcomeData.commitments,
            participants: wallets,
            scores: wallets.map(() => 85), // default score — refined in session 5
          })
        }
      } catch (err) {
        logger.error({ err }, 'Onchain settlement failed — continuing offchain')
      }
    }

    // Generate AI summary
    const instances = agentService.getActiveInstances(meeting.participants[0]?.agentId ?? '')
    let summary: string | null = null
    if (instances[0]) {
      try {
        summary = await agentService.summariseMeeting(
          instances[0].instanceId,
          outcomeData.transcript,
          outcomeData.commitments
        )
      } catch { /* non-critical */ }
    }

    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: 'SETTLED',
        endedAt: new Date(),
        settlementTxHash: txHash,
        outcomeHash,
        summary,
      },
    })

    logger.info({ meetingId, txHash }, 'Meeting settled')
    return updated
  }

  async getTranscript(meetingId: string) {
    return prisma.transcriptEntry.findMany({
      where: { meetingId },
      orderBy: { turnNumber: 'asc' },
    })
  }
}

export const meetingService = new MeetingService()
