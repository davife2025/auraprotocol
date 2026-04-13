import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import type { JSX } from 'react'

export default async function DashboardPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return <DashboardShell />
}

