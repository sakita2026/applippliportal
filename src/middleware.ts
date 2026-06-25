import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ORGPORTAL_URL = process.env.ORGPORTAL_URL || 'http://localhost:3100'

export function middleware(request: NextRequest) {
  const auth = request.cookies.get('workportal_auth')

  // /login は SSO 対象外（no_access 等のエラー表示用。ここを除外しないと無限リダイレクトになる）
  if (request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.next()
  }

  // 未ログインは orgportal のSSOへ委譲（ログイン後 /api/auth/callback に戻る）
  if (!auth) {
    const origin = request.nextUrl.origin
    const ret = encodeURIComponent(`${origin}/api/auth/callback`)
    return NextResponse.redirect(`${ORGPORTAL_URL}/authorize?app=workportal&return=${ret}`)
  }

  return NextResponse.next()
}

export const config = {
  // /api/auth/callback と静的アセットは除外
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
