import { createPublicClient, createWalletClient, http, keccak256, toBytes, type PublicClient, type WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { AURA_MEETING_FACTORY_ABI } from '../abis/AuraMeetingFactory.js'
import type { ContractAddresses } from '../types/index.js'
export interface MeetingSettlementParams {
  meetingId: string
  transcript: Array<{ agentId: string; message: string; timestamp: string }>
  commitments: string[]
  participants: `0x${string}`[]
  scores: number[]  // 0-100 per participant
}

export class MeetingClient {
  private publicClient: PublicClient
  private walletClient: WalletClient
  private contracts: ContractAddresses

  constructor(rpcUrl: string, privateKey: `0x${string}`, contracts: ContractAddresses, chainId = 10143) {
    const chain = { id: chainId, name: 'Monad', nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } } as const
    this.publicClient = createPublicClient({ chain, transport: http(rpcUrl) }) as PublicClient
    this.walletClient = createWalletClient({ chain, transport: http(rpcUrl), account: privateKeyToAccount(privateKey) }) as WalletClient
    this.contracts = contracts
  }

  /**
   * Deploy a new MeetingRoom contract for a meeting
   */
  async createMeeting(meetingId: string, participants: `0x${string}`[]): Promise<`0x${string}`> {
    return await this.walletClient.writeContract({
      address: this.contracts.meetingFactory!,
      abi: AURA_MEETING_FACTORY_ABI,
      functionName: 'createMeeting',
      args: [meetingId, participants],
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
    } as any)
  }

  /**
   * Settle a meeting onchain — hashes transcript + commitments and records reputation
   */
  async settleMeeting(params: MeetingSettlementParams): Promise<`0x${string}`> {
    // Build outcome hash from transcript + commitments
    const outcomeData = JSON.stringify({
      meetingId: params.meetingId,
      transcript: params.transcript,
      commitments: params.commitments,
      settledAt: new Date().toISOString(),
    })
   const outcomeHash = keccak256(toBytes(outcomeData)) as `0x${string}`

    return await this.walletClient.writeContract({
      address: this.contracts.meetingFactory!,
      abi: AURA_MEETING_FACTORY_ABI,
      functionName: 'settleWithReputation',
      args: [
        params.meetingId,
        outcomeHash,
        params.participants,
        params.scores.map(s => BigInt(s)),
      ],
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
    } as any)
  }

  /**
   * Get the deployed MeetingRoom address for a meeting
   */
  async getMeetingRoom(meetingId: string): Promise<`0x${string}`> {
    return await this.publicClient.readContract({
      address: this.contracts.meetingFactory!,
      abi: AURA_MEETING_FACTORY_ABI,
      functionName: 'getMeetingRoom',
      args: [meetingId],
    }) as `0x${string}`
  }

  /**
   * Record that an agent fulfilled a commitment (called after human approval)
   */
  async recordCommitmentFulfilled(agentWallet: `0x${string}`): Promise<`0x${string}`> {
    return await this.walletClient.writeContract({
      address: this.contracts.meetingFactory!,
      abi: AURA_MEETING_FACTORY_ABI,
      functionName: 'recordCommitmentFulfilled',
      args: [agentWallet],
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
    } as any)
  }

  /** Total meetings ever created */
  async totalMeetings(): Promise<bigint> {
    return await this.publicClient.readContract({
      address: this.contracts.meetingFactory!,
      abi: AURA_MEETING_FACTORY_ABI,
      functionName: 'totalMeetings',
      args: [],
    }) as bigint
  }
}
