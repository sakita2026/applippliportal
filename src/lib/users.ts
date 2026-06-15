export type AppUser = {
  id: string
  username: string
  password: string
  name: string
  initials: string
}

export const USERS: AppUser[] = [
  { id: 'admin', username: 'admin', password: 'admin', name: '管理者', initials: '管' },
  { id: 'kanri', username: 'kanri', password: 'kanri', name: '山田', initials: '山' },
]

export function findUser(username: string, password: string): AppUser | undefined {
  return USERS.find((u) => u.username === username && u.password === password)
}

export function getUserByUsername(username: string): AppUser | undefined {
  return USERS.find((u) => u.username === username)
}
