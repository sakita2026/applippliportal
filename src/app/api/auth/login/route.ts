import { NextRequest, NextResponse } from 'next/server'
import { findUser } from '@/lib/users'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  const user = findUser(username, password)
  if (!user) {
    return NextResponse.json({ error: 'ユーザー名またはパスワードが違います' }, { status: 401 })
  }
  const res = NextResponse.json({ username: user.username, name: user.name })
  res.cookies.set('workportal_auth', user.username, {
    path: '/',
    maxAge: 86400,
    sameSite: 'lax',
    httpOnly: false,
  })
  return res
}
