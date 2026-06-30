import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession } from '@/lib/session'

const ORGPORTAL_URL = process.env.ORGPORTAL_URL || 'http://localhost:3100'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const session = await verifySession(request.cookies.get('workportal_auth')?.value)

  // クライアントが x-wp-user を偽装して送ってきても無効化（常に上書き／削除）
  const headers = new Headers(request.headers)
  headers.delete('x-wp-user')

  if (session) {
    // 検証済みのユーザー名のみを下流ハンドラへ渡す（信頼できる本人情報）
    headers.set('x-wp-user', session.username)
    return NextResponse.next({ request: { headers } })
  }

  // 未認証：API は 401、ページは SSO へリダイレクト
  if (path.startsWith('/api/')) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }
  // 本番(プロキシ背後)では request.nextUrl.origin が内部ホストになるため、公開URLを優先
  const origin = process.env.APP_BASE_URL || request.nextUrl.origin
  const ret = encodeURIComponent(`${origin}/api/auth/callback`)
  // 注: 以前は state（CSRF対策）Cookie を発行していたが、メールリンク経由ログイン（別ブラウザ/メールアプリ内
  // ブラウザで開く）や複数タブ同時起動で Cookie が不在/上書きになり、正規ログインが弾かれる事象が多発したため撤去。
  return NextResponse.redirect(`${ORGPORTAL_URL}/authorize?app=workportal&return=${ret}`)
}

export const config = {
  // /api/auth/*（SSO入口）・/login・静的アセットは認証対象外。
  // それ以外の /api/* も含めて中央でセッションを検証する。
  matcher: ['/((?!api/auth|login|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
