import { NextRequest, NextResponse } from 'next/server';
import { verifyAppToken } from '@/lib/sso';

// orgportal からのSSOコールバック：トークン検証 → WorkPortalセッション発行
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
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
  // 既存コードと互換：ユーザー名をクッキーに保持
  res.cookies.set('workportal_auth', payload.username, {
    path: '/', maxAge: 86400, sameSite: 'lax', httpOnly: false,
  });
  return res;
}
