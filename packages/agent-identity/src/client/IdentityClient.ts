import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { AURA_IDENTITY_ABI } from '../abis/AuraIdentity.js'
import { AURA_REPUTATION_ABI } from '../abis/AuraReputation.js'
import type { OnchainIdentity, OnchainReputation, IdentityMintParams, ContractAddresses } from '../types/index.js'

export class IdentityClient {
  private publicClient: PublicClient
  private walletClient: WalletClient
  private contracts: ContractAddresses

  constructor(
    rpcUrl: string,
    privateKey: `0x${string}`,
    contracts: ContractAddresses,
    chainId: number = 10143
  ) {
    const chain = {
      id: chainId,
      name: 'Monad',
      nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    } as const

    this.publicClient = createPublicClient({ chain, transport: http(rpcUrl) }) as PublicClient
    const account = privateKeyToAccount(privateKey)
    this.walletClient = createWalletClient({ chain, transport: http(rpcUrl), account }) as WalletClient
    this.contracts = contracts
  }

  /**
   * Mint a soulbound identity NFT for a new agent
   */
  async mintIdentity(params: IdentityMintParams): Promise<{ txHash: `0x${string}`; tokenId?: bigint }> {
    // TODO: session 2 — wire up to deployed AuraIdentity.sol
    // Placeholder structure — real implementation after contract deploy
    const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`)

    const txHash = await this.walletClient.writeContract({
      address: this.contracts.identity,
      abi: AURA_IDENTITY_ABI,
      functionName: 'mint',
      args: [params.walletAddress, params.metadataUri, params.permissionsHash],
      account,
      chain: this.walletClient.chain,
    } as any)

    return { txHash }
  }

  /**
   * Resolve onchain identity for a wallet address
   */
  async resolveIdentity(walletAddress: `0x${string}`): Promise<OnchainIdentity | null> {
    try {
      const result = await this.publicClient.readContract({
        address: this.contracts.identity,
        abi: AURA_IDENTITY_ABI,
        functionName: 'getIdentity',
        args: [walletAddress],
     }) as unknown as any[]

      return {
        tokenId: result[0] as bigint,
        walletAddress,
        auraId: result[1] as string,
        metadataUri: result[2] as string,
        mintedAt: result[3] as bigint,
        isRevoked: result[4] as boolean,
      }
    } catch {
      return null
    }
  }

  /**
   * Get reputation score for a wallet
   */
  async getReputation(walletAddress: `0x${string}`): Promise<OnchainReputation | null> {
    try {
      const result = await this.publicClient.readContract({
        address: this.contracts.reputation,
        abi: AURA_REPUTATION_ABI,
        functionName: 'getReputation',
        args: [walletAddress],
     }) as unknown as any[]

      return {
        walletAddress,
        overallScore: Number(result[0]),
        commitmentRate: Number(result[1]),
        meetingQuality: Number(result[2]),
        networkingScore: Number(result[3]),
        totalInteractions: result[4] as bigint,
        lastUpdated: result[5] as bigint,
      }
    } catch {
      return null
    }
  }

  /**
   * Revoke an agent identity (emergency kill switch)
   */
  async revokeIdentity(tokenId: bigint): Promise<`0x${string}`> {
    const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`)

    return await this.walletClient.writeContract({
      address: this.contracts.identity,
      abi: AURA_IDENTITY_ABI,
      functionName: 'revoke',
      args: [tokenId],
      account,
      chain: this.walletClient.chain,
    } as any)
  }
}
