import { agentService } from '@aura/agent-core'
import { prisma } from '../plugins/prisma.js'
import { IdentityClient } from '@aura/agent-identity'
import type { AgentProfile } from '@aura/agent-core'
import { Queue } from 'bullmq'
import pino from 'pino'

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })

const redisConn = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
}

const agentQueue = new Queue('agent-tasks', { connection: redisConn })

export class AgentApiService {
  private identityClient?: IdentityClient

  constructor() {
    if (
      process.env.MONAD_RPC_URL &&
      process.env.DEPLOYER_PRIVATE_KEY &&
      process.env.AURA_IDENTITY_CONTRACT
    ) {
      this.identityClient = new IdentityClient(
        process.env.MONAD_RPC_URL,
        process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`,
        {
          identity: process.env.AURA_IDENTITY_CONTRACT as `0x${string}`,
          permissions: process.env.AURA_PERMISSIONS_CONTRACT as `0x${string}`,
          registry: process.env.AURA_REGISTRY_CONTRACT as `0x${string}`,
          reputation: process.env.AURA_REPUTATION_CONTRACT as `0x${string}`,
          meetingFactory: process.env.AURA_MEETING_FACTORY_CONTRACT as `0x${string}`,
          token: process.env.AURA_TOKEN_CONTRACT as `0x${string}`,
        }
      )
    }
  }

  async createAgent(userId: string, data: {
    name: string
    personalityProfile: any
    permissions: any
  }) {
    // 1. Create DB record
    const agent = await prisma.agent.create({
      data: {
        userId,
        name: data.name,
        communicationStyle: data.personalityProfile.communicationStyle,
        riskTolerance: data.personalityProfile.riskTolerance,
        timezone: data.personalityProfile.timezone ?? 'UTC',
        language: data.personalityProfile.language ?? 'en',
        customInstructions: data.personalityProfile.customInstructions,
        permissions: data.permissions,
      },
    })

    // 2. Queue identity minting on Monad
    await agentQueue.add('spawn_instance', {
      type: 'mint_identity',
      agentId: agent.id,
      userId,
      payload: { permissions: data.permissions },
    })

    logger.info({ agentId: agent.id }, 'Agent created, identity mint queued')
    return agent
  }

  async getAgentsForUser(userId: string) {
    return prisma.agent.findMany({
      where: { userId },
      include: { _count: { select: { memories: true, meetingParticipants: true } } },
    })
  }

  async spawnAgentInstance(agentId: string): Promise<string> {
    const agent = await prisma.agent.findUniqueOrThrow({ where: { id: agentId } })

    const profile: AgentProfile = {
      id: agent.id,
      userId: agent.userId,
      name: agent.name,
      walletAddress: agent.walletAddress ?? undefined,
      onchainIdentityTokenId: agent.identityTokenId ?? undefined,
      personalityProfile: {
        communicationStyle: agent.communicationStyle as any,
        riskTolerance: agent.riskTolerance as any,
        timezone: agent.timezone,
        language: agent.language,
        customInstructions: agent.customInstructions ?? undefined,
      },
      permissions: agent.permissions as any,
      reputationScore: agent.reputationScore,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    }

    const instance = agentService.spawnInstance(profile)
    await prisma.agent.update({ where: { id: agentId }, data: { status: 'ACTIVE' } })
    logger.info({ agentId, instanceId: instance.instanceId }, 'Agent instance spawned')
    return instance.instanceId
  }

  async pauseAgent(agentId: string) {
    // Terminate all active instances
    const instances = agentService.getActiveInstances(agentId)
    instances.forEach(i => agentService.terminateInstance(i.instanceId))
    await prisma.agent.update({ where: { id: agentId }, data: { status: 'PAUSED' } })
    return { agentId, status: 'paused', instancesTerminated: instances.length }
  }

  async getOnchainReputation(walletAddress: string) {
    if (!this.identityClient) return null
    return this.identityClient.getReputation(walletAddress as `0x${string}`)
  }
}

export const agentApiService = new AgentApiService()
