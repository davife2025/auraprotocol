/**
 * Stellar wallet integration.
 * Supports: Freighter, xBull, manual public key entry.
 */

export type WalletType = 'freighter' | 'xbull' | 'lobstr' | 'manual'

export interface FreighterAPI {
  isConnected:       () => Promise<{ isConnected: boolean }>
  getPublicKey:      () => Promise<string>
  signTransaction:   (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string>
  getNetwork:        () => Promise<{ network: string; networkPassphrase: string }>
  getNetworkDetails: () => Promise<{ network: string; networkPassphrase: string; sorobanRpcUrl: string }>
}

export interface XBullAPI {
  connect:      () => Promise<{ publicKey: string }>
  getPublicKey: () => Promise<string>
}

declare global {
  interface Window {
    freighter?: FreighterAPI
    xBullSDK?:  XBullAPI
  }
}

export const STELLAR_NETWORK = (
  process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet'
) as 'testnet' | 'mainnet'

export const STELLAR_NETWORK_PASSPHRASE =
  STELLAR_NETWORK === 'mainnet'
    ? 'Public Global Stellar Network ; September 2015'
    : 'Test SDF Network ; September 2015'

export const STELLAR_RPC_URL =
  STELLAR_NETWORK === 'mainnet'
    ? (process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? 'https://mainnet.sorobanrpc.com')
    : (process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org')

export const STELLAR_HORIZON_URL =
  STELLAR_NETWORK === 'mainnet'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org'

export const STELLAR_EXPLORER_URL =
  STELLAR_NETWORK === 'mainnet'
    ? 'https://stellar.expert/explorer/public'
    : 'https://stellar.expert/explorer/testnet'

// ── Validation ──────────────────────────────────────────────

/**
 * Validate a Stellar public key (G... 56 chars, base32)
 */
export function isValidStellarAddress(address: string): boolean {
  if (!address) return false
  const trimmed = address.trim()
  if (!trimmed.startsWith('G')) return false
  if (trimmed.length !== 56) return false
  // Base32 charset only
  const base32Regex = /^[A-Z2-7]{56}$/
  return base32Regex.test(trimmed)
}

// ── Freighter ────────────────────────────────────────────────

export async function isFreighterInstalled(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    if (!window.freighter) return false
    await window.freighter.isConnected()
    return true
  } catch {
    return false
  }
}

export async function connectFreighter(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    if (!window.freighter) {
      window.open('https://www.freighter.app/', '_blank')
      return null
    }
    return await window.freighter.getPublicKey()
  } catch {
    return null
  }
}

// ── xBull ────────────────────────────────────────────────────

export async function connectXBull(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    if (!window.xBullSDK) {
      window.open('https://xbull.app/', '_blank')
      return null
    }
    const { publicKey } = await window.xBullSDK.connect()
    return publicKey
  } catch {
    return null
  }
}

// ── Generic connect ──────────────────────────────────────────

export async function connectWallet(
  type: WalletType,
  manualKey?: string
): Promise<string | null> {
  switch (type) {
    case 'freighter': return connectFreighter()
    case 'xbull':     return connectXBull()
    case 'manual':    return manualKey && isValidStellarAddress(manualKey) ? manualKey : null
    case 'lobstr':    return null // handled via redirect in UI
    default:          return null
  }
}

// ── Signing ──────────────────────────────────────────────────

export async function getFreighterPublicKey(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.freighter) return null
  try { return await window.freighter.getPublicKey() } catch { return null }
}

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

// ── Utilities ────────────────────────────────────────────────

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

export function truncateStellarAddress(address: string, chars = 4): string {
  if (!address) return ''
  if (address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars + 1)}...${address.slice(-chars)}`
}
