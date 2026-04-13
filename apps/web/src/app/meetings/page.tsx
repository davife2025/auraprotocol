'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Meeting {
  id: string
  title: string
  mode: string
  status: string
  scheduledAt: string
  _count: { participants: number; commitments: number }
}

export default function MeetingsPage(): JSX.Element {
  const router = useRouter()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', agenda: '', mode: 'HYBRID', scheduledAt: '' })

  useEffect(() => {
    const token = localStorage.getItem('aura_token')
    if (!token) { router.push('/login'); return }
    fetch('/api/v1/meetings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setMeetings(d.meetings ?? []))
      .finally(() => setLoading(false))
  }, [router])

  const createMeeting = async () => {
    const token = localStorage.getItem('aura_token')!
    const res = await fetch('/api/v1/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, invitees: [], rules: { agentsCanMakeBindingCommitments: false, recordOnchain: true } }),
    })
    const { meeting } = await res.json()
    setMeetings(m => [meeting, ...m])
    setShowCreate(false)
  }

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    ACTIVE: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    SETTLED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    ENDED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 mb-1 block">← Dashboard</Link>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Meetings</h1>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-xl bg-aura-600 text-white text-sm font-medium hover:bg-aura-800 transition-colors">
            New meeting
          </button>
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create meeting</h2>
              <div className="space-y-3">
                <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-aura-400"
                  placeholder="Meeting title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                <textarea rows={2} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-aura-400 resize-none"
                  placeholder="Agenda (optional)" value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))} />
                <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none"
                  value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}>
                  <option value="HYBRID">Hybrid (agents + humans)</option>
                  <option value="FULL_AGENT">Full agent (no humans needed)</option>
                  <option value="OBSERVER">Observer (watch your agent)</option>
                </select>
                <input type="datetime-local" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none"
                  value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300">Cancel</button>
                <button onClick={createMeeting} disabled={!form.title || !form.scheduledAt} className="flex-1 py-2.5 rounded-xl bg-aura-600 text-white text-sm font-medium disabled:opacity-40">Create</button>
              </div>
            </div>
          </div>
        )}

        {/* Meeting list */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No meetings yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first meeting and let your agent attend.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map(meeting => (
              <Link key={meeting.id} href={`/meetings/${meeting.id}`} className="block bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 hover:border-aura-200 dark:hover:border-aura-700 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{meeting.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(meeting.scheduledAt).toLocaleString()} · {meeting.mode.replace('_', ' ').toLowerCase()}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${statusColors[meeting.status] ?? ''}`}>
                    {meeting.status.toLowerCase()}
                  </span>
                </div>
                <div className="flex gap-4 mt-3 text-xs text-gray-400">
                  <span>{meeting._count.participants} participants</span>
                  <span>{meeting._count.commitments} commitments</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

