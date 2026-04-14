'use client'

import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, createContext, useContext, useEffect, type ReactNode } from 'react'
import { connectFreighter, isFreighterInstalled } from '@/lib/stellar'

interface StellarWalletState {
  publicKey:   string | null
  isConnected: boolean
  isInstalled: boolean
  connecting:  boolean
  connect:     () => Promise<void>
  disconnect:  () => void
}

const StellarWalletContext = createContext<StellarWalletState>({
  publicKey: null, isConnected: false, isInstalled: false, connecting: false,
  connect: async () => {}, disconnect: () => {},
})

export function useStellarWallet() {
  return useContext(StellarWalletContext)
}

function StellarWalletProvider({ children }: { children: ReactNode }) {
  const [publicKey,   setPublicKey]   = useState<string | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [connecting,  setConnecting]  = useState(false)

  useEffect(() => {
    isFreighterInstalled().then(setIsInstalled)
    const saved = typeof window !== 'undefined' ? localStorage.getItem('stellar_public_key') : null
    if (saved) setPublicKey(saved)
  }, [])

  const connect = async () => {
    setConnecting(true)
    try {
      const key = await connectFreighter()
      if (key) {
        setPublicKey(key)
        localStorage.setItem('stellar_public_key', key)
      }
    } finally {
      setConnecting(false)
    }
  }

  const disconnect = () => {
    setPublicKey(null)
    localStorage.removeItem('stellar_public_key')
    localStorage.removeItem('aura_token')
  }

  return (
    <StellarWalletContext.Provider
      value={{ publicKey, isConnected: !!publicKey, isInstalled, connecting, connect, disconnect }}
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
