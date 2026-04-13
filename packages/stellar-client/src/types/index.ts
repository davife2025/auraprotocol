export interface StellarContractAddresses {
  identity:       string  // Soroban contract IDs (C... format)
  reputation:     string
  permissions:    string
  meetingFactory: string
  token:          string
}

export interface StellarConfig {
  network:          'mainnet' | 'testnet'
  rpcUrl:           string
  networkPassphrase: string
  contracts:        StellarContractAddresses
}

export interface OnchainIdentity {
  tokenId:         number
  auraId:          string
  metadataUri:     string
  permissionsHash: string
  mintedAt:        number
  isRevoked:       boolean
}

export interface OnchainReputation {
  overallScore:      number
  commitmentRate:    number
  meetingQuality:    number
  networkingScore:   number
  totalInteractions: number
  lastUpdated:       number
}

export interface MeetingRecord {
  meetingId:   string
  creator:     string
  participants: string[]
  status:      'Pending' | 'Active' | 'Ended' | 'Settled'
  outcomeHash: string | null
  createdAt:   number
  settledAt:   number | null
}

export type StellarNetwork = 'mainnet' | 'testnet'

export const STELLAR_NETWORKS = {
  mainnet: {
    rpcUrl: 'https://mainnet.sorobanrpc.com',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    horizonUrl: 'https://horizon.stellar.org',
  },
  testnet: {
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    horizonUrl: 'https://horizon-testnet.stellar.org',
  },
} as const
