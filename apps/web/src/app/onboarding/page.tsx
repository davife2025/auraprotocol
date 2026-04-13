'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useSignMessage } from 'wagmi'

const STEPS = ['Connect wallet', 'Name your agent', 'Set personality', 'Set permissions', 'Mint identity']

export default function OnboardingPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    communicationStyle: 'professional',
    riskTolerance: 'moderate',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    customInstructions: '',
    canCommitTo: ['schedule follow-ups', 'agree to meetings', 'share information'],
    cannotCommitTo: ['financial agreements', 'legal contracts', 'NDA'],
    escalateIf: ['equity', 'investment', 'legal', 'payment'],
  })

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStep(s => Math.max(s - 1, 0))

  const createAgent = async () => {
    if (!address) return
    setLoading(true)
    try {
      // Sign in
      const nonceRes = await fetch(`/api/v1/auth/nonce?address=${address}`)
      const { message } = await nonceRes.json()
      const signature = await signMessageAsync({ message })
      const authRes = await fetch('/api/v1/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, signature, message }),
      })
      const { token } = await authRes.json()
      localStorage.setItem('aura_token', token)

      // Create agent
      await fetch('/api/v1/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          personalityProfile: {
            communicationStyle: form.communicationStyle,
            riskTolerance: form.riskTolerance,
            timezone: form.timezone,
            customInstructions: form.customInstructions,
          },
          permissions: {
            meetings: {
              canCommitTo: form.canCommitTo,
              cannotCommitTo: form.cannotCommitTo,
              escalateIf: form.escalateIf,
              maxMeetingDurationMins: 60,
              requireHumanApprovalForBindingCommitments: true,
            },
          },
        }),
      })

      router.push('/dashboard')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors
                ${i < step ? 'bg-teal-500 text-white' : i === step ? 'bg-aura-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`h-0.5 w-6 ${i < step ? 'bg-teal-400' : 'bg-gray-200 dark:bg-gray-700'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8">
          {/* Step 0: Connect */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Connect your wallet</h2>
              <p className="text-gray-500 text-sm">Your wallet is your agent's onchain identity anchor.</p>
              {isConnected
                ? <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-teal-400" />
                    <span className="text-sm text-teal-700 dark:text-teal-300 font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                  </div>
                : <p className="text-sm text-amber-600">Connect your wallet using the button in the header.</p>
              }
              <button onClick={next} disabled={!isConnected} className="w-full py-3 rounded-xl bg-aura-600 text-white font-medium disabled:opacity-40 hover:bg-aura-800 transition-colors">
                Continue
              </button>
            </div>
          )}

          {/* Step 1: Name */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Name your agent</h2>
              <p className="text-gray-500 text-sm">This is how your agent introduces itself.</p>
              <input
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aura-400"
                placeholder="e.g. Alex's Agent, Ade Protocol"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
              <div className="flex gap-3 pt-2">
                <button onClick={back} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Back</button>
                <button onClick={next} disabled={!form.name} className="flex-1 py-3 rounded-xl bg-aura-600 text-white font-medium disabled:opacity-40 hover:bg-aura-800">Continue</button>
              </div>
            </div>
          )}

          {/* Step 2: Personality */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Set personality</h2>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Communication style</label>
                <div className="grid grid-cols-3 gap-2">
                  {['formal', 'professional', 'casual'].map(style => (
                    <button key={style} onClick={() => setForm(f => ({ ...f, communicationStyle: style }))}
                      className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors ${form.communicationStyle === style ? 'bg-aura-100 dark:bg-aura-900 text-aura-800 dark:text-aura-200 border border-aura-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                      {style}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Risk tolerance</label>
                <div className="grid grid-cols-3 gap-2">
                  {['conservative', 'moderate', 'aggressive'].map(risk => (
                    <button key={risk} onClick={() => setForm(f => ({ ...f, riskTolerance: risk }))}
                      className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors ${form.riskTolerance === risk ? 'bg-aura-100 dark:bg-aura-900 text-aura-800 dark:text-aura-200 border border-aura-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                      {risk}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Special instructions (optional)</label>
                <textarea rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-aura-400 resize-none"
                  placeholder="e.g. Always push for async over synchronous meetings..."
                  value={form.customInstructions}
                  onChange={e => setForm(f => ({ ...f, customInstructions: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <button onClick={back} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Back</button>
                <button onClick={next} className="flex-1 py-3 rounded-xl bg-aura-600 text-white font-medium hover:bg-aura-800">Continue</button>
              </div>
            </div>
          )}

          {/* Step 3: Permissions */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Set permissions</h2>
              <p className="text-gray-500 text-sm">These are enforced onchain — your agent cannot exceed them.</p>
              <div className="space-y-3">
                {[
                  { key: 'canCommitTo', label: '✅ Can commit to', color: 'teal' },
                  { key: 'cannotCommitTo', label: '🚫 Cannot commit to', color: 'red' },
                  { key: 'escalateIf', label: '⚡ Always escalate if', color: 'amber' },
                ].map(({ key, label, color }) => (
                  <div key={key} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(form[key as keyof typeof form] as string[]).map((item, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          {item}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Customise in Settings after creation.</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={back} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">Back</button>
                <button onClick={next} className="flex-1 py-3 rounded-xl bg-aura-600 text-white font-medium hover:bg-aura-800">Continue</button>
              </div>
            </div>
          )}

          {/* Step 4: Mint */}
          {step === 4 && (
            <div className="space-y-5 text-center">
              <div className="w-16 h-16 rounded-full bg-aura-100 dark:bg-aura-900 flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-aura-600">{form.name?.[0]?.toUpperCase()}</span>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Ready to mint</h2>
                <p className="text-gray-500 text-sm mt-2">
                  <strong className="text-gray-700 dark:text-gray-300">{form.name}</strong> will be minted as a soulbound identity on Monad.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-400 mb-1">Style</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{form.communicationStyle}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-400 mb-1">Risk tolerance</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{form.riskTolerance}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={back} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">Back</button>
                <button onClick={createAgent} disabled={loading} className="flex-1 py-3 rounded-xl bg-aura-600 text-white font-medium disabled:opacity-40 hover:bg-aura-800 flex items-center justify-center gap-2">
                  {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {loading ? 'Minting...' : 'Create agent'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
