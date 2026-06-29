import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMember, canCreate } from '@/lib/approval';

function getUsername(req: NextRequest): string | null {
  return req.headers.get('x-wp-user');
}

export async function GET(req: NextRequest) {
  if (!getUsername(req)) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  try {
    const policies = await prisma.policy.findMany({ orderBy: { sortOrder: 'asc' } });
    const ids = policies.map((p) => p.id);
    const rows = ids.length
      ? await prisma.approval.findMany({ where: { entityType: 'policy', entityId: { in: ids } }, select: { entityId: true, approver: true, action: true, createdAt: true } })
      : [];
    const byId = new Map<string, { approver: string; createdAt: string }[]>();
    const delById = new Map<string, { approver: string; createdAt: string }[]>();
    for (const a of rows) {
      const map = a.action === 'delete' ? delById : byId;
      const arr = map.get(a.entityId) ?? [];
      arr.push({ approver: a.approver, createdAt: a.createdAt.toISOString() });
      map.set(a.entityId, arr);
    }
    return NextResponse.json(policies.map((p) => ({ ...p, approvals: byId.get(p.id) ?? [], deleteApprovals: delById.get(p.id) ?? [] })));
  } catch {
    return NextResponse.json([]);
  }
}

// 方針の登録は取締役のみ。承認は取締役2名（/api/approvals）。
export async function POST(req: NextRequest) {
  const member = await getMember(getUsername(req));
  if (!member) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  if (!canCreate(member, 'policy')) return NextResponse.json({ error: '方針の登録は取締役のみ可能です' }, { status: 403 });
  const { name, description, sortOrder } = await req.json();
  if (!name) return NextResponse.json({ error: '名称は必須です' }, { status: 400 });
  const policy = await prisma.policy.create({
    data: { name, description: description ?? null, sortOrder: sortOrder ?? 0, status: 'pending', createdBy: member.username },
  });
  return NextResponse.json(policy, { status: 201 });
}
