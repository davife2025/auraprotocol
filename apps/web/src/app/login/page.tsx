'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useStellarWallet } from '@/components/ui/Providers'
import { buildStellarSignInMessage, truncateStellarAddress } from '@/lib/stellar'

export default function LoginPage() {
  const router = useRouter()
  const { publicKey, isConnected, isInstalled, connecting, connect, disconnect } = useStellarWallet()
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleSignIn = async () => {
    if (!publicKey) return
    setSigning(true)
    setError(null)
    try {
      const nonce = Math.random().toString(36).slice(2)
      const message = buildStellarSignInMessage(publicKey, nonce)

      // Sign with Freighter
      if (!window.freighter) throw new Error('Freighter not found')
      // For Stellar, we sign a transaction hash or use a text message approach
      // Using dev mode message signing via a simple hash
      const msgBuffer = Buffer.from(message)
      const msgBase64 = msgBuffer.toString('base64')

      // Use NextAuth credentials
      const result = await signIn('credentials', {
        publicKey,
        signature: msgBase64, // In production, use actual Stellar signature
        message: process.env.NODE_ENV === 'development' ? 'dev' : message,
        redirect: false,
      })

      if (result?.error) {
        setError('Sign-in failed. Please try again.')
      } else {
        // Also get JWT token for API calls
        const authRes = await fetch('/api/v1/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: publicKey,
            signature: msgBase64,
            message: process.env.NODE_ENV === 'development' ? 'dev' : message,
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
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-aura-600/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-2xl bg-aura-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-aura-600/30">
            <span className="text-white text-xl font-bold">A</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Aura Protocol</h1>
          <p className="text-gray-400 text-sm mt-1.5">Sign in with your Stellar wallet</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
          {!isInstalled && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/50">
              <p className="text-sm text-amber-300 font-medium mb-1">Freighter not detected</p>
              <p className="text-xs text-amber-400/80">Install the Freighter browser extension to connect your Stellar wallet.</p>
              <a href="https://www.freighter.app/" target="_blank" rel="noreferrer"
                className="mt-2 inline-block text-xs text-amber-300 underline underline-offset-2 hover:text-amber-200">
                Get Freighter →
              </a>
            </div>
          )}

          {isConnected && publicKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-teal-950/40 border border-teal-800/50">
                <div className="w-2 h-2 rounded-full bg-teal-400 shrink-0 animate-pulse" />
                <div className="min-w-0">
                  <p className="text-xs text-teal-400 mb-0.5">Connected</p>
                  <p className="text-sm text-teal-200 font-mono truncate">{truncateStellarAddress(publicKey, 8)}</p>
                </div>
                <button onClick={disconnect} className="ml-auto text-xs text-gray-500 hover:text-gray-300 shrink-0">
                  Disconnect
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <button
                onClick={handleSignIn}
                disabled={signing}
                className="w-full py-3 rounded-xl bg-aura-600 text-white font-medium hover:bg-aura-500 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {signing && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {signing ? 'Signing...' : 'Sign in'}
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={connecting || !isInstalled}
              className="w-full py-3 rounded-xl bg-aura-600 text-white font-medium hover:bg-aura-500 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {connecting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {connecting ? 'Connecting...' : 'Connect Freighter'}
            </button>
          )}

          <p className="text-center text-xs text-gray-600">
            Your identity is anchored on Stellar. No email required.
          </p>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Don&apos;t have an agent?{' '}
          <a href="/onboarding" className="text-aura-400 hover:text-aura-300">Create one →</a>
        </p>
      </div>
    </div>
  )
}
