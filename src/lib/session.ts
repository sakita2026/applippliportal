import { SignJWT, jwtVerify } from 'jose';

// ログインセッション = HS256 署名付きトークン（jose は Edge ランタイムでも動作）。
// 平文ユーザー名のCookieはなりすまし可能なため、署名して中身の改ざんを検知する。
const secretKey = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? '');

// アイドルタイムアウト（無操作）= 300分。最後の操作から this 秒で失効。
// middleware が操作のたびにトークン/Cookie を再発行してスライド（延長）する。
export const SESSION_TTL_SEC = 300 * 60;

export type Session = { username: string; name: string };

/** SSO検証後／操作ごとにセッショントークンを発行（発行時点から SESSION_TTL_SEC で失効）。 */
export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ name: s.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.username)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_TTL_SEC)
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
