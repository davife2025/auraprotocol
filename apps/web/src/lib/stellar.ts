export interface FreighterAPI {
  isConnected:     () => Promise<{ isConnected: boolean }>
  getPublicKey:    () => Promise<string>
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string>
  getNetwork:      () => Promise<{ network: string; networkPassphrase: string }>
  getNetworkDetails: () => Promise<{ network: string; networkPassphrase: string; sorobanRpcUrl: string }>
}

export interface XBullAPI {
  connect:         () => Promise<{ publicKey: string }>
  getPublicKey:    () => Promise<string>
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<{ signedXDR: string }>
}

declare global {
  interface Window {
    freighter?: FreighterAPI
    xBullSDK?:  XBullAPI
  }
}

export type WalletType = 'freighter' | 'xbull' | 'lobstr' | 'manual'

export const STELLAR_NETWORK = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet') as 'testnet' | 'mainnet'
export const STELLAR_NETWORK_PASSPHRASE =
  STELLAR_NETWORK === 'mainnet'
    ? 'Public Global Stellar Network ; September 2015'
    : 'Test SDF Network ; September 2015'
export const STELLAR_RPC_URL =
  STELLAR_NETWORK === 'mainnet'
    ? (process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? 'https://mainnet.sorobanrpc.com')
    : (process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org')
export const STELLAR_HORIZON_URL =
  STELLAR_NETWORK === 'mainnet' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org'
export const STELLAR_EXPLORER_URL =
  STELLAR_NETWORK === 'mainnet'
    ? 'https://stellar.expert/explorer/public'
    : 'https://stellar.expert/explorer/testnet'

// ── Freighter ────────────────────────────────────────────────────────────────
export async function isFreighterInstalled(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try { return !!window.freighter } catch { return false }
}

export async function connectFreighter(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    if (!window.freighter) { window.open('https://www.freighter.app/', '_blank'); return null }
    return await window.freighter.getPublicKey()
  } catch { return null }
}

// ── xBull ────────────────────────────────────────────────────────────────────
export function isXBullInstalled(): boolean {
  if (typeof window === 'undefined') return false
  return !!window.xBullSDK
}

export async function connectXBull(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    if (!window.xBullSDK) { window.open('https://xbull.app/', '_blank'); return null }
    const { publicKey } = await window.xBullSDK.connect()
    return publicKey
  } catch { return null }
}

// ── LOBSTR ───────────────────────────────────────────────────────────────────
// LOBSTR uses WalletConnect under the hood — for now we deep-link to their app
export function isLobstrAvailable(): boolean { return true }

export async function connectLobstr(): Promise<string | null> {
  // LOBSTR doesn't inject a browser API — prompt manual key entry
  return null
}

// ── Shared ───────────────────────────────────────────────────────────────────
export async function signWithFreighter(xdr: string): Promise<string | null> {
  if (typeof window === 'undefined' || !window.freighter) return null
  try {
    return await window.freighter.signTransaction(xdr, { networkPassphrase: STELLAR_NETWORK_PASSPHRASE })
  } catch { return null }
}

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
  if (address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars + 1)}...${address.slice(-chars)}`
}

export function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address)
}