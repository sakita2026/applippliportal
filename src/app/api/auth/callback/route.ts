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

  // 注: 以前は state Cookie 照合（ログインCSRF対策）を行っていたが、メールリンク経由ログインや
  // 複数タブ起動で Cookie 不在/不一致となり正規ログインが弾かれるため撤去。SSO トークン自体の
  // 署名・issuer/audience・有効期限(10分)検証で正当性を担保する。
  const payload = await verifyAppToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', origin));
  }

  const res = NextResponse.redirect(new URL('/dashboard', origin));
  // 旧仕様で残っている可能性のある wp_sso_state Cookie を掃除（現在は未使用）
  res.cookies.set('wp_sso_state', '', { path: '/', maxAge: 0 });
  // セッション本体：HMAC署名付きトークン（改ざん・なりすまし防止）。JSからは読めない。
  const session = await signSession({ username: payload.username, name: payload.name });
  // 本番(HTTPS)では secure を付与。ローカル開発(http)では false にして送信できるようにする。
  const secure = process.env.NODE_ENV === 'production';
  // maxAge/expires を付けない＝セッションCookie。ブラウザを閉じると破棄され、再ログインが必要になる。
  res.cookies.set('workportal_auth', session, {
    path: '/', sameSite: 'lax', httpOnly: true, secure,
  });
  // 表示用（画面に氏名を出すだけ。認証には一切使わない＝信頼しない）
  res.cookies.set('workportal_user', payload.username, {
    path: '/', sameSite: 'lax', httpOnly: false, secure,
  });
  // 表示用：システム管理者(orgportal isSuperAdmin)か。組織管理メニューの出し分けにのみ使う。
  // クライアントが書き換えても表示が変わるだけで、orgportal /admin は server 側で isSuperAdmin を強制する。
  res.cookies.set('workportal_admin', payload.isSuperAdmin ? '1' : '0', {
    path: '/', sameSite: 'lax', httpOnly: false, secure,
  });
  return res;
}
