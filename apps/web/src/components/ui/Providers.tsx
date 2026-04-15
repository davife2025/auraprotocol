'use client'
import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, createContext, useContext, useEffect, type ReactNode } from 'react'
import {
  connectFreighter, connectXBull,
  type WalletType,
} from '@/lib/stellar'

interface StellarWalletState {
  publicKey:    string | null
  walletType:   WalletType | null
  isConnected:  boolean
  connecting:   boolean
  connect:      (type: WalletType, manualKey?: string) => Promise<void>
  disconnect:   () => void
}

const StellarWalletContext = createContext<StellarWalletState>({
  publicKey: null, walletType: null, isConnected: false, connecting: false,
  connect: async () => {}, disconnect: () => {},
})

export function useStellarWallet() { return useContext(StellarWalletContext) }

function StellarWalletProvider({ children }: { children: ReactNode }) {
  const [publicKey,  setPublicKey]  = useState<string | null>(null)
  const [walletType, setWalletType] = useState<WalletType | null>(null)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    const savedKey  = localStorage.getItem('stellar_public_key')
    const savedType = localStorage.getItem('stellar_wallet_type') as WalletType | null
    if (savedKey) { setPublicKey(savedKey); setWalletType(savedType) }
  }, [])

  const connect = async (type: WalletType, manualKey?: string) => {
    setConnecting(true)
    try {
      let key: string | null = null
      if (type === 'freighter') key = await connectFreighter()
      else if (type === 'xbull') key = await connectXBull()
      else if (type === 'manual' && manualKey) key = manualKey
      if (key) {
        setPublicKey(key)
        setWalletType(type)
        localStorage.setItem('stellar_public_key', key)
        localStorage.setItem('stellar_wallet_type', type)
      }
    } finally {
      setConnecting(false)
    }
  }

  const disconnect = () => {
    setPublicKey(null)
    setWalletType(null)
    localStorage.removeItem('stellar_public_key')
    localStorage.removeItem('stellar_wallet_type')
    localStorage.removeItem('aura_token')
  }

  return (
    <StellarWalletContext.Provider
      value={{ publicKey, walletType, isConnected: !!publicKey, connecting, connect, disconnect }}
    >
      {children}
    </StellarWalletContext.Provider>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
  }))
  return (
    <QueryClientProvider client={queryClient}>
      <StellarWalletProvider>
        <SessionProvider>{children}</SessionProvider>
      </StellarWalletProvider>
    </QueryClientProvider>
  )
}