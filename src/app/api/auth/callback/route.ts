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

  // ログインCSRF対策：state（middleware が発行した Cookie）と照合。
  // 攻撃者が用意したトークンを被害者に踏ませても、被害者の Cookie に一致する state は持てないため失敗する。
  const state = req.nextUrl.searchParams.get('state');
  const expectedState = req.cookies.get('wp_sso_state')?.value;
  if (!expectedState || !state || state !== expectedState) {
    return NextResponse.redirect(new URL('/login?error=bad_state', origin));
  }

  const payload = await verifyAppToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', origin));
  }

  const res = NextResponse.redirect(new URL('/dashboard', origin));
  // 使い終えた state Cookie は破棄（単回使用）
  res.cookies.set('wp_sso_state', '', { path: '/', maxAge: 0 });
  // セッション本体：HMAC署名付きトークン（改ざん・なりすまし防止）。JSからは読めない。
  const session = await signSession({ username: payload.username, name: payload.name });
  // 本番(HTTPS)では secure を付与。ローカル開発(http)では false にして送信できるようにする。
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set('workportal_auth', session, {
    path: '/', maxAge: 86400, sameSite: 'lax', httpOnly: true, secure,
  });
  // 表示用（画面に氏名を出すだけ。認証には一切使わない＝信頼しない）
  res.cookies.set('workportal_user', payload.username, {
    path: '/', maxAge: 86400, sameSite: 'lax', httpOnly: false, secure,
  });
  // 表示用：システム管理者(orgportal isSuperAdmin)か。組織管理メニューの出し分けにのみ使う。
  // クライアントが書き換えても表示が変わるだけで、orgportal /admin は server 側で isSuperAdmin を強制する。
  res.cookies.set('workportal_admin', payload.isSuperAdmin ? '1' : '0', {
    path: '/', maxAge: 86400, sameSite: 'lax', httpOnly: false, secure,
  });
  return res;
}
