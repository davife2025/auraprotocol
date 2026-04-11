import { IdentityClient, MeetingClient, TokenClient } from '@aura/agent-identity'
import type { ContractAddresses } from '@aura/agent-identity'

function getContractAddresses(): ContractAddresses {
  const required = ['AURA_IDENTITY_CONTRACT', 'AURA_REGISTRY_CONTRACT', 'AURA_REPUTATION_CONTRACT', 'AURA_PERMISSIONS_CONTRACT']
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing env var: ${key} — run pnpm contracts:deploy:testnet first`)
    }
  }

  return {
    identity:       process.env.AURA_IDENTITY_CONTRACT    as `0x${string}`,
    registry:       process.env.AURA_REGISTRY_CONTRACT    as `0x${string}`,
    reputation:     process.env.AURA_REPUTATION_CONTRACT  as `0x${string}`,
    permissions:    process.env.AURA_PERMISSIONS_CONTRACT as `0x${string}`,
    meetingFactory: process.env.AURA_MEETING_FACTORY_CONTRACT as `0x${string}` | undefined,
    token:          process.env.AURA_TOKEN_CONTRACT        as `0x${string}` | undefined,
  }
}

function getViemParams() {
  const rpcUrl = process.env.MONAD_RPC_URL ?? 'https://testnet-rpc.monad.xyz'
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`
  if (!privateKey || privateKey === '0x' + '0'.repeat(64)) {
    throw new Error('DEPLOYER_PRIVATE_KEY not set')
  }
  return { rpcUrl, privateKey, contracts: getContractAddresses() }
}

// Lazy singletons — only instantiated when contracts are configured
let _identityClient: IdentityClient | null = null
let _meetingClient: MeetingClient | null = null
let _tokenClient: TokenClient | null = null

export function getIdentityClient(): IdentityClient {
  if (!_identityClient) {
    const { rpcUrl, privateKey, contracts } = getViemParams()
    _identityClient = new IdentityClient(rpcUrl, privateKey, contracts)
  }
  return _identityClient
}

export function getMeetingClient(): MeetingClient {
  if (!_meetingClient) {
    const { rpcUrl, privateKey, contracts } = getViemParams()
    _meetingClient = new MeetingClient(rpcUrl, privateKey, contracts)
  }
  return _meetingClient
}

export function getTokenClient(): TokenClient {
  if (!_tokenClient) {
    const { rpcUrl, privateKey, contracts } = getViemParams()
    _tokenClient = new TokenClient(rpcUrl, privateKey, contracts)
  }
  return _tokenClient
}

/**
 * Check if onchain services are configured and available
 */
export function isOnchainConfigured(): boolean {
  try {
    getContractAddresses()
    return true
  } catch {
    return false
  }
}
