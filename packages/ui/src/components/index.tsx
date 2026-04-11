import React from 'react'
import { cn } from '../utils/index.js'

// ── Button ────────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-aura-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
    const variants = {
      primary:   'bg-aura-600 text-white hover:bg-aura-800',
      secondary: 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900',
      ghost:     'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
      danger:    'bg-red-600 text-white hover:bg-red-700',
    }
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

// ── Badge ─────────────────────────────────────────────────────────────────────

interface BadgeProps {
  variant?: 'active' | 'pending' | 'error' | 'neutral'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  const variants = {
    active:  'bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-100',
    pending: 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
    error:   'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100',
    neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5',
        onClick && 'cursor-pointer hover:border-aura-200 dark:hover:border-aura-700 transition-colors',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────

interface AvatarProps {
  address: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ address, size = 'md', className }: AvatarProps) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' }
  const initials = address.slice(2, 4).toUpperCase()

  return (
    <div className={cn(
      'rounded-full bg-aura-100 dark:bg-aura-900 text-aura-800 dark:text-aura-100 flex items-center justify-center font-medium',
      sizes[size],
      className
    )}>
      {initials}
    </div>
  )
}

// ── StatusDot ─────────────────────────────────────────────────────────────────

export function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={cn(
      'inline-block w-2 h-2 rounded-full',
      active ? 'bg-teal-400 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'
    )} />
  )
}
