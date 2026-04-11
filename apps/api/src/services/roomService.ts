import { prisma } from '../plugins/prisma.js'
import { agentService } from '@aura/agent-core'
import { Queue } from 'bullmq'
import pino from 'pino'

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })
const roomQueue = new Queue('room-tasks', { connection: { host: process.env.REDIS_HOST ?? 'localhost', port: Number(process.env.REDIS_PORT ?? 6379) } })

// Niche taxonomy — predefined rooms at launch
export const NICHE_ROOMS = [
  { name: 'Web3 Founders', niche: 'web3', description: 'Building on-chain products and protocols' },
  { name: 'AI Builders', niche: 'ai', description: 'Developing AI applications and infrastructure' },
  { name: 'Lagos Creatives', niche: 'creative', description: 'Nigerian and African creative ecosystem' },
  { name: 'DeFi Traders', niche: 'defi', description: 'Decentralised finance strategies and alpha' },
  { name: 'Product Designers', niche: 'design', description: 'UX, UI, and product thinking' },
  { name: 'Climate Tech', niche: 'climate', description: 'Sustainability and green technology' },
  { name: 'Music Industry', niche: 'music', description: 'Artists, producers, and music business' },
  { name: 'VC & Investors', niche: 'investing', description: 'Early-stage investing and deal flow' },
  { name: 'DevRel & Community', niche: 'devrel', description: 'Developer relations and community building' },
  { name: 'Monad Ecosystem', niche: 'monad', description: 'Projects and builders on Monad' },
]

export class RoomService {
  async seedDefaultRooms() {
    for (const room of NICHE_ROOMS) {
      await prisma.room.upsert({
        where: { id: room.niche }, // use niche as stable id for seeding
        update: {},
        create: { id: room.niche, name: room.name, niche: room.niche, description: room.description },
      })
    }
    logger.info('Default rooms seeded')
  }

  async getRooms(niche?: string, search?: string) {
    return prisma.room.findMany({
      where: {
        ...(niche ? { niche } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: { _count: { select: { members: true, presences: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createRoom(userId: string, data: { name: string; niche: string; description?: string; isPremium?: boolean; stakeRequired?: string }) {
    return prisma.room.create({ data: { ...data, isPremium: data.isPremium ?? false } })
  }

  async joinRoom(roomId: string, userId: string, agentId: string) {
    await prisma.roomMember.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: {},
      create: { roomId, userId },
    })

    await prisma.roomPresence.create({ data: { roomId, agentId } })

    await roomQueue.add('scan_room', {
      type: 'scan_room',
      roomId,
      agentId,
      payload: {},
    })

    logger.info({ roomId, agentId }, 'Agent joined room')
    return { roomId, agentId, joined: true }
  }

  async leaveRoom(roomId: string, agentId: string) {
    await prisma.roomPresence.updateMany({
      where: { roomId, agentId, leftAt: null },
      data: { leftAt: new Date() },
    })
  }

  async getAgentsInRoom(roomId: string) {
    return prisma.roomPresence.findMany({
      where: { roomId, leftAt: null },
      include: { agent: { select: { id: true, name: true, reputationScore: true, communicationStyle: true } } },
    })
  }

  async computeResonance(fromAgentId: string, toAgentId: string, roomId: string): Promise<{
    alignmentScore: number
    isMutual: boolean
    connectionId?: string
  }> {
    const [fromAgent, toAgent] = await Promise.all([
      prisma.agent.findUniqueOrThrow({ where: { id: fromAgentId } }),
      prisma.agent.findUniqueOrThrow({ where: { id: toAgentId } }),
    ])

    const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } })

    // Get active instances for from-agent
    const instances = agentService.getActiveInstances(fromAgentId)
    let alignmentScore = 50 // default

    if (instances[0]) {
      alignmentScore = await agentService.computeResonanceScore(instances[0].instanceId, {
        niche: room.niche,
        interests: [room.niche, toAgent.communicationStyle],
        reputationScore: toAgent.reputationScore,
      })
    }

    // Check if toAgent has already resonated with fromAgent (mutual)
    const existingConnection = await prisma.agentConnection.findFirst({
      where: {
        OR: [
          { initiatorId: toAgentId, receiverId: fromAgentId },
          { initiatorId: fromAgentId, receiverId: toAgentId },
        ],
      },
    })

    if (existingConnection && alignmentScore >= 70) {
      // Upgrade to active connection
      const connection = await prisma.agentConnection.update({
        where: { id: existingConnection.id },
        data: { status: 'ACTIVE', alignmentScore },
      })
      return { alignmentScore, isMutual: true, connectionId: connection.id }
    }

    // Create pending connection
    if (alignmentScore >= 60) {
      const connection = await prisma.agentConnection.create({
        data: {
          initiatorId: fromAgentId,
          receiverId: toAgentId,
          roomId,
          status: 'PENDING',
          alignmentScore,
        },
      })
      return { alignmentScore, isMutual: false, connectionId: connection.id }
    }

    return { alignmentScore, isMutual: false }
  }

  async sendAgentChatMessage(connectionId: string, fromAgentId: string, message: string) {
    const connection = await prisma.agentConnection.findUniqueOrThrow({
      where: { id: connectionId, status: 'ACTIVE' },
    })

    const lastMsg = await prisma.connectionChat.findFirst({
      where: { connectionId },
      orderBy: { turnNumber: 'desc' },
    })
    const turnNumber = (lastMsg?.turnNumber ?? 0) + 1

    const chatEntry = await prisma.connectionChat.create({
      data: { connectionId, fromAgentId, message, turnNumber },
    })

    // Queue agent-side response from the other agent
    const responderId = fromAgentId === connection.initiatorId
      ? connection.receiverId
      : connection.initiatorId

    await roomQueue.add('run_agent_chat_turn', {
      type: 'run_agent_chat_turn',
      roomId: connection.roomId ?? '',
      agentId: responderId,
      payload: { connectionId, inboundMessage: message, turnNumber },
    })

    return chatEntry
  }

  async getChatHistory(connectionId: string) {
    return prisma.connectionChat.findMany({
      where: { connectionId },
      orderBy: { turnNumber: 'asc' },
    })
  }

  async getConnectionsForUser(userId: string) {
    const agents = await prisma.agent.findMany({ where: { userId }, select: { id: true } })
    const agentIds = agents.map(a => a.id)

    return prisma.agentConnection.findMany({
      where: {
        OR: [{ initiatorId: { in: agentIds } }, { receiverId: { in: agentIds } }],
        status: 'ACTIVE',
      },
      include: {
        initiator: { select: { name: true, reputationScore: true } },
        receiver: { select: { name: true, reputationScore: true } },
        _count: { select: { chatMessages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }
}

export const roomService = new RoomService()