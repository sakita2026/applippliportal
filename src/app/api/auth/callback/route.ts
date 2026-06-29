import { NextRequest, NextResponse } from 'next/server';
import { verifyAppToken } from '@/lib/sso';
import { signSession } from '@/lib/session';

// orgportal からのSSOコールバック：トークン検証 → WorkPortalセッション発行
export async function GET(req: NextRequest) {
  // 本番(プロキシ背後)では nextUrl.origin が内部ホスト(0.0.0.0:8080)になるため、公開URLを優先
  const origin = process.env.APP_BASE_URL || req.nextUrl.origin;
  const error = req.nextUrl.searchParams.get('error');
  const token = req.nextUrl.searchParams.get('token');

  if (error === 'no_access') {
    return NextResponse.redirect(new URL('/login?error=no_access', origin));
  }
  if (!token) {
    return NextResponse.redirect(new URL('/login?error=no_token', origin));
  }

  const payload = await verifyAppToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', origin));
  }

  const res = NextResponse.redirect(new URL('/dashboard', origin));
  // セッション本体：HMAC署名付きトークン（改ざん・なりすまし防止）。JSからは読めない。
  const session = await signSession({ username: payload.username, name: payload.name });
  res.cookies.set('workportal_auth', session, {
    path: '/', maxAge: 86400, sameSite: 'lax', httpOnly: true,
  });
  // 表示用（画面に氏名を出すだけ。認証には一切使わない＝信頼しない）
  res.cookies.set('workportal_user', payload.username, {
    path: '/', maxAge: 86400, sameSite: 'lax', httpOnly: false,
  });
  // 表示用：システム管理者(orgportal isSuperAdmin)か。組織管理メニューの出し分けにのみ使う。
  // クライアントが書き換えても表示が変わるだけで、orgportal /admin は server 側で isSuperAdmin を強制する。
  res.cookies.set('workportal_admin', payload.isSuperAdmin ? '1' : '0', {
    path: '/', maxAge: 86400, sameSite: 'lax', httpOnly: false,
  });
  return res;
}
