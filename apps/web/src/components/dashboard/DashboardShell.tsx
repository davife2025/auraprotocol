'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useStellarWallet } from '@/components/ui/Providers'
import { truncateStellarAddress } from '@/lib/stellar'

interface Agent { id: string; name: string; status: string; reputationScore: number; _count?: { memories: number; meetingParticipants: number } }
interface Meeting { id: string; title: string; status: string; scheduledAt: string; mode: string }
interface Connection { id: string; initiator: { name: string }; receiver: { name: string }; alignmentScore: number; _count: { chatMessages: number } }

export function DashboardShell() {
  const { publicKey, disconnect } = useStellarWallet()
  const [agents, setAgents] = useState<Agent[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('aura_token')
    if (!token) { setLoading(false); return }
    const h = { Authorization: `Bearer ${token}` }
    Promise.all([
      fetch('/api/v1/agents', { headers: h }).then(r => r.json()).catch(() => ({ agents: [] })),
      fetch('/api/v1/meetings', { headers: h }).then(r => r.json()).catch(() => ({ meetings: [] })),
      fetch('/api/v1/rooms/connections', { headers: h }).then(r => r.json()).catch(() => []),
    ]).then(([a, m, c]) => {
      setAgents(a.agents ?? [])
      setMeetings((m.meetings ?? []).slice(0, 5))
      setConnections((Array.isArray(c) ? c : []).slice(0, 5))
    }).finally(() => setLoading(false))
  }, [])

  const primaryAgent = agents[0]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="sticky top-0 z-10 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-aura-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">Aura Protocol</span>
        </div>
        <div className="flex items-center gap-4">
          {['Meetings', 'Rooms', 'Settings'].map(page => (
            <Link key={page} href={`/${page.toLowerCase()}`} className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">{page}</Link>
          ))}
          {primaryAgent && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-900/30">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-xs text-teal-700 dark:text-teal-300 font-medium">{primaryAgent.name} active</span>
            </div>
          )}
          {publicKey && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-mono hidden sm:block">{truncateStellarAddress(publicKey, 4)}</span>
              <button onClick={disconnect} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">Sign out</button>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            {primaryAgent ? `${primaryAgent.name} is representing you.` : 'Create your agent to get started.'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active meetings', value: meetings.filter(m => m.status === 'ACTIVE').length },
            { label: 'Connections', value: connections.length },
            { label: 'Reputation', value: primaryAgent?.reputationScore ?? '—' },
            { label: 'Memories', value: primaryAgent?._count?.memories ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meetings panel */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Meetings</h2>
              <Link href="/meetings" className="text-xs text-aura-600 hover:text-aura-800">View all →</Link>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
            ) : meetings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No meetings yet</p>
                <Link href="/meetings" className="text-xs text-aura-600 mt-1 inline-block">Create one →</Link>
              </div>
            ) : meetings.map(m => (
              <Link key={m.id} href={`/meetings/${m.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-aura-600 transition-colors">{m.title}</p>
                  <p className="text-xs text-gray-400">{new Date(m.scheduledAt).toLocaleString()}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.status === 'ACTIVE' ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
                  {m.status.toLowerCase()}
                </span>
              </Link>
            ))}
          </div>

          {/* Connections panel */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Agent connections</h2>
              <Link href="/rooms" className="text-xs text-aura-600 hover:text-aura-800">Find more →</Link>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
            ) : connections.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No connections yet</p>
                <Link href="/rooms" className="text-xs text-aura-600 mt-1 inline-block">Send agent to a room →</Link>
              </div>
            ) : connections.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{c.initiator.name} ↔ {c.receiver.name}</p>
                  <p className="text-xs text-gray-400">{c._count.chatMessages} messages · {c.alignmentScore}% alignment</p>
                </div>
                <span className="text-xs font-bold text-aura-600 bg-aura-50 dark:bg-aura-900/30 w-8 h-8 rounded-full flex items-center justify-center">
                  {c.alignmentScore}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Agents */}
        {agents.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Your agents</h2>
              <Link href="/settings" className="text-xs text-aura-600 hover:text-aura-800">Manage →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map(agent => (
                <div key={agent.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-aura-100 dark:bg-aura-900/50 flex items-center justify-center text-aura-600 font-bold text-sm shrink-0">
                    {agent.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{agent.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'ACTIVE' ? 'bg-teal-400' : 'bg-gray-400'}`} />
                      <p className="text-xs text-gray-400 capitalize">{agent.status?.toLowerCase()} · {agent.reputationScore} rep</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No agent CTA */}
        {!loading && agents.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="w-14 h-14 rounded-full bg-aura-100 dark:bg-aura-900/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-aura-600">A</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create your Aura agent</h2>
            <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">Your agent will represent you in meetings, network on your behalf, and build connections 24/7.</p>
            <Link href="/onboarding" className="mt-5 inline-block px-6 py-3 rounded-xl bg-aura-600 text-white font-medium hover:bg-aura-800 transition-colors">
              Get started
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
