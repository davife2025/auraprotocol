import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { AURA_TOKEN_ABI } from '../abis/AuraToken.js'
import type { ContractAddresses } from '../types/index.js'

export class TokenClient {
  private publicClient: PublicClient
  private walletClient: WalletClient
  private contracts: ContractAddresses

  constructor(rpcUrl: string, privateKey: `0x${string}`, contracts: ContractAddresses, chainId = 10143) {
    const chain = { id: chainId, name: 'Monad', nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } } as const
    this.publicClient = createPublicClient({ chain, transport: http(rpcUrl) }) as PublicClient
    this.walletClient = createWalletClient({ chain, transport: http(rpcUrl), account: privateKeyToAccount(privateKey) }) as WalletClient
    this.contracts = contracts
  }

  async getBalance(wallet: `0x${string}`): Promise<bigint> {
    return await this.publicClient.readContract({ address: this.contracts.token!, abi: AURA_TOKEN_ABI, functionName: 'balanceOf', args: [wallet] }) as bigint
  }

  async getStakedBalance(wallet: `0x${string}`): Promise<bigint> {
    return await this.publicClient.readContract({ address: this.contracts.token!, abi: AURA_TOKEN_ABI, functionName: 'stakedBalance', args: [wallet] }) as bigint
  }

  async hasProAccess(wallet: `0x${string}`): Promise<boolean> {
    return await this.publicClient.readContract({ address: this.contracts.token!, abi: AURA_TOKEN_ABI, functionName: 'hasProAccess', args: [wallet] }) as boolean
  }

  async hasBusinessAccess(wallet: `0x${string}`): Promise<boolean> {
    return await this.publicClient.readContract({ address: this.contracts.token!, abi: AURA_TOKEN_ABI, functionName: 'hasBusinessAccess', args: [wallet] }) as boolean
  }

  async hasPremiumRoomAccess(wallet: `0x${string}`, requiredStake: bigint): Promise<boolean> {
    return await this.publicClient.readContract({ address: this.contracts.token!, abi: AURA_TOKEN_ABI, functionName: 'hasPremiumRoomAccess', args: [wallet, requiredStake] }) as boolean
  }

  async stake(amount: bigint): Promise<`0x${string}`> {
    return await this.walletClient.writeContract({ address: this.contracts.token!, abi: AURA_TOKEN_ABI, functionName: 'stake', args: [amount], chain: this.walletClient.chain, account: this.walletClient.account! } as any)
  }

  async unstake(amount: bigint): Promise<`0x${string}`> {
    return await this.walletClient.writeContract({ address: this.contracts.token!, abi: AURA_TOKEN_ABI, functionName: 'unstake', args: [amount], chain: this.walletClient.chain, account: this.walletClient.account! } as any)
  }
}
