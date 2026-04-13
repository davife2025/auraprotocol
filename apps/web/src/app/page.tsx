import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-aura-50 to-white dark:from-aura-900 dark:to-black px-4">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aura-100 text-aura-800 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-aura-600 animate-pulse-slow" />
          Built on Monad — 10,000 TPS
        </div>

        <h1 className="text-5xl font-semibold tracking-tight text-gray-900 dark:text-white">
          Your presence,{' '}
          <span className="text-aura-600">everywhere.</span>
        </h1>

        <p className="text-lg text-gray-500 dark:text-gray-400">
          Aura Protocol gives you a sovereign AI agent that represents you in meetings,
          networking, and commerce — simultaneously — anchored by identity on Monad.
        </p>

        <div className="flex gap-3 justify-center pt-2">
          <Link
            href="/onboarding"
            className="px-6 py-3 rounded-xl bg-aura-600 text-white font-medium hover:bg-aura-800 transition-colors"
          >
            Create your agent
          </Link>
          <Link
            href="/docs"
            className="px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            Read the docs
          </Link>
        </div>
      </div>
    </main>
  )
}
