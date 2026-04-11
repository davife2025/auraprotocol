import { hashMessage, recoverMessageAddress } from 'viem'
import type {
  ACPEnvelope,
  ACPSession,
  HandshakeInitPayload,
  HandshakeAckPayload,
  HandshakeCompletePayload,
  AuthorityScope,
  SessionRules,
} from '../types/index.js'

const DEFAULT_RULES: SessionRules = {
  maxTurns: 50,
  turnTimeoutMs: 30_000,
  commitmentRecording: true,
  onchainSettlement: true,
}

export class ACPHandshake {
  /**
   * Build a handshake initiation envelope
   */
  static buildInit(params: {
    fromAgentId: string
    toAgentId: string
    walletAddress: `0x${string}`
    identityTokenId: string
    reputationScore: number
    authorityScope: AuthorityScope
  }): Omit<ACPEnvelope, 'signature'> {
    const nonce = crypto.randomUUID()
    const sessionId = crypto.randomUUID()

    const payload: HandshakeInitPayload = {
      type: 'handshake_init',
      senderWalletAddress: params.walletAddress,
      identityTokenId: params.identityTokenId,
      reputationScore: params.reputationScore,
      authorityScope: params.authorityScope,
      publicKey: params.walletAddress, // simplified — real impl uses ECDH key
      nonce,
    }

    return {
      version: '1.0',
      id: crypto.randomUUID(),
      type: 'handshake_init',
      fromAgentId: params.fromAgentId,
      toAgentId: params.toAgentId,
      sessionId,
      timestamp: new Date().toISOString(),
      payload,
    }
  }

  /**
   * Build a handshake acknowledgment
   */
  static buildAck(
    initEnvelope: ACPEnvelope,
    params: {
      fromAgentId: string
      walletAddress: `0x${string}`
      identityTokenId: string
      reputationScore: number
      authorityScope: AuthorityScope
    }
  ): Omit<ACPEnvelope, 'signature'> {
    const initPayload = initEnvelope.payload as HandshakeInitPayload

    const payload: HandshakeAckPayload = {
      type: 'handshake_ack',
      responderWalletAddress: params.walletAddress,
      identityTokenId: params.identityTokenId,
      reputationScore: params.reputationScore,
      authorityScope: params.authorityScope,
      nonceEcho: initPayload.nonce,
      sessionKey: crypto.randomUUID(),
    }

    return {
      version: '1.0',
      id: crypto.randomUUID(),
      type: 'handshake_ack',
      fromAgentId: params.fromAgentId,
      toAgentId: initEnvelope.fromAgentId,
      sessionId: initEnvelope.sessionId,
      timestamp: new Date().toISOString(),
      payload,
    }
  }

  /**
   * Build handshake complete — establishes the session
   */
  static buildComplete(
    sessionId: string,
    fromAgentId: string,
    toAgentId: string,
    rules: Partial<SessionRules> = {}
  ): Omit<ACPEnvelope, 'signature'> {
    const agreedRules = { ...DEFAULT_RULES, ...rules }

    const payload: HandshakeCompletePayload = {
      type: 'handshake_complete',
      sessionId,
      agreedRules,
    }

    return {
      version: '1.0',
      id: crypto.randomUUID(),
      type: 'handshake_complete',
      fromAgentId,
      toAgentId,
      sessionId,
      timestamp: new Date().toISOString(),
      payload,
    }
  }

  /**
   * Verify the signature on an ACP envelope
   */
  static async verifyEnvelope(envelope: ACPEnvelope): Promise<boolean> {
    try {
      const message = JSON.stringify({
        id: envelope.id,
        type: envelope.type,
        fromAgentId: envelope.fromAgentId,
        sessionId: envelope.sessionId,
        timestamp: envelope.timestamp,
      })

      const recovered = await recoverMessageAddress({
        message,
        signature: envelope.signature,
      })

      // TODO: session 4 — verify recovered address matches registered agent wallet
      return recovered.length > 0
    } catch {
      return false
    }
  }

  /**
   * Create a session from a completed handshake
   */
  static createSession(
    completeEnvelope: ACPEnvelope,
    agentAId: string,
    agentBId: string
  ): ACPSession {
    const payload = completeEnvelope.payload as HandshakeCompletePayload

    return {
      id: completeEnvelope.sessionId,
      agentAId,
      agentBId,
      status: 'active',
      rules: payload.agreedRules,
      startedAt: new Date(),
      commitments: [],
    }
  }
}
