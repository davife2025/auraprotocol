import * as StellarSdk from '@stellar/stellar-sdk'
import { createHash } from 'crypto'
import type { StellarConfig, MeetingRecord } from '../types/index.js'

const { SorobanRpc, Contract, TransactionBuilder, BASE_FEE, nativeToScVal, scValToNative, Keypair } = StellarSdk

export class StellarMeetingClient {
  private server: InstanceType<typeof SorobanRpc.Server>
  private keypair: InstanceType<typeof Keypair>
  private config: StellarConfig

  constructor(secretKey: string, config: StellarConfig) {
    this.server = new SorobanRpc.Server(config.rpcUrl, { allowHttp: config.network === 'testnet' })
    this.keypair = Keypair.fromSecret(secretKey)
    this.config = config
  }

  async createMeeting(meetingId: string, participants: string[]): Promise<string> {
    const contract = new Contract(this.config.contracts.meetingFactory)
    const account = await this.server.getAccount(this.keypair.publicKey())

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(contract.call(
        'create_meeting',
        nativeToScVal(this.keypair.publicKey(), { type: 'address' }),
        nativeToScVal(meetingId),
        nativeToScVal(participants.map(p => nativeToScVal(p, { type: 'address' }))),
      ))
      .setTimeout(30)
      .build()

    const prepared = await this.server.prepareTransaction(tx)
    prepared.sign(this.keypair)
    const result = await this.server.sendTransaction(prepared)
    return result.hash
  }

  async settleMeeting(params: {
    meetingId: string
    transcript: Array<{ agentId: string; message: string; timestamp: string }>
    commitments: string[]
    participants: string[]
    scores: number[]
  }): Promise<string> {
    // Build deterministic outcome hash
    const outcomeData = JSON.stringify({
      meetingId: params.meetingId,
      transcript: params.transcript,
      commitments: params.commitments,
      settledAt: new Date().toISOString(),
    })
    const outcomeHash = createHash('sha256').update(outcomeData).digest()

    const contract = new Contract(this.config.contracts.meetingFactory)
    const account = await this.server.getAccount(this.keypair.publicKey())

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(contract.call(
        'settle_meeting',
        nativeToScVal(this.keypair.publicKey(), { type: 'address' }),
        nativeToScVal(params.meetingId),
        nativeToScVal(outcomeHash, { type: 'bytes' }),
        nativeToScVal(params.scores.map(s => nativeToScVal(s, { type: 'u32' }))),
      ))
      .setTimeout(30)
      .build()

    const prepared = await this.server.prepareTransaction(tx)
    prepared.sign(this.keypair)
    const result = await this.server.sendTransaction(prepared)
    return result.hash
  }

  async getMeeting(meetingId: string): Promise<MeetingRecord | null> {
    try {
      const contract = new Contract(this.config.contracts.meetingFactory)
      const account = await this.server.getAccount(this.keypair.publicKey())

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(contract.call('get_meeting', nativeToScVal(meetingId)))
        .setTimeout(30)
        .build()

      const result = await this.server.simulateTransaction(tx)
      if (SorobanRpc.Api.isSimulationError(result)) return null

      const value = scValToNative((result as any).result?.retval)
      if (!value) return null

      return value as MeetingRecord
    } catch {
      return null
    }
  }
}
