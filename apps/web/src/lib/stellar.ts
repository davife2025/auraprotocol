/**
 * Stellar wallet integration using Freighter browser extension.
 * Replaces wagmi/viem from the Monad implementation.
 *
 * Install: https://www.freighter.app/
 * npm install @stellar/freighter-api
 */

export interface FreighterAPI {
  isConnected: () => Promise<{ isConnected: boolean }>
  getPublicKey: () => Promise<string>
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string>
  getNetwork: () => Promise<{ network: string; networkPassphrase: string }>
  getNetworkDetails: () => Promise<{ network: string; networkPassphrase: string; sorobanRpcUrl: string }>
}

declare global {
  interface Window {
    freighter?: FreighterAPI
  }
}

export const STELLAR_NETWORK = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet') as 'testnet' | 'mainnet'

export const STELLAR_NETWORK_PASSPHRASE = STELLAR_NETWORK === 'mainnet'
  ? 'Public Global Stellar Network ; September 2015'
  : 'Test SDF Network ; September 2015'

export const STELLAR_RPC_URL = STELLAR_NETWORK === 'mainnet'
  ? (process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? 'https://mainnet.sorobanrpc.com')
  : (process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org')

export const STELLAR_HORIZON_URL = STELLAR_NETWORK === 'mainnet'
  ? 'https://horizon.stellar.org'
  : 'https://horizon-testnet.stellar.org'

export const STELLAR_EXPLORER_URL = STELLAR_NETWORK === 'mainnet'
  ? 'https://stellar.expert/explorer/public'
  : 'https://stellar.expert/explorer/testnet'

/**
 * Check if Freighter extension is installed
 */
export async function isFreighterInstalled(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    if (!window.freighter) return false
    //const { isConnected } = await window.freighter.isConnected()
    return true
  } catch {
    return false
  }
}

/**
 * Connect Freighter and get public key
 */
export async function connectFreighter(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    if (!window.freighter) {
      window.open('https://www.freighter.app/', '_blank')
      return null
    }
    const publicKey = await window.freighter.getPublicKey()
    return publicKey
  } catch {
    return null
  }
}

/**
 * Get current connected public key
 */
export async function getFreighterPublicKey(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.freighter) return null
  try {
    return await window.freighter.getPublicKey()
  } catch {
    return null
  }
}

/**
 * Sign a transaction XDR with Freighter
 */
export async function signWithFreighter(xdr: string): Promise<string | null> {
  if (typeof window === 'undefined' || !window.freighter) return null
  try {
    return await window.freighter.signTransaction(xdr, {
      networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
    })
  } catch {
    return null
  }
}

/**
 * Build a sign-in message for Stellar wallets (similar to EIP-191 for EVM)
 * Uses the Stellar memo / transaction signing approach
 */
export function buildStellarSignInMessage(publicKey: string, nonce: string): string {
  return [
    'Sign in to Aura Protocol',
    '',
    `Address: ${publicKey}`,
    `Nonce: ${nonce}`,
    `Issued: ${new Date().toISOString()}`,
    `Network: ${STELLAR_NETWORK}`,
  ].join('\n')
}

/**
 * Truncate a Stellar address for display
 */
export function truncateStellarAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars + 1)}...${address.slice(-chars)}`
}
