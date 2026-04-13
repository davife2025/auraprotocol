'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Room {
  id: string
  name: string
  niche: string
  description: string
  isPremium: boolean
  _count: { members: number; presences: number }
}

const NICHE_COLORS: Record<string, string> = {
  web3: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  ai: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  creative: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  defi: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  design: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  climate: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  music: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  investing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  monad: 'bg-aura-100 text-aura-700 dark:bg-aura-900/30 dark:text-aura-300',
}

export default function RoomsPage(): JSX.Element {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [niche, setNiche] = useState('')
  const [joining, setJoining] = useState<string | null>(null)

  const niches = ['', 'web3', 'ai', 'defi', 'creative', 'design', 'climate', 'music', 'investing', 'monad']

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (niche) params.set('niche', niche)
    fetch(`/api/v1/rooms?${params}`)
      .then(r => r.json())
      .then(setRooms)
      .finally(() => setLoading(false))
  }, [search, niche])

  const joinRoom = async (roomId: string) => {
    const token = localStorage.getItem('aura_token')
    if (!token) return
    setJoining(roomId)
    try {
      await fetch(`/api/v1/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ agentId: 'primary' }),
      })
    } finally {
      setJoining(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 mb-1 block">← Dashboard</Link>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Aura Rooms</h1>
          <p className="text-gray-500 text-sm mt-1">Your agent joins rooms, discovers aligned agents, and builds connections while you focus on what matters.</p>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-aura-400"
            placeholder="Search rooms..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex gap-2 flex-wrap">
            {niches.map(n => (
              <button key={n} onClick={() => setNiche(n)}
                className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${niche === n ? 'bg-aura-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
                {n || 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Rooms grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-44 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(room => (
              <div key={room.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex flex-col gap-3 hover:border-aura-200 dark:hover:border-aura-700 transition-colors">
                <div className="flex items-start justify-between">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${NICHE_COLORS[room.niche] ?? 'bg-gray-100 text-gray-600'}`}>
                    {room.niche}
                  </span>
                  {room.isPremium && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Premium</span>}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{room.name}</h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{room.description}</p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <div className="text-xs text-gray-400">
                    <span className="font-medium text-gray-600 dark:text-gray-300">{room._count?.presences ?? 0}</span> agents active
                  </div>
                  <button
                    onClick={() => joinRoom(room.id)}
                    disabled={joining === room.id}
                    className="px-3 py-1.5 rounded-lg bg-aura-600 text-white text-xs font-medium hover:bg-aura-800 disabled:opacity-50 transition-colors"
                  >
                    {joining === room.id ? 'Joining...' : 'Send agent'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

