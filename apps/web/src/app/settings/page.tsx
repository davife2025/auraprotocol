'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function SettingsPage() {
  const [agents, setAgents]   = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('aura_token')
    if (!token) return
    fetch('/api/v1/agents', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setAgents(d.agents ?? [])
        if (d.agents?.[0]) setSelected(d.agents[0])
      })
  }, [])

  const savePermissions = async () => {
    const token = localStorage.getItem('aura_token')
    if (!token || !selected) return
    setSaving(true)
    await fetch(`/api/v1/agents/${selected.id}/permissions`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ permissions: selected.permissions }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const pauseAgent = async () => {
    const token = localStorage.getItem('aura_token')
    if (!token || !selected) return
    await fetch(`/api/v1/agents/${selected.id}/pause`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    setSelected((s: any) => ({ ...s, status: 'PAUSED' }))
  }

  const addTag = (key: string, val: string) => {
    const updated = { ...selected }
    updated.permissions.meetings[key] = [...(updated.permissions.meetings[key] ?? []), val]
    setSelected(updated)
  }

  const removeTag = (key: string, i: number) => {
    const updated = { ...selected }
    updated.permissions.meetings[key] = updated.permissions.meetings[key].filter((_: string, j: number) => j !== i)
    setSelected(updated)
  }

  if (!selected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="aura-skeleton w-12 h-12 rounded-full mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  const isActive = selected.status === 'ACTIVE'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-2 block transition-colors">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Agent Settings</h1>
        </div>

        {/* Agent selector */}
        {agents.length > 1 && (
          <div className="flex gap-2">
            {agents.map(a => (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selected?.id === a.id
                    ? 'bg-aura-600 text-white shadow-sm shadow-aura-600/20'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-aura-200'
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        )}

        {/* Agent status card */}
        <div className="aura-card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-aura-100 dark:bg-aura-900/50 flex items-center justify-center text-aura-600 dark:text-aura-300 font-bold text-sm">
                {selected.name?.[0]}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{selected.name}</p>
                <p className="text-xs text-gray-400 capitalize">
                  {selected.communicationStyle} · {selected.riskTolerance}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                isActive
                  ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {selected.status?.toLowerCase()}
              </span>
              {isActive && (
                <button onClick={pauseAgent} className="aura-btn-danger text-xs px-3 py-1.5">
                  Pause
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="aura-stat">
              <p className="text-xs text-gray-400 mb-1">Reputation</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{selected.reputationScore}</p>
            </div>
            <div className="aura-stat">
              <p className="text-xs text-gray-400 mb-1">Timezone</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{selected.timezone}</p>
            </div>
          </div>
        </div>

        {/* Permissions editor */}
        <div className="aura-card">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Permission Schema</h2>
          <p className="text-sm text-gray-500 mb-5">
            Enforced onchain. Changes take effect after the next Stellar sync.
          </p>

          {[
            { key: 'canCommitTo',    label: '✅ Can commit to',    placeholder: 'e.g. schedule follow-up' },
            { key: 'cannotCommitTo', label: '🚫 Cannot commit to', placeholder: 'e.g. financial agreements' },
            { key: 'escalateIf',     label: '⚡ Always escalate if', placeholder: 'e.g. legal, equity' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="mb-5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{label}</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {((selected.permissions?.meetings?.[key] ?? []) as string[]).map((item: string, i: number) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                  >
                    {item}
                    <button
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      onClick={() => removeTag(key, i)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                className="aura-input text-xs"
                placeholder={`Add — ${placeholder} — press Enter`}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim()
                    if (val) { addTag(key, val); (e.target as HTMLInputElement).value = '' }
                  }
                }}
              />
            </div>
          ))}

          <button
            onClick={savePermissions}
            disabled={saving}
            className="aura-btn-primary w-full py-3"
          >
            {saving && <span className="aura-spinner" />}
            {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save permissions'}
          </button>
        </div>
      </div>
    </div>
  )
}
