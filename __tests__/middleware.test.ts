/**
 * src/middleware.ts のルート保護ロジックのユニットテスト
 *
 * Next.js の NextRequest / NextResponse を最小限のモックで再現し、
 * middleware 関数の分岐を検証する。
 */

import { middleware } from '@/middleware';

// ---------------------------------------------------------------------------
// NextRequest / NextResponse の最小モック
// ---------------------------------------------------------------------------

function makeRequest(pathname: string, hasCookie: boolean): Parameters<typeof middleware>[0] {
  const url = `http://localhost:3000${pathname}`;

  const cookies = {
    get: (name: string) =>
      name === 'workportal_auth' && hasCookie
        ? { name: 'workportal_auth', value: 'token123' }
        : undefined,
  };

  return {
    cookies,
    nextUrl: new URL(url),
    url,
  } as unknown as Parameters<typeof middleware>[0];
}

// NextResponse のスパイ用モック
const mockRedirectFn = jest.fn();
const mockNextFn = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: URL) => {
      mockRedirectFn(url.pathname);
      return { type: 'redirect', destination: url.pathname };
    },
    next: () => {
      mockNextFn();
      return { type: 'next' };
    },
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('middleware — ルート保護ロジック', () => {
  beforeEach(() => {
    mockRedirectFn.mockClear();
    mockNextFn.mockClear();
  });

  describe('未認証ユーザー (cookie なし)', () => {
    it('保護されたページ (/dashboard) にアクセスすると /login にリダイレクトされる', () => {
      const req = makeRequest('/dashboard', false);
      middleware(req);
      expect(mockRedirectFn).toHaveBeenCalledWith('/login');
      expect(mockNextFn).not.toHaveBeenCalled();
    });

    it('保護されたページ (/todos) にアクセスすると /login にリダイレクトされる', () => {
      const req = makeRequest('/todos', false);
      middleware(req);
      expect(mockRedirectFn).toHaveBeenCalledWith('/login');
    });

    it('保護されたページ (/calendar) にアクセスすると /login にリダイレクトされる', () => {
      const req = makeRequest('/calendar', false);
      middleware(req);
      expect(mockRedirectFn).toHaveBeenCalledWith('/login');
    });

    it('/login ページへのアクセスはリダイレクトされない（通過する）', () => {
      const req = makeRequest('/login', false);
      middleware(req);
      expect(mockRedirectFn).not.toHaveBeenCalled();
      expect(mockNextFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('認証済みユーザー (cookie あり)', () => {
    it('保護されたページ (/dashboard) に正常にアクセスできる', () => {
      const req = makeRequest('/dashboard', true);
      middleware(req);
      expect(mockRedirectFn).not.toHaveBeenCalled();
      expect(mockNextFn).toHaveBeenCalledTimes(1);
    });

    it('保護されたページ (/todos) に正常にアクセスできる', () => {
      const req = makeRequest('/todos', true);
      middleware(req);
      expect(mockRedirectFn).not.toHaveBeenCalled();
      expect(mockNextFn).toHaveBeenCalledTimes(1);
    });

    it('/login ページにアクセスすると /dashboard にリダイレクトされる', () => {
      const req = makeRequest('/login', true);
      middleware(req);
      expect(mockRedirectFn).toHaveBeenCalledWith('/dashboard');
      expect(mockNextFn).not.toHaveBeenCalled();
    });
  });

  describe('レスポンス型の確認', () => {
    it('未認証で保護ページへのアクセスは redirect レスポンスを返す', () => {
      const req = makeRequest('/dashboard', false);
      const res = middleware(req) as unknown as { type: string; destination: string };
      expect(res.type).toBe('redirect');
      expect(res.destination).toBe('/login');
    });

    it('認証済みで通常ページへのアクセスは next レスポンスを返す', () => {
      const req = makeRequest('/dashboard', true);
      const res = middleware(req) as { type: string };
      expect(res.type).toBe('next');
    });

    it('認証済みで /login へのアクセスは /dashboard への redirect を返す', () => {
      const req = makeRequest('/login', true);
      const res = middleware(req) as unknown as { type: string; destination: string };
      expect(res.type).toBe('redirect');
      expect(res.destination).toBe('/dashboard');
    });
  });
});
