'use client'

import { useMemo } from 'react'
import { useStore } from './store'
import { USERS } from './users'
import type { Member } from '@/types'

function getCookieUsername(): string | null {
  if (typeof document === 'undefined') return null
  // 表示用Cookie。認証はサーバ側の署名付き workportal_auth で行うため、これは氏名表示のためだけに使う。
  const match = document.cookie.split('; ').find((c) => c.startsWith('workportal_user='))
  return match?.split('=')[1] ?? null
}

/**
 * ログイン中ユーザーを返す。DB メンバー（store）を優先し、
 * 無ければコード定数（既存の admin/kanri/arita-h）にフォールバック。
 */
export function useCurrentUser(): Member | null {
  const { state } = useStore()
  return useMemo(() => {
    const username = getCookieUsername()
    if (!username) return null
    const member = state.members.find((m) => m.username === username)
    if (member) return member
    const u = USERS.find((x) => x.username === username)
    if (!u) return null
    // 定数ユーザーを Member 形に正規化
    return {
      id: u.id,
      username: u.username,
      name: u.name,
      initials: u.initials,
      email: u.email,
      authType: u.authType,
      role: u.role,
      departmentId: u.departmentId,
      position: null,
      isDirector: false,
      isRepresentative: false,
      isAdvisor: false,
      active: true,
    }
  }, [state.members])
}
