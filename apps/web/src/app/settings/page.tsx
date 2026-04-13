'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function SettingsPage() {
  const [agents, setAgents] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('aura_token')
    if (!token) return
    fetch('/api/v1/agents', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setAgents(d.agents ?? []); if (d.agents?.[0]) setSelected(d.agents[0]) })
  }, [])

  const savePermissions = async () => {
    const token = localStorage.getItem('aura_token')
    if (!token || !selected) return
    setSaving(true)
    await fetch(`/api/v1/agents/${selected.id}/permissions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ permissions: selected.permissions }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const pauseAgent = async () => {
    const token = localStorage.getItem('aura_token')
    if (!token || !selected) return
    await fetch(`/api/v1/agents/${selected.id}/pause`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    setSelected((s: any) => ({ ...s, status: 'PAUSED' }))
  }

  if (!selected) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 mb-1 block">← Dashboard</Link>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Agent Settings</h1>
        </div>

        {/* Agent selector */}
        {agents.length > 1 && (
          <div className="flex gap-2">
            {agents.map(a => (
              <button key={a.id} onClick={() => setSelected(a)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${selected?.id === a.id ? 'bg-aura-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
                {a.name}
              </button>
            ))}
          </div>
        )}

        {/* Agent status card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-aura-100 dark:bg-aura-900 flex items-center justify-center text-aura-600 font-bold">
                {selected.name?.[0]}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{selected.name}</p>
                <p className="text-xs text-gray-400 capitalize">{selected.communicationStyle} · {selected.riskTolerance}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${selected.status === 'ACTIVE' ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                {selected.status?.toLowerCase()}
              </span>
              {selected.status === 'ACTIVE' && (
                <button onClick={pauseAgent} className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                  Pause
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-400 mb-1">Reputation</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{selected.reputationScore}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-400 mb-1">Timezone</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{selected.timezone}</p>
            </div>
          </div>
        </div>

        {/* Permissions editor */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Permission Schema</h2>
          <p className="text-sm text-gray-500 mb-5">These are enforced onchain. Changes take effect after next Monad sync.</p>
          {[
            { key: 'canCommitTo', label: 'Can commit to', placeholder: 'e.g. schedule follow-up' },
            { key: 'cannotCommitTo', label: 'Cannot commit to', placeholder: 'e.g. financial agreements' },
            { key: 'escalateIf', label: 'Always escalate if', placeholder: 'e.g. legal, equity' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{label}</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {((selected.permissions?.meetings?.[key] ?? []) as string[]).map((item: string, i: number) => (
                  <span key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                    {item}
                    <button className="text-gray-400 hover:text-red-500" onClick={() => {
                      const updated = { ...selected }
                      updated.permissions.meetings[key] = updated.permissions.meetings[key].filter((_: string, j: number) => j !== i)
                      setSelected(updated)
                    }}>×</button>
                  </span>
                ))}
              </div>
              <input className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs focus:outline-none focus:ring-1 focus:ring-aura-400"
                placeholder={`Add — ${placeholder} — press Enter`}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                    const val = (e.target as HTMLInputElement).value.trim()
                    const updated = { ...selected }
                    updated.permissions.meetings[key] = [...(updated.permissions.meetings[key] ?? []), val]
                    setSelected(updated)
                    ;(e.target as HTMLInputElement).value = ''
                  }
                }} />
            </div>
          ))}
          <button onClick={savePermissions} disabled={saving}
            className="w-full py-3 rounded-xl bg-aura-600 text-white font-medium hover:bg-aura-800 disabled:opacity-40 transition-colors">
            {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save permissions'}
          </button>
        </div>
      </div>
    </div>
  )
}
