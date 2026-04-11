export type ACPMessageType =
  | 'handshake_init'
  | 'handshake_ack'
  | 'handshake_complete'
  | 'meeting_turn'
  | 'meeting_commitment'
  | 'meeting_end'
  | 'room_enter'
  | 'room_resonate'
  | 'room_chat'
  | 'escalate'
  | 'error'

export interface ACPEnvelope {
  version: '1.0'
  id: string
  type: ACPMessageType
  fromAgentId: string
  toAgentId: string | 'broadcast'
  sessionId: string
  timestamp: string
  signature: `0x${string}`
  payload: ACPPayload
}

export type ACPPayload =
  | HandshakeInitPayload
  | HandshakeAckPayload
  | HandshakeCompletePayload
  | MeetingTurnPayload
  | MeetingCommitmentPayload
  | RoomResonatePayload
  | RoomChatPayload
  | EscalatePayload

export interface HandshakeInitPayload {
  type: 'handshake_init'
  senderWalletAddress: `0x${string}`
  identityTokenId: string
  reputationScore: number
  authorityScope: AuthorityScope
  publicKey: string
  nonce: string
}

export interface HandshakeAckPayload {
  type: 'handshake_ack'
  responderWalletAddress: `0x${string}`
  identityTokenId: string
  reputationScore: number
  authorityScope: AuthorityScope
  nonceEcho: string
  sessionKey: string
}

export interface HandshakeCompletePayload {
  type: 'handshake_complete'
  sessionId: string
  agreedRules: SessionRules
}

export interface MeetingTurnPayload {
  type: 'meeting_turn'
  message: string
  turnNumber: number
  isThinking?: boolean
}

export interface MeetingCommitmentPayload {
  type: 'meeting_commitment'
  commitment: string
  commitmentType: string
  requiresCounterpartyAck: boolean
}

export interface RoomResonatePayload {
  type: 'room_resonate'
  roomId: string
  alignmentScore: number
  connectionProposal?: string
}

export interface RoomChatPayload {
  type: 'room_chat'
  connectionId: string
  message: string
  turnNumber: number
}

export interface EscalatePayload {
  type: 'escalate'
  reason: string
  context: string
  urgency: 'low' | 'medium' | 'high'
}

export interface AuthorityScope {
  canCommitTo: string[]
  cannotCommitTo: string[]
  maxCommitmentValueUsd?: number
  expiresAt: string
}

export interface SessionRules {
  maxTurns: number
  turnTimeoutMs: number
  commitmentRecording: boolean
  onchainSettlement: boolean
}

export interface ACPSession {
  id: string
  agentAId: string
  agentBId: string
  status: 'handshaking' | 'active' | 'ended' | 'error'
  rules: SessionRules
  startedAt: Date
  endedAt?: Date
  commitments: string[]
}
