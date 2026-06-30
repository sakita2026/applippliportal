import { NextRequest, NextResponse } from 'next/server';
import { verifySession, signSession, SESSION_TTL_SEC } from '@/lib/session';

// 操作中のセッション延長（スライド）。クライアント(IdleLogout)が人の操作中に定期的に叩く。
// /api/auth 配下＝middleware 対象外なので、ここで Cookie を自前で再発行する（API応答でも確実に効く）。
export async function POST(req: NextRequest) {
  const session = await verifySession(req.cookies.get('workportal_auth')?.value);
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === 'production';
  const fresh = await signSession({ username: session.username, name: session.name });
  res.cookies.set('workportal_auth', fresh, { path: '/', maxAge: SESSION_TTL_SEC, httpOnly: true, sameSite: 'lax', secure });
  res.cookies.set('workportal_user', session.username, { path: '/', maxAge: SESSION_TTL_SEC, httpOnly: false, sameSite: 'lax', secure });
  const admin = req.cookies.get('workportal_admin')?.value;
  if (admin !== undefined) {
    res.cookies.set('workportal_admin', admin, { path: '/', maxAge: SESSION_TTL_SEC, httpOnly: false, sameSite: 'lax', secure });
  }
  return res;
}
