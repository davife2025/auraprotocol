'use client'

import { useSession } from 'next-auth/react'

export function DashboardShell() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-aura-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">Aura Protocol</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 rounded-full bg-teal-400" />
          Agent active
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Live sessions */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Live now</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LiveSessionCard
              title="Q2 Partnership Discussion"
              duration="14 mins"
              status="active"
            />
            <LiveSessionCard
              title="Product Feedback Call"
              duration="32 mins"
              status="active"
            />
            <LiveSessionCard
              title="Supplier Negotiation"
              duration="Starts in 8 mins"
              status="pending"
            />
          </div>
        </section>

        {/* Pending review */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Pending your review</h2>
          <div className="space-y-3">
            <ReviewCard
              text="Your agent committed to a follow-up demo on Thursday"
              meeting="Q2 Partnership Discussion"
            />
            <ReviewCard
              text="Meeting summary from Legal Debrief is ready"
              meeting="Legal Debrief"
            />
          </div>
        </section>

        {/* Stats row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Meetings today" value="3" />
          <StatCard label="Connections made" value="12" />
          <StatCard label="Commitments kept" value="98%" />
          <StatCard label="Reputation score" value="94" />
        </section>
      </div>
    </div>
  )
}

function LiveSessionCard({ title, duration, status }: { title: string; duration: string; status: 'active' | 'pending' }) {
  return (
    <div className="aura-card">
      <div className="flex items-start justify-between mb-3">
        <span className={status === 'active' ? 'aura-badge-active' : 'aura-badge-pending'}>
          <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-teal-500' : 'bg-amber-500'}`} />
          {status === 'active' ? 'Live' : 'Upcoming'}
        </span>
      </div>
      <p className="font-medium text-gray-900 dark:text-white text-sm mb-1">{title}</p>
      <p className="text-xs text-gray-400">{duration}</p>
    </div>
  )
}

function ReviewCard({ text, meeting }: { text: string; meeting: string }) {
  return (
    <div className="aura-card flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-gray-700 dark:text-gray-300">{text}</p>
        <p className="text-xs text-gray-400 mt-0.5">From: {meeting}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button className="px-3 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs font-medium hover:bg-teal-100 transition-colors">
          Approve
        </button>
        <button className="px-3 py-1 rounded-lg bg-gray-50 text-gray-600 text-xs font-medium hover:bg-gray-100 transition-colors">
          Review
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}
