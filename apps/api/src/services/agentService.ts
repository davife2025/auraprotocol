import { agentService } from '@aura/agent-core'
import { supabase } from '../plugins/supabase.js'
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
          identity:       process.env.AURA_IDENTITY_CONTRACT    as `0x${string}`,
          permissions:    process.env.AURA_PERMISSIONS_CONTRACT as `0x${string}`,
          registry:       process.env.AURA_REGISTRY_CONTRACT    as `0x${string}`,
          reputation:     process.env.AURA_REPUTATION_CONTRACT  as `0x${string}`,
          meetingFactory: process.env.AURA_MEETING_FACTORY_CONTRACT as `0x${string}`,
          token:          process.env.AURA_TOKEN_CONTRACT        as `0x${string}`,
        }
      )
    }
  }

  async createAgent(userId: string, data: {
    name: string
    personalityProfile: {
      communicationStyle: string
      riskTolerance: string
      timezone?: string
      language?: string
      customInstructions?: string
    }
    permissions: unknown
  }) {
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        user_id:             userId,
        name:                data.name,
        communication_style: data.personalityProfile.communicationStyle,
        risk_tolerance:      data.personalityProfile.riskTolerance,
        timezone:            data.personalityProfile.timezone ?? 'UTC',
        language:            data.personalityProfile.language ?? 'en',
        custom_instructions: data.personalityProfile.customInstructions,
        permissions:         data.permissions,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    await agentQueue.add('spawn_instance', {
      type:    'mint_identity',
      agentId: agent.id,
      userId,
      payload: { permissions: data.permissions },
    })

    logger.info({ agentId: agent.id }, 'Agent created, identity mint queued')
    return agent
  }

  async getAgentsForUser(userId: string) {
    const { data, error } = await supabase
      .from('agents')
      .select('*, agent_memories(count), meeting_participants(count)')
      .eq('user_id', userId)

    if (error) throw new Error(error.message)
    return data
  }

  async spawnAgentInstance(agentId: string): Promise<string> {
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single()

    if (error || !agent) throw new Error(`Agent ${agentId} not found`)

    const profile: AgentProfile = {
      id:                     agent.id,
      userId:                 agent.user_id,
      name:                   agent.name,
      walletAddress:          agent.wallet_address ?? undefined,
      onchainIdentityTokenId: agent.identity_token_id ?? undefined,
      personalityProfile: {
        communicationStyle: agent.communication_style as any,
        riskTolerance:      agent.risk_tolerance as any,
        timezone:           agent.timezone,
        language:           agent.language,
        customInstructions: agent.custom_instructions ?? undefined,
      },
      permissions:     agent.permissions as any,
      reputationScore: agent.reputation_score,
      createdAt:       new Date(agent.created_at),
      updatedAt:       new Date(agent.updated_at),
    }

    const instance = agentService.spawnInstance(profile)

    await supabase
      .from('agents')
      .update({ status: 'ACTIVE' })
      .eq('id', agentId)

    logger.info({ agentId, instanceId: instance.instanceId }, 'Agent instance spawned')
    return instance.instanceId
  }

  async pauseAgent(agentId: string) {
    const instances = agentService.getActiveInstances(agentId)
    instances.forEach(i => agentService.terminateInstance(i.instanceId))

    await supabase
      .from('agents')
      .update({ status: 'PAUSED' })
      .eq('id', agentId)

    return { agentId, status: 'paused', instancesTerminated: instances.length }
  }

  async getOnchainReputation(walletAddress: string) {
    if (!this.identityClient) return null
    return this.identityClient.getReputation(walletAddress as `0x${string}`)
  }
}

export const agentApiService = new AgentApiService()