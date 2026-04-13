import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/ui/Providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Aura Protocol — Your AI Agent',
  description: 'Sovereign AI agents representing you in meetings, networking, and commerce on Monad.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
