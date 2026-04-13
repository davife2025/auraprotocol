'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Message {
  id: string
  role: 'agent' | 'human' | 'system'
  agentName?: string
  content: string
  createdAt: string
  isBinding?: boolean
}

interface Commitment {
  id: string
  description: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'FULFILLED'
  madeBy: { name: string }
  createdAt: string
}

interface Participant {
  id: string
  agent: { id: string; name: string; reputationScore: number }
  joinedAt: string
}

interface Meeting {
  id: string
  title: string
  agenda?: string
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'SETTLED'
  mode: string
  scheduledAt: string
  messages: Message[]
  commitments: Commitment[]
  participants: Participant[]
  rules?: {
    agentsCanMakeBindingCommitments: boolean
    recordOnchain: boolean
  }
}

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  ACTIVE: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  ENDED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  SETTLED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

const COMMITMENT_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  ACCEPTED: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  REJECTED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  FULFILLED: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'transcript' | 'commitments' | 'participants'>('transcript')
  const [ending, setEnding] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = localStorage.getItem('aura_token')
    if (!token) { router.push('/login'); return }
    fetch(`/api/v1/meetings/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setMeeting(d.meeting ?? d))
      .finally(() => setLoading(false))
  }, [id, router])

  useEffect(() => {
    if (meeting?.status === 'ACTIVE') {
      const token = localStorage.getItem('aura_token')
      if (!token) return
      const interval = setInterval(() => {
        fetch(`/api/v1/meetings/${id}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(d => setMeeting(d.meeting ?? d))
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [meeting?.status, id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [meeting?.messages])

  const endMeeting = async () => {
    const token = localStorage.getItem('aura_token')
    if (!token || !meeting) return
    setEnding(true)
    await fetch(`/api/v1/meetings/${id}/end`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    setMeeting(m => m ? { ...m, status: 'ENDED' } : m)
    setEnding(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-aura-600/30 border-t-aura-600 rounded-full animate-spin" />
    </div>
  )

  if (!meeting) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400 mb-3">Meeting not found</p>
        <Link href="/meetings" className="text-aura-600 text-sm">← Back to meetings</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-6">
          <Link href="/meetings" className="text-sm text-gray-400 hover:text-gray-600 mb-2 block">← Meetings</Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{meeting.title}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[meeting.status] ?? ''}`}>
                  {meeting.status === 'ACTIVE' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse mr-1.5" />}
                  {meeting.status.toLowerCase()}
                </span>
              </div>
              <p className="text-sm text-gray-400">
                {new Date(meeting.scheduledAt).toLocaleString()} · {meeting.mode.replace('_', ' ').toLowerCase()}
              </p>
              {meeting.agenda && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{meeting.agenda}</p>}
            </div>
            {meeting.status === 'ACTIVE' && (
              <button onClick={endMeeting} disabled={ending}
                className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 transition-colors">
                {ending ? 'Ending...' : 'End meeting'}
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Participants', value: meeting.participants.length },
            { label: 'Messages', value: meeting.messages.length },
            { label: 'Commitments', value: meeting.commitments.length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 text-center">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-1 w-fit">
          {(['transcript', 'commitments', 'participants'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {tab}
              {tab === 'commitments' && meeting.commitments.length > 0 && (
                <span className="ml-1.5 text-xs bg-aura-100 dark:bg-aura-900/50 text-aura-700 dark:text-aura-300 px-1.5 py-0.5 rounded-full">
                  {meeting.commitments.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Transcript */}
        {activeTab === 'transcript' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            {meeting.messages.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-gray-400">
                  {meeting.status === 'SCHEDULED' ? 'Meeting hasn\'t started yet.' : 'No messages yet.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-[600px] overflow-y-auto">
                {meeting.messages.map(msg => (
                  <div key={msg.id} className={`p-4 ${msg.role === 'system' ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                    {msg.role === 'system' ? (
                      <p className="text-xs text-gray-400 text-center italic">{msg.content}</p>
                    ) : (
                      <div className="flex gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5
                          ${msg.role === 'agent' ? 'bg-aura-100 dark:bg-aura-900/50 text-aura-700 dark:text-aura-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                          {msg.agentName?.[0]?.toUpperCase() ?? (msg.role === 'agent' ? 'A' : 'H')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{msg.agentName ?? msg.role}</span>
                            {msg.isBinding && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">binding</span>
                            )}
                            <span className="text-xs text-gray-400 ml-auto">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        )}

        {/* Commitments */}
        {activeTab === 'commitments' && (
          <div className="space-y-3">
            {meeting.commitments.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 py-16 text-center">
                <p className="text-gray-400">No commitments made yet.</p>
              </div>
            ) : meeting.commitments.map(c => (
              <div key={c.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{c.description}</p>
                    <p className="text-xs text-gray-400">by {c.madeBy.name} · {new Date(c.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${COMMITMENT_STYLES[c.status] ?? ''}`}>
                    {c.status.toLowerCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Participants */}
        {activeTab === 'participants' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {meeting.participants.length === 0 ? (
              <div className="col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 py-16 text-center">
                <p className="text-gray-400">No participants yet.</p>
              </div>
            ) : meeting.participants.map(p => (
              <div key={p.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-aura-100 dark:bg-aura-900/50 flex items-center justify-center text-aura-600 font-bold text-sm shrink-0">
                  {p.agent.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{p.agent.name}</p>
                  <p className="text-xs text-gray-400">{p.agent.reputationScore} rep · joined {new Date(p.joinedAt).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
