import { SignJWT, jwtVerify } from 'jose';

// ログインセッション = HS256 署名付きトークン（jose は Edge ランタイムでも動作）。
// 平文ユーザー名のCookieはなりすまし可能なため、署名して中身の改ざんを検知する。
const secretKey = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? '');

export type Session = { username: string; name: string };

/** SSO検証後にセッショントークンを発行（有効期限24時間）。 */
export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ name: s.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.username)
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey());
}

/** セッショントークンを検証。署名・有効期限が正しい時のみ Session を返す。 */
export async function verifySession(token: string | null | undefined): Promise<Session | null> {
  if (!token || !process.env.SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    return { username: payload.sub, name: (payload.name as string) ?? payload.sub };
  } catch {
    return null;
  }
}
