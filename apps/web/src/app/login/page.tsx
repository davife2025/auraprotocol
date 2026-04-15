'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useStellarWallet } from '@/components/ui/Providers'
import { buildStellarSignInMessage, truncateStellarAddress, isValidStellarAddress, type WalletType } from '@/lib/stellar'

const WALLETS: { type: WalletType; label: string; icon: string; description: string }[] = [
  { type: 'freighter', label: 'Freighter', icon: '🚀', description: 'Official Stellar browser extension' },
  { type: 'xbull',    label: 'xBull',      icon: '🐂', description: 'Feature-rich Stellar wallet' },
  { type: 'lobstr',   label: 'LOBSTR',     icon: '🦞', description: 'Mobile-friendly Stellar wallet' },
  { type: 'manual',   label: 'Public Key', icon: '🔑', description: 'Enter your Stellar public key manually' },
]

export default function LoginPage() {
  const router = useRouter()
  const { publicKey, isConnected, connecting, connect, disconnect } = useStellarWallet()
  const [signing,    setSigning]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [mounted,    setMounted]    = useState(false)
  const [manualKey,  setManualKey]  = useState('')
  const [showManual, setShowManual] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleConnect = async (type: WalletType) => {
    setError(null)
    if (type === 'manual') { setShowManual(true); return }
    if (type === 'lobstr') { window.open('https://lobstr.co/', '_blank'); setShowManual(true); return }
    await connect(type)
  }

  const handleManualSubmit = async () => {
    if (!isValidStellarAddress(manualKey.trim())) {
      setError('Invalid Stellar public key. It should start with G and be 56 characters.')
      return
    }
    await connect('manual', manualKey.trim())
    setShowManual(false)
    setManualKey('')
  }

  const handleSignIn = async () => {
    if (!publicKey) return
    setSigning(true)
    setError(null)
    try {
      const nonce   = Math.random().toString(36).slice(2)
      const message = buildStellarSignInMessage(publicKey, nonce)
      const isDev   = process.env.NODE_ENV === 'development'

      const result = await signIn('credentials', {
        publicKey,
        signature: isDev ? 'dev' : Buffer.from(message).toString('base64'),
        message:   isDev ? 'dev' : message,
        redirect:  false,
      })

      if (result?.error) {
        setError('Sign-in failed. Please try again.')
      } else {
        const authRes = await fetch('/api/v1/auth/signin', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            walletAddress: publicKey,
            signature:     isDev ? 'dev' : Buffer.from(message).toString('base64'),
            message:       isDev ? 'dev' : message,
          }),
        })
        if (authRes.ok) {
          const { token } = await authRes.json()
          if (token) localStorage.setItem('aura_token', token)
        }
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong.')
    } finally {
      setSigning(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-aura-600/8 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-2xl bg-aura-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-aura-600/40">
            <span className="text-white text-xl font-bold">A</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Aura Protocol</h1>
          <p className="text-gray-400 text-sm mt-1.5">Connect your Stellar wallet to sign in</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
          {isConnected && publicKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-teal-950/40 border border-teal-800/40">
                <div className="w-2 h-2 rounded-full bg-teal-400 shrink-0 animate-pulse" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-teal-400 mb-0.5">Connected</p>
                  <p className="text-sm text-teal-200 font-mono truncate">{truncateStellarAddress(publicKey, 8)}</p>
                </div>
                <button onClick={disconnect} className="text-xs text-gray-500 hover:text-gray-300 shrink-0 transition-colors">
                  Disconnect
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <button onClick={handleSignIn} disabled={signing} className="aura-btn-primary w-full py-3 text-base">
                {signing && <span className="aura-spinner" />}
                {signing ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

          ) : showManual ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">Enter your Stellar public key (starts with G)</p>
              <input
                type="text"
                value={manualKey}
                onChange={e => { setManualKey(e.target.value); setError(null) }}
                placeholder="GABC...XYZ"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-aura-500"
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setShowManual(false); setError(null) }} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-400 hover:text-white transition-colors">
                  Back
                </button>
                <button onClick={handleManualSubmit} className="flex-1 aura-btn-primary py-2.5 text-sm">
                  Connect
                </button>
              </div>
            </div>

          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-3">Choose your wallet</p>
              {WALLETS.map(w => (
                <button
                  key={w.type}
                  onClick={() => handleConnect(w.type)}
                  disabled={connecting}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-800 hover:border-gray-600 hover:bg-gray-800/50 transition-all text-left"
                >
                  <span className="text-xl">{w.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{w.label}</p>
                    <p className="text-xs text-gray-500 truncate">{w.description}</p>
                  </div>
                  <span className="text-gray-600 text-xs">→</span>
                </button>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-gray-600">
            Your identity is anchored on Stellar. No email required.
          </p>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Don&apos;t have an agent?{' '}
          <a href="/onboarding" className="text-aura-400 hover:text-aura-300 transition-colors">
            Create one →
          </a>
        </p>
      </div>
    </div>
  )
}