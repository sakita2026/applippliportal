export type UserRole = 'admin' | 'member'

/** 認証方式: password = 従来のパスワード, email = パスワードレス（マジックリンク） */
export type AuthType = 'password' | 'email'

export type AppUser = {
  id: string
  username: string
  password: string
  name: string
  initials: string
  role: UserRole
  departmentId: string | null
  email: string | null
  authType: AuthType
}

export const USERS: AppUser[] = [
  { id: 'admin', username: 'admin', password: 'admin', name: '管理者', initials: '管', role: 'admin', departmentId: 'general', email: null, authType: 'password' },
  { id: 'kanri', username: 'kanri', password: 'kanri', name: '山田', initials: '山', role: 'member', departmentId: 'sales', email: null, authType: 'password' },
  { id: 'arita-h', username: 'arita-h', password: '', name: '有田', initials: '有', role: 'admin', departmentId: 'general', email: 'arita@applippli.co.jp', authType: 'email' },
]

/** パスワードログイン（authType=password のユーザーのみ許可） */
export function findUser(username: string, password: string): AppUser | undefined {
  return USERS.find((u) => u.authType === 'password' && u.username === username && u.password === password)
}

export function getUserByUsername(username: string): AppUser | undefined {
  return USERS.find((u) => u.username === username)
}

/** メールアドレスからメール認証ユーザーを引く（大文字小文字を無視） */
export function findUserByEmail(email: string): AppUser | undefined {
  const normalized = email.trim().toLowerCase()
  return USERS.find((u) => u.authType === 'email' && u.email?.toLowerCase() === normalized)
}

export function isAdmin(username: string | null | undefined): boolean {
  if (!username) return false
  return getUserByUsername(username)?.role === 'admin'
}

export function getUserName(username: string | null | undefined): string {
  if (!username) return '未割当'
  return getUserByUsername(username)?.name ?? username
}
