'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStellarWallet } from '@/components/ui/Providers'
import { truncateStellarAddress } from '@/lib/stellar'

const STEPS = ['Connect wallet', 'Name your agent', 'Set personality', 'Set permissions', 'Mint identity']

const DEFAULT_FORM = {
  name: '',
  communicationStyle: 'professional',
  riskTolerance: 'moderate',
  timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  customInstructions: '',
  canCommitTo:     ['schedule follow-ups', 'agree to meetings', 'share information'],
  cannotCommitTo:  ['financial agreements', 'legal contracts', 'NDA'],
  escalateIf:      ['equity', 'investment', 'legal', 'payment'],
}

export default function OnboardingPage() {
  const router = useRouter()
  const { publicKey, isConnected, isInstalled, connecting, connect } = useStellarWallet()
  const [step, setStep]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm]     = useState(DEFAULT_FORM)

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStep(s => Math.max(s - 1, 0))
  const set  = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))

  const addTag = (key: string, val: string) =>
    setForm(f => ({ ...f, [key]: [...(f[key as keyof typeof f] as string[]), val] }))

  const removeTag = (key: string, i: number) =>
    setForm(f => ({ ...f, [key]: (f[key as keyof typeof f] as string[]).filter((_, j) => j !== i) }))

  const createAgent = async () => {
    if (!publicKey) return
    setLoading(true)
    try {
      const authRes = await fetch('/api/v1/auth/signin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ walletAddress: publicKey, signature: 'dev', message: 'dev' }),
      })
      const { token } = await authRes.json()
      if (token) localStorage.setItem('aura_token', token)

      await fetch('/api/v1/agents', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          name: form.name,
          personalityProfile: {
            communicationStyle: form.communicationStyle,
            riskTolerance:      form.riskTolerance,
            timezone:           form.timezone,
            customInstructions: form.customInstructions,
          },
          permissions: {
            meetings: {
              canCommitTo:     form.canCommitTo,
              cannotCommitTo:  form.cannotCommitTo,
              escalateIf:      form.escalateIf,
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

  const StyleBtn = ({ value, field }: { value: string; field: string }) => (
    <button
      onClick={() => set(field, value)}
      className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
        (form as any)[field] === value
          ? 'bg-aura-100 dark:bg-aura-900/60 text-aura-800 dark:text-aura-200 border border-aura-300 dark:border-aura-700'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {value}
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress stepper */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide">
          {STEPS.map((_s, i) => (
            <div key={i} className="flex items-center gap-2 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                i < step  ? 'bg-teal-500 text-white'
                : i === step ? 'bg-aura-600 text-white'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 transition-colors ${i < step ? 'bg-teal-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="aura-card !p-8 animate-slide-up">
          {/* Step 0: Connect */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Connect your wallet</h2>
                <p className="text-gray-500 text-sm mt-1">Your Stellar wallet is your agent's onchain identity anchor.</p>
              </div>

              {!isInstalled && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Freighter not detected.{' '}
                    <a href="https://www.freighter.app/" target="_blank" rel="noreferrer" className="underline">
                      Install it here →
                    </a>
                  </p>
                </div>
              )}

              {isConnected && publicKey ? (
                <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800">
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  <span className="text-sm text-teal-700 dark:text-teal-300 font-mono">
                    {truncateStellarAddress(publicKey, 8)}
                  </span>
                </div>
              ) : (
                <button
                  onClick={connect}
                  disabled={connecting || !isInstalled}
                  className="aura-btn-ghost w-full py-3"
                >
                  {connecting && <span className="aura-spinner !border-gray-300 !border-t-gray-700" />}
                  {connecting ? 'Connecting...' : 'Connect Freighter'}
                </button>
              )}

              <button onClick={next} disabled={!isConnected} className="aura-btn-primary w-full py-3">
                Continue
              </button>
            </div>
          )}

          {/* Step 1: Name */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Name your agent</h2>
                <p className="text-gray-500 text-sm mt-1">This is how your agent introduces itself in rooms and meetings.</p>
              </div>
              <input
                className="aura-input py-3"
                placeholder="e.g. Alex's Agent, Ade Protocol"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
              <div className="flex gap-3 pt-1">
                <button onClick={back} className="aura-btn-ghost flex-1 py-3">Back</button>
                <button onClick={next} disabled={!form.name} className="aura-btn-primary flex-1 py-3">Continue</button>
              </div>
            </div>
          )}

          {/* Step 2: Personality */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Set personality</h2>
                <p className="text-gray-500 text-sm mt-1">Defines how your agent communicates and makes decisions.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Communication style</label>
                <div className="grid grid-cols-3 gap-2">
                  {['formal', 'professional', 'casual'].map(style => (
                    <StyleBtn key={style} value={style} field="communicationStyle" />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Risk tolerance</label>
                <div className="grid grid-cols-3 gap-2">
                  {['conservative', 'moderate', 'aggressive'].map(risk => (
                    <StyleBtn key={risk} value={risk} field="riskTolerance" />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Special instructions <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  className="aura-input resize-none"
                  placeholder="e.g. Always push for async over synchronous meetings..."
                  value={form.customInstructions}
                  onChange={e => set('customInstructions', e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={back} className="aura-btn-ghost flex-1 py-3">Back</button>
                <button onClick={next} className="aura-btn-primary flex-1 py-3">Continue</button>
              </div>
            </div>
          )}

          {/* Step 3: Permissions */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Set permissions</h2>
                <p className="text-gray-500 text-sm mt-1">Enforced onchain — your agent cannot exceed these boundaries.</p>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'canCommitTo',    label: '✅ Can commit to' },
                  { key: 'cannotCommitTo', label: '🚫 Cannot commit to' },
                  { key: 'escalateIf',     label: '⚡ Always escalate if' },
                ].map(({ key, label }) => (
                  <div key={key} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(form[key as keyof typeof form] as string[]).map((item, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                        >
                          {item}
                          <button
                            className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                            onClick={() => removeTag(key, i)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      className="aura-input text-xs py-1.5"
                      placeholder="Type and press Enter to add..."
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value.trim()
                          if (val) { addTag(key, val); (e.target as HTMLInputElement).value = '' }
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={back} className="aura-btn-ghost flex-1 py-3">Back</button>
                <button onClick={next} className="aura-btn-primary flex-1 py-3">Continue</button>
              </div>
            </div>
          )}

          {/* Step 4: Mint */}
          {step === 4 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-aura-100 dark:bg-aura-900/50 flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-aura-600 dark:text-aura-300">
                  {form.name?.[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Ready to mint</h2>
                <p className="text-gray-500 text-sm mt-2">
                  <strong className="text-gray-700 dark:text-gray-300">{form.name}</strong> will be anchored as a soulbound identity on Stellar.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="aura-stat">
                  <p className="text-xs text-gray-400 mb-1">Style</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{form.communicationStyle}</p>
                </div>
                <div className="aura-stat">
                  <p className="text-xs text-gray-400 mb-1">Risk tolerance</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{form.riskTolerance}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={back} className="aura-btn-ghost flex-1 py-3">Back</button>
                <button onClick={createAgent} disabled={loading} className="aura-btn-primary flex-1 py-3">
                  {loading && <span className="aura-spinner" />}
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
