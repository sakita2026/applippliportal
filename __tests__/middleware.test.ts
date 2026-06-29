/**
 * src/middleware.ts のルート保護ロジックのユニットテスト
 *
 * セッションは署名付きトークン（verifySession）で検証する。
 * verifySession をモックし、middleware の分岐（通過 / SSOリダイレクト / API 401）を検証する。
 */

import { middleware } from '@/middleware';

// verifySession: cookie 値が 'valid' の時だけ正当なセッションを返す
jest.mock('@/lib/session', () => ({
  verifySession: jest.fn(async (token?: string | null) =>
    token === 'valid' ? { username: 'arita-h', name: '有田' } : null,
  ),
}));

function makeRequest(pathname: string, cookieValue: string | null): Parameters<typeof middleware>[0] {
  const url = `http://localhost:3000${pathname}`;
  return {
    cookies: {
      get: (name: string) =>
        name === 'workportal_auth' && cookieValue ? { name, value: cookieValue } : undefined,
    },
    headers: new Headers(),
    nextUrl: new URL(url),
    url,
  } as unknown as Parameters<typeof middleware>[0];
}

const mockRedirectFn = jest.fn();
const mockNextFn = jest.fn();
const mockJsonFn = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (dest: string) => {
      mockRedirectFn(dest);
      return { type: 'redirect', destination: dest };
    },
    next: (init?: unknown) => {
      mockNextFn(init);
      return { type: 'next' };
    },
    json: (body: unknown, init?: { status?: number }) => {
      mockJsonFn(body, init?.status);
      return { type: 'json', status: init?.status, body };
    },
  },
}));

describe('middleware — ルート保護ロジック（署名付きセッション）', () => {
  beforeEach(() => {
    mockRedirectFn.mockClear();
    mockNextFn.mockClear();
    mockJsonFn.mockClear();
  });

  describe('未認証（無効/欠落トークン）', () => {
    it('保護ページ (/dashboard) は SSO(authorize) へリダイレクトされる', async () => {
      await middleware(makeRequest('/dashboard', null));
      expect(mockRedirectFn).toHaveBeenCalledTimes(1);
      expect(mockRedirectFn.mock.calls[0][0]).toContain('/authorize');
      expect(mockNextFn).not.toHaveBeenCalled();
    });

    it('偽装/不正トークンでも通過できない（SSOへ）', async () => {
      await middleware(makeRequest('/dashboard', 'garbage_xyz'));
      expect(mockRedirectFn).toHaveBeenCalledTimes(1);
      expect(mockNextFn).not.toHaveBeenCalled();
    });

    it('API (/api/decisions) は 401 を返す（リダイレクトしない）', async () => {
      await middleware(makeRequest('/api/decisions', null));
      expect(mockJsonFn).toHaveBeenCalledWith(expect.anything(), 401);
      expect(mockRedirectFn).not.toHaveBeenCalled();
      expect(mockNextFn).not.toHaveBeenCalled();
    });
  });

  describe('認証済み（有効トークン）', () => {
    it('保護ページに通過し、検証済みユーザー名をヘッダに付与する', async () => {
      await middleware(makeRequest('/dashboard', 'valid'));
      expect(mockRedirectFn).not.toHaveBeenCalled();
      expect(mockNextFn).toHaveBeenCalledTimes(1);
      const init = mockNextFn.mock.calls[0][0] as { request: { headers: Headers } };
      expect(init.request.headers.get('x-wp-user')).toBe('arita-h');
    });

    it('API も通過する', async () => {
      await middleware(makeRequest('/api/decisions', 'valid'));
      expect(mockJsonFn).not.toHaveBeenCalled();
      expect(mockNextFn).toHaveBeenCalledTimes(1);
    });

    it('クライアントが偽装した x-wp-user ヘッダは上書き/削除される', async () => {
      const req = makeRequest('/dashboard', 'valid');
      (req.headers as Headers).set('x-wp-user', 'admin-spoof');
      await middleware(req);
      const init = mockNextFn.mock.calls[0][0] as { request: { headers: Headers } };
      expect(init.request.headers.get('x-wp-user')).toBe('arita-h');
    });
  });
});
