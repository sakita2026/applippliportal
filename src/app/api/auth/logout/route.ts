import { NextRequest, NextResponse } from 'next/server';

const ORGPORTAL_URL = process.env.ORGPORTAL_URL || 'http://localhost:3100';

// WorkPortal セッションを破棄し、orgportal のセッションも終了（シングルログアウト）。
// ログアウト後は WorkPortal のログイン画面へ戻す。
export async function GET(req: NextRequest) {
  // 本番(プロキシ背後)では nextUrl.origin が内部ホスト(0.0.0.0:8080)になるため、公開URLを優先
  const origin = process.env.APP_BASE_URL || req.nextUrl.origin;
  const ret = encodeURIComponent(`${origin}/login?loggedout=1`);
  const res = NextResponse.redirect(`${ORGPORTAL_URL}/logout?return=${ret}`);
  res.cookies.set('workportal_auth', '', { path: '/', maxAge: 0 });
  return res;
}
