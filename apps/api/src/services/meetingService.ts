import { supabase } from '../plugins/supabase.js'
import { agentService } from '@aura/agent-core'
import { MeetingClient } from '@aura/agent-identity'
import { Queue } from 'bullmq'
import { createHash } from 'crypto'
import pino from 'pino'

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })
const meetingQueue = new Queue('meeting-tasks', {
  connection: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
})

export class MeetingService {
  private meetingClient?: MeetingClient

  constructor() {
    if (process.env.MONAD_RPC_URL && process.env.DEPLOYER_PRIVATE_KEY && process.env.AURA_MEETING_FACTORY_CONTRACT) {
      this.meetingClient = new MeetingClient(
        process.env.MONAD_RPC_URL,
        process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`,
        {
          identity:       process.env.AURA_IDENTITY_CONTRACT as `0x${string}`,
          permissions:    process.env.AURA_PERMISSIONS_CONTRACT as `0x${string}`,
          registry:       process.env.AURA_REGISTRY_CONTRACT as `0x${string}`,
          reputation:     process.env.AURA_REPUTATION_CONTRACT as `0x${string}`,
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
    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        title:        data.title,
        agenda:       data.agenda,
        mode:         data.mode,
        scheduled_at: data.scheduledAt,
        status:       'SCHEDULED',
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    const { data: agents } = await supabase
      .from('agents')
      .select('id, wallet_address')
      .eq('user_id', creatorUserId)
      .limit(1)

    if (agents?.[0]) {
      await supabase.from('meeting_participants').insert({
        meeting_id: meeting.id,
        agent_id:   agents[0].id,
        role:       'participant',
      })
    }

    if (data.rules.recordOnchain) {
      await meetingQueue.add('start_meeting', {
        type:      'deploy_room',
        meetingId: meeting.id,
        payload:   {
          participants: agents
            ?.map((a: { wallet_address: string | null }) => a.wallet_address)
            .filter(Boolean) ?? [],
        },
      })
    }

    logger.info({ meetingId: meeting.id }, 'Meeting created')
    return meeting
  }

  async startMeeting(meetingId: string) {
    const { data: meeting, error } = await supabase
      .from('meetings')
      .update({ status: 'ACTIVE', started_at: new Date().toISOString() })
      .eq('id', meetingId)
      .select('*, meeting_participants(agent_id, agents(*))')
      .single()

    if (error) throw new Error(error.message)

    for (const p of (meeting.meeting_participants ?? [])) {
      await meetingQueue.add('process_turn', {
        type:      'join_meeting',
        meetingId,
        agentId:   p.agent_id,
        payload:   { agenda: meeting.agenda },
      })
    }

    return meeting
  }

  async addTranscriptEntry(meetingId: string, agentId: string, message: string, turnNumber: number) {
    const { data, error } = await supabase
      .from('transcript_entries')
      .insert({ meeting_id: meetingId, agent_id: agentId, message, turn_number: turnNumber })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async logCommitment(meetingId: string, agentId: string, commitment: string, commitmentType: string) {
    const { data, error } = await supabase
      .from('meeting_commitments')
      .insert({
        meeting_id:      meetingId,
        agent_id:        agentId,
        commitment,
        commitment_type: commitmentType,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    logger.info({ meetingId, agentId, commitment }, 'Commitment logged')
    return data
  }

  async settleMeeting(meetingId: string) {
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select(`
        *,
        meeting_participants(agent_id, agents(wallet_address)),
        transcript_entries(agent_id, message, timestamp, turn_number),
        meeting_commitments(commitment)
      `)
      .eq('id', meetingId)
      .single()

    if (error) throw new Error(error.message)

    const transcript = (meeting.transcript_entries ?? [])
      .sort((a: { turn_number: number }, b: { turn_number: number }) => a.turn_number - b.turn_number)
      .map((t: { agent_id: string; message: string; timestamp: string }) => ({
        agentId:   t.agent_id,
        message:   t.message,
        timestamp: t.timestamp,
      }))

    const commitments = (meeting.meeting_commitments ?? [])
      .map((c: { commitment: string }) => c.commitment)

    const outcomeData   = { meetingId, transcript, commitments, settledAt: new Date().toISOString() }
    const outcomeHash   = `0x${createHash('sha256').update(JSON.stringify(outcomeData)).digest('hex')}`

    let txHash: string | null = null
    if (this.meetingClient && meeting.meeting_participants?.length > 0) {
      try {
        const wallets = (meeting.meeting_participants ?? [])
          .map((p: { agents: { wallet_address: string | null } }) => p.agents?.wallet_address)
          .filter(Boolean) as `0x${string}`[]

        if (wallets.length >= 2) {
          txHash = await this.meetingClient.settleMeeting({
            meetingId,
            transcript,
            commitments,
            participants: wallets,
            scores:       wallets.map(() => 85),
          })
        }
      } catch (err) {
        logger.error({ err }, 'Onchain settlement failed — continuing offchain')
      }
    }

    const instances = agentService.getActiveInstances(meeting.meeting_participants?.[0]?.agent_id ?? '')
    let summary: string | null = null
    if (instances[0]) {
      try {
        summary = await agentService.summariseMeeting(instances[0].instanceId, transcript, commitments)
      } catch { /* non-critical */ }
    }

    const { data: updated, error: updateError } = await supabase
      .from('meetings')
      .update({
        status:             'SETTLED',
        ended_at:           new Date().toISOString(),
        settlement_tx_hash: txHash,
        outcome_hash:       outcomeHash,
        summary,
      })
      .eq('id', meetingId)
      .select()
      .single()

    if (updateError) throw new Error(updateError.message)
    logger.info({ meetingId, txHash }, 'Meeting settled')
    return updated
  }

  async getTranscript(meetingId: string) {
    const { data, error } = await supabase
      .from('transcript_entries')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('turn_number')

    if (error) throw new Error(error.message)
    return data
  }
}

export const meetingService = new MeetingService()