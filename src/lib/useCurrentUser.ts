'use client'

import { useMemo } from 'react'
import { USERS, type AppUser } from './users'

export function useCurrentUser(): AppUser | null {
  return useMemo(() => {
    if (typeof document === 'undefined') return null
    const match = document.cookie.split('; ').find((c) => c.startsWith('workportal_auth='))
    const username = match?.split('=')[1]
    if (!username) return null
    return USERS.find((u) => u.username === username) ?? null
  }, [])
}
