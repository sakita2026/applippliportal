import { importSPKI, jwtVerify } from 'jose';

const PUB_PEM = Buffer.from(process.env.ORG_JWT_PUBLIC_KEY_B64 ?? '', 'base64').toString('utf8');

export type AppTokenPayload = { username: string; name: string; perms: string[] };

/** orgportal が発行した RS256 トークンを公開鍵で検証 */
export async function verifyAppToken(token: string): Promise<AppTokenPayload | null> {
  try {
    const key = await importSPKI(PUB_PEM, 'RS256');
    const { payload } = await jwtVerify(token, key, { issuer: 'orgportal', audience: 'workportal' });
    if (!payload.sub) return null;
    return {
      username: payload.sub,
      name: (payload.name as string) ?? payload.sub,
      perms: Array.isArray(payload.perms) ? (payload.perms as string[]) : [],
    };
  } catch {
    return null;
  }
}
