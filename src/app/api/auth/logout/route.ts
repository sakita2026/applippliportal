import { NextRequest, NextResponse } from 'next/server';

const ORGPORTAL_URL = process.env.ORGPORTAL_URL || 'http://localhost:3100';

// WorkPortal セッションを破棄し、orgportal のセッションも終了（シングルログアウト）。
// ログアウト後は WorkPortal のログイン画面へ戻す。
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const ret = encodeURIComponent(`${origin}/login?loggedout=1`);
  const res = NextResponse.redirect(`${ORGPORTAL_URL}/logout?return=${ret}`);
  res.cookies.set('workportal_auth', '', { path: '/', maxAge: 0 });
  return res;
}
