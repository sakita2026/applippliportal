'use client'

import { usePathname } from 'next/navigation'
import { AppLayout } from './AppLayout'
import { IdleLogout } from '@/components/IdleLogout'

export function ConditionalAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/login') return <>{children}</>
  // 認証ページでは無操作300分の自動ログアウトを常駐させる
  return <AppLayout><IdleLogout />{children}</AppLayout>
}
