import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchDirectory } from '@/lib/directory';

function getUsername(req: NextRequest): string | null {
  return req.cookies.get('workportal_auth')?.value ?? null;
}

// 監査ログ一覧（承認・削除承認・削除）。実行者名を解決して返す。
export async function GET(req: NextRequest) {
  if (!getUsername(req)) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  try {
    const [logs, dir] = await Promise.all([
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
      fetchDirectory().catch(() => ({ members: [] as Array<{ username: string; name: string; departmentId: string | null }>, departments: [] as Array<{ id: string; name: string }> })),
    ]);
    const memberOf = (u: string) => dir.members.find((m) => m.username === u);
    const deptName = (id: string | null | undefined) => (id ? (dir.departments.find((d) => d.id === id)?.name ?? id) : '');
    const nameOf = (u: string) => memberOf(u)?.name ?? u;
    return NextResponse.json(
      logs.map((l) => ({
        id: l.id,
        entityType: l.entityType,
        entityId: l.entityId,
        title: l.title,
        action: l.action,
        actor: l.actor,
        actorName: nameOf(l.actor),
        actorDept: deptName(memberOf(l.actor)?.departmentId),
        asDirector: l.asDirector,
        asManager: l.asManager,
        detail: l.detail,
        createdAt: l.createdAt,
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}
