import { PrismaClient } from '@prisma/client';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 接続できなかった（＝クエリ未実行）系の一時エラーか。書き込みでも安全に再試行できるものだけ。 */
function isConnectError(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  if (code === 'P1001' || code === 'P1002') return true; // 到達不可 / タイムアウト(接続)
  const msg = e instanceof Error ? e.message : String(e);
  return /Can't reach database server|Server has closed the connection|ECONNREFUSED|ETIMEDOUT/i.test(msg);
}

function makeClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  }).$extends({
    query: {
      // 全モデル・全操作を、DB接続の一時エラー時だけ数回リトライ（瞬断を吸収）
      async $allOperations({ args, query }) {
        const delays = [300, 800, 1600];
        for (let i = 0; ; i++) {
          try {
            return await query(args);
          } catch (e) {
            if (i >= delays.length || !isConnectError(e)) throw e;
            await sleep(delays[i]);
          }
        }
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof makeClient> };

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
