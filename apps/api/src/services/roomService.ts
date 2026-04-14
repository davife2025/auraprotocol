import { supabase } from '../plugins/supabase.js'
import { agentService } from '@aura/agent-core'
import { Queue } from 'bullmq'
import pino from 'pino'

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })
const roomQueue = new Queue('room-tasks', {
  connection: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
})

export const NICHE_ROOMS = [
  { name: 'Web3 Founders',      niche: 'web3',      description: 'Building on-chain products and protocols' },
  { name: 'AI Builders',        niche: 'ai',         description: 'Developing AI applications and infrastructure' },
  { name: 'Lagos Creatives',    niche: 'creative',   description: 'Nigerian and African creative ecosystem' },
  { name: 'DeFi Traders',       niche: 'defi',       description: 'Decentralised finance strategies and alpha' },
  { name: 'Product Designers',  niche: 'design',     description: 'UX, UI, and product thinking' },
  { name: 'Climate Tech',       niche: 'climate',    description: 'Sustainability and green technology' },
  { name: 'Music Industry',     niche: 'music',      description: 'Artists, producers, and music business' },
  { name: 'VC & Investors',     niche: 'investing',  description: 'Early-stage investing and deal flow' },
  { name: 'DevRel & Community', niche: 'devrel',     description: 'Developer relations and community building' },
  { name: 'Monad Ecosystem',    niche: 'monad',      description: 'Projects and builders on Monad' },
]

export class RoomService {
  async seedDefaultRooms() {
    for (const room of NICHE_ROOMS) {
      await supabase.from('rooms').upsert(
        { id: room.niche, name: room.name, niche: room.niche, description: room.description },
        { onConflict: 'id', ignoreDuplicates: true }
      )
    }
    logger.info('Default rooms seeded')
  }

  async getRooms(niche?: string, search?: string) {
    let query = supabase
      .from('rooms')
      .select('*, room_members(count), room_presences(count)')
      .order('created_at', { ascending: false })

    if (niche)  query = query.eq('niche', niche)
    if (search) query = query.ilike('name', `%${search}%`)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data
  }

  async createRoom(_userId: string, data: {
    name: string
    niche: string
    description?: string
    isPremium?: boolean
    stakeRequired?: string
  }) {
    const { data: room, error } = await supabase
      .from('rooms')
      .insert({
        name:           data.name,
        niche:          data.niche,
        description:    data.description,
        is_premium:     data.isPremium ?? false,
        stake_required: data.stakeRequired,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return room
  }

  async joinRoom(roomId: string, userId: string, agentId: string) {
    await supabase.from('room_members').upsert(
      { room_id: roomId, user_id: userId },
      { onConflict: 'room_id,user_id', ignoreDuplicates: true }
    )

    await supabase.from('room_presences').insert({ room_id: roomId, agent_id: agentId })

    await roomQueue.add('scan_room', { type: 'scan_room', roomId, agentId, payload: {} })

    logger.info({ roomId, agentId }, 'Agent joined room')
    return { roomId, agentId, joined: true }
  }

  async leaveRoom(roomId: string, agentId: string) {
    await supabase
      .from('room_presences')
      .update({ left_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('agent_id', agentId)
      .is('left_at', null)
  }

  async getAgentsInRoom(roomId: string) {
    const { data, error } = await supabase
      .from('room_presences')
      .select('*, agents(id, name, reputation_score, communication_style)')
      .eq('room_id', roomId)
      .is('left_at', null)

    if (error) throw new Error(error.message)
    return data
  }

  async computeResonance(fromAgentId: string, toAgentId: string, roomId: string): Promise<{
    alignmentScore: number
    isMutual: boolean
    connectionId?: string
  }> {
    const [{ data: _fromAgent }, { data: toAgent }] = await Promise.all([
      supabase.from('agents').select('*').eq('id', fromAgentId).single(),
      supabase.from('agents').select('*').eq('id', toAgentId).single(),
    ])

    const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single()

    if (!toAgent || !room) return { alignmentScore: 0, isMutual: false }

    const instances = agentService.getActiveInstances(fromAgentId)
    let alignmentScore = 50

    if (instances[0]) {
      alignmentScore = await agentService.computeResonanceScore(instances[0].instanceId, {
        niche:           room.niche,
        interests:       [room.niche, toAgent.communication_style],
        reputationScore: toAgent.reputation_score,
      })
    }

    const { data: existingConnection } = await supabase
      .from('agent_connections')
      .select('*')
      .or(`and(initiator_id.eq.${toAgentId},receiver_id.eq.${fromAgentId}),and(initiator_id.eq.${fromAgentId},receiver_id.eq.${toAgentId})`)
      .maybeSingle()

    if (existingConnection && alignmentScore >= 70) {
      const { data: connection } = await supabase
        .from('agent_connections')
        .update({ status: 'ACTIVE', alignment_score: alignmentScore })
        .eq('id', existingConnection.id)
        .select()
        .single()

      return { alignmentScore, isMutual: true, connectionId: connection?.id }
    }

    if (alignmentScore >= 60) {
      const { data: connection } = await supabase
        .from('agent_connections')
        .insert({
          initiator_id:    fromAgentId,
          receiver_id:     toAgentId,
          room_id:         roomId,
          status:          'PENDING',
          alignment_score: alignmentScore,
        })
        .select()
        .single()

      return { alignmentScore, isMutual: false, connectionId: connection?.id }
    }

    return { alignmentScore, isMutual: false }
  }

  async sendAgentChatMessage(connectionId: string, fromAgentId: string, message: string) {
    const { data: connection, error: connError } = await supabase
      .from('agent_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('status', 'ACTIVE')
      .single()

    if (connError || !connection) throw new Error('Active connection not found')

    const { data: lastMsg } = await supabase
      .from('connection_chats')
      .select('turn_number')
      .eq('connection_id', connectionId)
      .order('turn_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    const turnNumber = (lastMsg?.turn_number ?? 0) + 1

    const { data: chatEntry, error } = await supabase
      .from('connection_chats')
      .insert({ connection_id: connectionId, from_agent_id: fromAgentId, message, turn_number: turnNumber })
      .select()
      .single()

    if (error) throw new Error(error.message)

    const responderId = fromAgentId === connection.initiator_id
      ? connection.receiver_id
      : connection.initiator_id

    await roomQueue.add('run_agent_chat_turn', {
      type:    'run_agent_chat_turn',
      roomId:  connection.room_id ?? '',
      agentId: responderId,
      payload: { connectionId, inboundMessage: message, turnNumber },
    })

    return chatEntry
  }

  async getChatHistory(connectionId: string) {
    const { data, error } = await supabase
      .from('connection_chats')
      .select('*')
      .eq('connection_id', connectionId)
      .order('turn_number')

    if (error) throw new Error(error.message)
    return data
  }

  async getConnectionsForUser(userId: string) {
    const { data: agents } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', userId)

    const agentIds = (agents ?? []).map((a: { id: string }) => a.id)

    const { data, error } = await supabase
      .from('agent_connections')
      .select(`
        *,
        initiator:agents!initiator_id(name, reputation_score),
        receiver:agents!receiver_id(name, reputation_score),
        connection_chats(count)
      `)
      .in('initiator_id', agentIds)
      .eq('status', 'ACTIVE')
      .order('updated_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data
  }
}

export const roomService = new RoomService()