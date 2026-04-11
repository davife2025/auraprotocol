export interface OnchainIdentity {
  tokenId: bigint
  walletAddress: `0x${string}`
  auraId: string
  metadataUri: string
  mintedAt: bigint
  isRevoked: boolean
}

export interface OnchainPermissions {
  agentId: string
  schemaHash: `0x${string}`
  encodedPermissions: `0x${string}`
  updatedAt: bigint
  version: number
}

export interface OnchainReputation {
  walletAddress: `0x${string}`
  overallScore: number
  commitmentRate: number
  meetingQuality: number
  networkingScore: number
  totalInteractions: bigint
  lastUpdated: bigint
}

export interface IdentityMintParams {
  walletAddress: `0x${string}`
  metadataUri: string
  permissionsHash: `0x${string}`
}

export interface ContractAddresses {
  identity: `0x${string}`
  permissions: `0x${string}`
  registry: `0x${string}`
  reputation: `0x${string}`
  meetingFactory?: `0x${string}`
  token?: `0x${string}`
}

export interface TokenBalance {
  wallet: `0x${string}`
  balance: bigint
  stakedBalance: bigint
  tier: 'free' | 'pro' | 'business'
}
