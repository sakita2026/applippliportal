'use client'

import { usePathname } from 'next/navigation'
import { AppLayout } from './AppLayout'

export function ConditionalAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/login') return <>{children}</>
  return <AppLayout>{children}</AppLayout>
}
