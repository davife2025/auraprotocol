import type {
  ACPEnvelope,
  ACPSession,
  MeetingTurnPayload,
  MeetingCommitmentPayload,
  RoomResonatePayload,
  RoomChatPayload,
  EscalatePayload,
} from '../types/index.js'

export class ACPMessageBuilder {
  constructor(
    private fromAgentId: string,
    private session: ACPSession
  ) {}

  /**
   * Build a meeting conversation turn
   */
  meetingTurn(
    message: string,
    turnNumber: number,
    toAgentId: string
  ): Omit<ACPEnvelope, 'signature'> {
    const payload: MeetingTurnPayload = {
      type: 'meeting_turn',
      message,
      turnNumber,
    }

    return this.buildEnvelope('meeting_turn', toAgentId, payload)
  }

  /**
   * Record a commitment made during a meeting
   */
  meetingCommitment(
    commitment: string,
    commitmentType: string,
    toAgentId: string,
    requiresAck = true
  ): Omit<ACPEnvelope, 'signature'> {
    const payload: MeetingCommitmentPayload = {
      type: 'meeting_commitment',
      commitment,
      commitmentType,
      requiresCounterpartyAck: requiresAck,
    }

    return this.buildEnvelope('meeting_commitment', toAgentId, payload)
  }

  /**
   * Send a resonance signal in a room
   */
  resonate(
    roomId: string,
    alignmentScore: number,
    toAgentId: string,
    connectionProposal?: string
  ): Omit<ACPEnvelope, 'signature'> {
    const payload: RoomResonatePayload = {
      type: 'room_resonate',
      roomId,
      alignmentScore,
      connectionProposal,
    }

    return this.buildEnvelope('room_resonate', toAgentId, payload)
  }

  /**
   * Send a chat message to a connected agent
   */
  chat(
    connectionId: string,
    message: string,
    turnNumber: number,
    toAgentId: string
  ): Omit<ACPEnvelope, 'signature'> {
    const payload: RoomChatPayload = {
      type: 'room_chat',
      connectionId,
      message,
      turnNumber,
    }

    return this.buildEnvelope('room_chat', toAgentId, payload)
  }

  /**
   * Escalate to human — requires immediate attention
   */
  escalate(
    reason: string,
    context: string,
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): Omit<ACPEnvelope, 'signature'> {
    const payload: EscalatePayload = {
      type: 'escalate',
      reason,
      context,
      urgency,
    }

    return this.buildEnvelope('escalate', 'broadcast', payload)
  }

  private buildEnvelope(
    type: ACPEnvelope['type'],
    toAgentId: string,
    payload: ACPEnvelope['payload']
  ): Omit<ACPEnvelope, 'signature'> {
    return {
      version: '1.0',
      id: crypto.randomUUID(),
      type,
      fromAgentId: this.fromAgentId,
      toAgentId,
      sessionId: this.session.id,
      timestamp: new Date().toISOString(),
      payload,
    }
  }
}
