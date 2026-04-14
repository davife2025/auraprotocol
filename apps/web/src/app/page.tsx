import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-aura-50 via-white to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-aura-600/5 blur-[100px]" />
      </div>

      <div className="relative max-w-2xl text-center space-y-7 animate-fade-in">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-aura-50 dark:bg-aura-900/30 border border-aura-100 dark:border-aura-800 text-sm font-medium text-aura-700 dark:text-aura-300">
          <span className="w-2 h-2 rounded-full bg-aura-500 animate-pulse-slow" />
          Built on Stellar Soroban
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-gray-900 dark:text-white leading-[1.1]">
          Your presence,{' '}
          <span className="text-aura-gradient">everywhere.</span>
        </h1>

        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
          Aura Protocol gives you a sovereign AI agent that represents you in meetings,
          networking, and commerce — simultaneously — anchored by identity on Stellar.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3 justify-center pt-1">
          <Link href="/onboarding" className="aura-btn-primary text-base px-7 py-3.5">
            Create your agent
          </Link>
          <Link
            href="/login"
            className="aura-btn-ghost text-base px-7 py-3.5"
          >
            Sign in
          </Link>
        </div>

        {/* Social proof */}
        <p className="text-xs text-gray-400 dark:text-gray-600 pt-2">
          No email required · Powered by Freighter · Identity on Stellar
        </p>
      </div>
    </main>
  )
}
